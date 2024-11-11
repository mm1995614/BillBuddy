from django.contrib.auth.decorators import login_required
from .models import Bill, Expense, Friend, UserProfile, ParticipantAmount, Note, Comment, FriendRequest
from django.contrib.auth.models import User
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from .forms import BasicUserCreationForm, ProfileCompletionForm, NoteForm, CommentForm
from .forms import CustomUserChangeForm
import os
from django.conf import settings
from django import forms
from django.contrib.auth.views import LoginView
from .forms import EmailAuthenticationForm
from .forms import UserProfileForm
from django.contrib import messages
from django.http import JsonResponse
from core.models import CustomUser
from .forms import ExpenseForm, UserForm
import json
import logging
from django.http import JsonResponse
from django.core.exceptions import ObjectDoesNotExist
import requests
import csv
from io import StringIO
from django.core.cache import cache
from datetime import time, datetime, timedelta
import pytz
from django.utils import timezone
import base64
import uuid
from django.core.files.base import ContentFile
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordChangeForm
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from google.cloud import storage
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from django.core.files.storage import default_storage
from django.http import HttpResponseForbidden
from .utils import delete_file_from_gcs
from django.db.models import Q, F
from django.db.models.functions import TruncDate
from django.core.paginator import Paginator


def user_login(request):
    if request.method == 'POST':
        form = EmailAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            email = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=email, password=password)
            if user is not None:
                login(request, user)
                if not user.registration_complete:
                    messages.info(request, "Please complete your profile to continue.")
                    return redirect('register_step2')
                return redirect('dashboard')
            else:
                form.add_error(None, "Invalid email or password")
    else:
        form = EmailAuthenticationForm()

    return render(request, 'core/login.html', {'form': form})

def register_step1(request):
    if request.method == 'POST':
        form = BasicUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            user = authenticate(request, username=user.username, password=form.cleaned_data['password1'], backend='core.backends.EmailBackend')
            if user is not None:
                login(request, user, backend='core.backends.EmailBackend')
                return redirect('register_step2')
        else:
            print(form.errors)
    else:
        form = BasicUserCreationForm()
    return render(request, 'core/register_step1.html', {'form': form})

def register_step2(request):
    user = request.user
    if user.registration_complete:
        return redirect('dashboard')

    if request.method == 'POST':
        form = ProfileCompletionForm(request.POST, request.FILES)
        if form.is_valid():
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            profile_picture_data = form.cleaned_data.get('profile_picture_data')
            if profile_picture_data:
                format, imgstr = profile_picture_data.split(';base64,')
                ext = format.split('/')[-1]
                profile_picture = ContentFile(base64.b64decode(imgstr), name=f'{uuid.uuid4()}.{ext}')
                profile.profile_picture = profile_picture
            else:
                profile.profile_picture = form.cleaned_data['profile_picture']
                
            profile.bank_account = form.cleaned_data['bank_account']
            profile.bank_qr_code = form.cleaned_data['bank_qr_code']
            profile.save()
            
            user.registration_complete = True
            user.save()
            return redirect('dashboard')
    else:
        form = ProfileCompletionForm()
    return render(request, 'core/register_step2.html', {'form': form})

@login_required
def dashboard(request):
    User = get_user_model()
    user = User.objects.get(pk=request.user.pk)
    
    if not user.registration_complete:
        return redirect('register_step2')

    recent_bills = user.bills.all().order_by('-created_at')[:2]
    total_groups = user.bills.count()
    friends = Friend.objects.filter(user=user).select_related('friend')
    user_profile = UserProfile.objects.get(user=user)
    
    context = {
        'recent_bills': recent_bills,
        'total_groups': total_groups,
        'friends': friends,
        'username': user.username,
        'profile_picture_url': user_profile.profile_picture.url if user_profile.profile_picture else None
    }
    return render(request, 'core/dashboard.html', context)

@login_required
def group_list(request):
    User = get_user_model()
    user = User.objects.get(pk=request.user.pk)

    bills = user.bills.all().order_by('-created_at')

    search_query = request.GET.get('search', '')
    if search_query:
        bills = bills.filter(
            Q(name__icontains=search_query) |
            Q(members__username__icontains=search_query)
        ).distinct()
    
    context = {
        'bills': bills,
        'username': user.username,
        'search_query': search_query
    }
    return render(request, 'core/group_list.html', context)

@login_required
def create_bill(request):
    if request.method == 'POST':
        name = request.POST['bill-name']
        currency = request.POST['bill-currency']
        members = request.POST.getlist('bill-members')
        bill = Bill.objects.create(name=name, currency=currency)
        bill.members.add(request.user)
        for member in members:
            user = CustomUser.objects.get(username=member)
            bill.members.add(user)
        bill.save()
        return redirect('bill_detail', bill_id=bill.id)
    
    current_user = request.user
    friends = Friend.objects.filter(user=current_user).select_related('friend__userprofile')
    friends_list = [{'username': friend.friend.username, 'profile_picture_url': friend.friend.userprofile.profile_picture.url} for friend in friends]

    return render(request, 'core/create_bill.html', {'friends': friends_list})

@login_required
def bill_detail(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    
    if request.user not in bill.members.all():
        return render(request, 'core/bill_detail.html', {'bill': bill, 'current_user': request.user})
    
    members = bill.members.all()
    expenses = Expense.objects.filter(bill=bill).order_by(F('date').desc(), '-created_at')
    
    search_query = request.GET.get('search', '')
    if search_query:
        date_query = Q(description__icontains=search_query)
        try:
            search_date = datetime.strptime(search_query, "%m/%d").date()
            date_query |= Q(date__month=search_date.month, date__day=search_date.day)
        except ValueError:
            pass
        
        expenses = expenses.filter(date_query)
    
    context = {
        'bill': bill,
        'current_user': request.user,
        'members': members,
        'expenses': expenses,
        'search_query': search_query,
    }
    return render(request, 'core/bill_detail.html', context)

@login_required
def add_expense(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    members = bill.members.all()

    if request.method == 'POST':
        try:
            amount = Decimal(request.POST.get('amount')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            description = request.POST.get('description')
            paid_by = CustomUser.objects.get(username=request.POST.get('paid_by'))
            split_type = request.POST.get('split_type')
            expense_photo = request.FILES.get('expense_photo')

            if split_type == 'equal':
                participants = [member.id for member in members]
            else:
                participants = request.POST.getlist('participants')
            
            if not participants:
                messages.error(request, "You must select at least one participant.")
                return redirect('bill_detail', bill_id=bill_id)
            
            if split_type == 'custom':
                participants_data = {}
                total_amount = Decimal('0.00')
                for member_id in participants:
                    participant_amount = Decimal(request.POST.get(f'participant_amount_{member_id}', '0')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    participants_data[member_id] = participant_amount
                    total_amount += participant_amount
                
                if total_amount != amount:
                    messages.error(request, "Total participants amount must equal the expense amount.")
                    return redirect('bill_detail', bill_id=bill_id)

            date = request.POST.get('date')
            if not date:
                date = timezone.now().date()
            else:
                date = timezone.datetime.strptime(date, '%Y-%m-%d').date()

            expense = Expense(
                bill=bill,
                date=date,
                description=description,
                amount=amount,
                paid_by=paid_by,
                split_type=split_type,
            )
            
            if expense_photo:
                expense.photo = expense_photo
            
            expense.save()

            if split_type == 'equal':
                amount_per_participant = (amount / Decimal(len(participants))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                for participant_id in participants:
                    user = CustomUser.objects.get(id=participant_id)
                    expense.participants.add(user)
                    ParticipantAmount.objects.create(expense=expense, user=user, amount=amount_per_participant)
            else:
                for participant_id, participant_amount in participants_data.items():
                    user = CustomUser.objects.get(id=participant_id)
                    expense.participants.add(user)
                    ParticipantAmount.objects.create(expense=expense, user=user, amount=participant_amount)
            
            messages.success(request, "Expense added successfully.")
            return redirect('bill_detail', bill_id=bill_id)

        except InvalidOperation:
            messages.error(request, "Invalid amount format. Please enter a valid number.")
            return redirect('bill_detail', bill_id=bill_id)
        except Exception as e:
            messages.error(request, f"An error occurred: {str(e)}")
            return redirect('bill_detail', bill_id=bill_id)

    context = {
        'bill': bill,
        'members': members,
        'current_user': request.user,
    }
    return render(request, 'core/add_expense.html', context)

def get_expense_data(request, expense_id):
    expense = get_object_or_404(Expense, id=expense_id)
    participants = expense.participantamount_set.values('user_id', 'amount')
    data = {
        'date': expense.date.strftime('%Y-%m-%d'),
        'description': expense.description,
        'amount': expense.amount,
        'paid_by': expense.paid_by.id,
        'split_type': expense.split_type,
        'participants': list(participants),
        'photo_url': expense.photo.url if expense.photo else None,
    }
    return JsonResponse(data)

def edit_expense(request, expense_id):
    expense = get_object_or_404(Expense, id=expense_id)
    if request.method == "POST":
        form = ExpenseForm(request.POST, request.FILES, instance=expense)
        if form.is_valid():
            expense = form.save(commit=False)
            expense.participantamount_set.all().delete()

            new_photo = request.FILES.get('expense_photo')
            if new_photo:
                expense.photo = new_photo
            elif 'expense_photo-clear' in request.POST:
                if expense.photo:
                    default_storage.delete(expense.photo.name)
                expense.photo = None

            if form.cleaned_data['split_type'] == 'custom':
                participant_amounts = request.POST.get('participant_amounts')
                if participant_amounts:
                    try:
                        participants_data = json.loads(participant_amounts)
                        total_amount = sum(Decimal(amount) for amount in participants_data.values())
                        
                        if abs(total_amount - expense.amount) > Decimal('0.005'):
                            return JsonResponse({'success': False, 'message': 'Total participants amount must equal the expense amount.'})
                        
                        for participant_id, amount in participants_data.items():
                            user = CustomUser.objects.get(id=participant_id)
                            ParticipantAmount.objects.create(
                                expense=expense,
                                user=user,
                                amount=Decimal(amount)
                            )
                    except json.JSONDecodeError:
                        return JsonResponse({'success': False, 'message': 'Invalid participant amounts data.'})
            else:
                participants = expense.bill.members.all()
                participant_count = participants.count()
                equal_amount = expense.amount / participant_count
                for participant in participants:
                    ParticipantAmount.objects.create(expense=expense, user=participant, amount=equal_amount)

            expense.save()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'message': form.errors})
    else:
        participant_data = {pa.user.id: str(pa.amount) for pa in expense.participantamount_set.all()}
        initial_data = {
            'date': expense.date,
            'split_type': 'custom' if expense.participantamount_set.exists() else 'equal',
            'participant_amounts': json.dumps(participant_data),
            'participants': expense.participantamount_set.values_list('user', flat=True),
        }
        form = ExpenseForm(instance=expense, initial=initial_data)

    context = {
        'form': form,
        'expense': expense,
        'bill': expense.bill,
        'members': expense.bill.members.all(),
    }
    if request.is_ajax():
        data = {
            'description': expense.description,
            'amount': expense.amount,
            'paid_by': expense.paid_by.id,
            'split_type': expense.split_type,
            'participants': list(expense.participantamount_set.values('user_id', 'amount')),
            'photo_url': expense.photo.url if expense.photo else None,
        }
        return JsonResponse(data)

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@login_required
@require_POST
def delete_expense(request, expense_id):
    try:
        expense = get_object_or_404(Expense, id=expense_id)
        bill_id = expense.bill.id

        data = json.loads(request.body)
        delete_photo = data.get('delete_photo', False)

        if delete_photo and expense.photo:
            expense.photo.delete()

        expense.delete()
        return JsonResponse({'success': True, 'message': 'Expense deleted successfully', 'bill_id': bill_id})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    
    
@login_required
def calculate_debts(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    total_paid = {}
    total_owed = {}
    personal_expenses = {}

    for member in bill.members.all():
        total_paid[member.username] = 0
        total_owed[member.username] = 0
        personal_expenses[member.username] = 0

    for expense in bill.expenses.all():
        total_paid[expense.paid_by.username] += expense.amount

        total_spent = sum(participant_amount.amount for participant_amount in expense.participantamount_set.all())

        for participant_amount in expense.participantamount_set.all():
            participant_share = (participant_amount.amount / total_spent) * expense.amount
            total_owed[participant_amount.user.username] += participant_share
            personal_expenses[participant_amount.user.username] += participant_share

    current_user_expense = personal_expenses.get(request.user.username, 0)

    net_debts = {}
    for user in total_paid:
        net_debts[user] = total_paid[user] - total_owed[user]

    final_debts = {}
    for user, net in net_debts.items():
        if net > 0:
            for debtor, debt in net_debts.items():
                if debt < 0:
                    if user not in final_debts:
                        final_debts[user] = {}
                    if debtor not in final_debts:
                        final_debts[debtor] = {}
                    
                    payment = min(net, -debt)
                    net_debts[user] -= payment
                    net_debts[debtor] += payment

                    if debtor in final_debts[user]:
                        final_debts[user][debtor] += payment
                    else:
                        final_debts[user][debtor] = payment

                    if user in final_debts[debtor]:
                        final_debts[debtor][user] -= payment
                    else:
                        final_debts[debtor][user] = -payment

                    if net_debts[user] == 0:
                        break

    has_debts = False
    for creditor, debtors in final_debts.items():
        for debtor, amount in debtors.items():
            if amount > 0:
                has_debts = True
                message = f"{debtor} owes {creditor} {amount:.2f} {bill.currency}"
                messages.info(request, message, extra_tags='debt')

    if not has_debts:
        messages.info(request, "No one owes money", extra_tags='debt')

    debt_messages = []
    storage = messages.get_messages(request)
    for message in storage:
        if 'debt' in message.tags:
            debt_messages.append({
                'message': message.message,
                'tags': message.tags
            })

    storage.used = True

    return JsonResponse({
        'messages': debt_messages,
        'personal_expense': {
            'username': request.user.username,
            'amount': f"{current_user_expense:.2f}",
            'currency': bill.currency
        }
    })

EXCHANGE_RATES_CACHE_KEY = 'exchange_rates'
LAST_UPDATE_DATE_KEY = 'last_exchange_rates_update_date'

taipei_tz = pytz.timezone('Asia/Taipei')

def should_update_rates():
    now = timezone.localtime()
    current_time = now.time()
    current_date = now.date()
    last_update_date = cache.get(LAST_UPDATE_DATE_KEY)

    if current_time >= time(9, 5) and current_date != last_update_date:
        return True
    return False

def fetch_and_cache_rates():
    url = 'https://rate.bot.com.tw/xrt/flcsv/0/day'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        response.encoding = 'utf-8'
        
        csv_content = response.text
        csv_file = StringIO(csv_content)
        csv_reader = csv.reader(csv_file)
        next(csv_reader)

        exchange_rates = {}
        for row in csv_reader:
            if len(row) >= 13:
                currency = row[0]
                buy_rate = float(row[3]) if row[3] else None 
                sell_rate = float(row[13]) if row[13] else None
                if buy_rate and sell_rate:
                    exchange_rates[currency] = {
                        'buy': buy_rate,
                        'sell': sell_rate
                    }

        exchange_rates['TWD'] = {'buy': 1, 'sell': 1}

        if exchange_rates:
            cache.set(EXCHANGE_RATES_CACHE_KEY, exchange_rates, None)
            cache.set(LAST_UPDATE_DATE_KEY, timezone.now().astimezone(taipei_tz).date(), None)
        return exchange_rates
    except Exception as e:
        print(f"Error fetching exchange rates: {e}")
        return None

def get_exchange_rates(request):
    if should_update_rates():
        exchange_rates = fetch_and_cache_rates()
    else:
        exchange_rates = cache.get(EXCHANGE_RATES_CACHE_KEY)

    if not exchange_rates:
        exchange_rates = fetch_and_cache_rates()

    return JsonResponse({'success': True, 'rates': exchange_rates})

def convert_currency(amount, from_currency, to_currency, rates):
    if from_currency == to_currency:
        return amount
    
    if from_currency == 'TWD':
        return amount / rates[to_currency]['sell']
    elif to_currency == 'TWD':
        return amount * rates[from_currency]['buy']
    else:
        twd_amount = amount * rates[from_currency]['buy']
        return twd_amount / rates[to_currency]['sell']
    
def currency_conversion(request):
    amount = float(request.GET.get('amount', 0))
    from_currency = request.GET.get('from')
    to_currency = request.GET.get('to')

    exchange_rates = cache.get(EXCHANGE_RATES_CACHE_KEY)
    if not exchange_rates:
        exchange_rates = fetch_and_cache_rates()

    if not exchange_rates:
        return JsonResponse({'success': False, 'error': 'Unable to fetch exchange rates'}, status=500)

    try:
        result = convert_currency(amount, from_currency, to_currency, exchange_rates)
        return JsonResponse({'success': True, 'result': round(result, 2)})
    except KeyError:
        return JsonResponse({'success': False, 'error': 'Invalid currency selection'}, status=400)

@login_required
def delete_bill(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    
    if request.method == 'POST':
        for expense in bill.expenses.all():
            if expense.photo:
                delete_file_from_gcs(expense.photo.name)
        
        for note in bill.notes.all():
            if note.image:
                delete_file_from_gcs(note.image.name)
            for comment in note.comments.all():
                if comment.image:
                    delete_file_from_gcs(comment.image.name)
        
        bill.delete()
        return redirect('dashboard')
    
    return render(request, 'core/bill_details.html', {'bill': bill})

@login_required
def notebook(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    notes = Note.objects.filter(bill=bill).order_by('-created_at')
    comment_form = CommentForm()

    search_query = request.GET.get('search', '')
    if search_query:
        notes = notes.filter(
            Q(author__username__icontains=search_query) |
            Q(content__icontains=search_query)  
        )

    context = {
        'bill': bill,
        'notes': notes,
        'comment_form': comment_form,
        'search_query': search_query, 
    }
    return render(request, 'core/notebook.html', context)

@login_required
def add_note(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    if request.method == 'POST':
        form = NoteForm(request.POST, request.FILES)
        if form.is_valid():
            content = form.cleaned_data.get('content')
            image = form.cleaned_data.get('image')
            if not content and not image:
                form.add_error(None, 'Please provide either content or an image.')
            else:
                note = form.save(commit=False)
                note.bill = bill
                note.author = request.user
                note.formatted_created_at = timezone.localtime(timezone.now()).strftime("%Y/%m/%d %H:%M")
                note.save()
                return redirect('notebook', bill_id=bill.id)
    else:
        form = NoteForm()
    context = {
        'bill': bill,
        'form': form,
        'formatted_current_time': timezone.localtime(timezone.now()).strftime("%Y/%m/%d %H:%M")
    }
    return render(request, 'core/add_note.html', context)

@login_required
@require_POST
def add_comment(request, note_id):
    note = get_object_or_404(Note, id=note_id)
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        form = CommentForm(request.POST, request.FILES)
        if form.is_valid():
            content = form.cleaned_data.get('content')
            image = form.cleaned_data.get('image')
            if not content and not image:
                return JsonResponse({
                    'success': False,
                    'errors': {'__all__': ['Please provide either content or an image.']}
                }, status=400)
            comment = form.save(commit=False)
            comment.note = note
            comment.author = request.user
            comment.formatted_created_at = timezone.localtime(timezone.now()).strftime("%Y/%m/%d %H:%M")
            comment.save()
            return JsonResponse({
                'success': True,
                'message': 'Your comment has been added successfully.',
                'comment': {
                    'author': {
                        'username': comment.author.username,
                        'profile_picture': comment.author.userprofile.profile_picture.url if comment.author.userprofile.profile_picture else None,
                    },
                    'content': comment.content,
                    'created_at': comment.formatted_created_at,
                    'image': comment.image.url if comment.image else None,
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'errors': form.errors
            }, status=400)
    else:
        form = CommentForm(request.POST, request.FILES)
        if form.is_valid():
            content = form.cleaned_data.get('content')
            image = form.cleaned_data.get('image')
            if not content and not image:
                messages.error(request, 'Please provide either content or an image.')
            else:
                comment = form.save(commit=False)
                comment.note = note
                comment.author = request.user
                comment.formatted_created_at = timezone.localtime(timezone.now()).strftime("%Y/%m/%d %H:%M")
                comment.save()
                messages.success(request, 'Your comment has been added successfully.')
        else:
            messages.error(request, 'There was an error adding your comment.')
    return redirect('notebook', bill_id=note.bill.id)


@login_required
def delete_note(request, note_id):
    note = get_object_or_404(Note, id=note_id)
    if request.user == note.author:
        bill_id = note.bill.id

        delete_file_from_gcs(note.image.name if note.image else None)

        comments = Comment.objects.filter(note=note)
        for comment in comments:
            delete_file_from_gcs(comment.image.name if comment.image else None)

        note.delete()

        messages.success(request, 'Your note and all associated content have been deleted successfully.')
    else:
        messages.error(request, 'You are not authorized to delete this note.')
    
    return redirect('notebook', bill_id=bill_id)

@login_required
def friend_list(request):
    friends = Friend.objects.filter(user=request.user).order_by('-created')
    received_requests = FriendRequest.objects.filter(to_user=request.user)
    
    search_query = request.GET.get('search', '')
    if search_query:
        friends = friends.filter(friend__username__icontains=search_query)
    
    context = {
        'friends': friends,
        'received_requests': received_requests,
        'username': request.user.username,
        'profile_picture_url': request.user.profile_picture.url if request.user.profile_picture else None,
        'search_query': search_query 
    }
    return render(request, 'core/friend_list.html', context)

@login_required
def add_friend(request):
    if request.method == "POST":
        email = request.POST['email']
        
        try:
            user = CustomUser.objects.get(email=email)
            if user == request.user:
                messages.error(request, "You cannot send a friend request to yourself.", extra_tags='friend')
            else:
                if Friend.objects.filter(user=request.user, friend=user).exists():
                    messages.info(request, f"You are already friends with {user.username}.", extra_tags='friend')
                else:
                    friend_request, created = FriendRequest.objects.get_or_create(
                        from_user=request.user,
                        to_user=user
                    )
                    if created:
                        messages.success(request, f"Friend request sent to {user.username}!", extra_tags='friend')
                    else:
                        messages.info(request, f"A friend request to {user.username} already exists.", extra_tags='friend')
        except CustomUser.DoesNotExist:
            messages.error(request, "User not found. Please check the email and try again.", extra_tags='friend')
        return redirect('add_friend')

    return render(request, 'core/add_friends.html')

@login_required
def friend_requests(request):
    received_requests = FriendRequest.objects.filter(to_user=request.user)
    return render(request, 'core/friend_list.html', {'received_requests': received_requests})

@login_required
def accept_friend_request(request, request_id):
    friend_request = get_object_or_404(FriendRequest, id=request_id, to_user=request.user)
    Friend.objects.create(user=friend_request.from_user, friend=friend_request.to_user)
    Friend.objects.create(user=friend_request.to_user, friend=friend_request.from_user)
    friend_request.delete()
    return redirect('friend_list')

@login_required
def reject_friend_request(request, request_id):
    friend_request = get_object_or_404(FriendRequest, id=request_id, to_user=request.user)
    friend_request.delete()
    return redirect('friend_list')

@login_required
def get_friend_profile(request, friend_id):
    try:
        friendship = Friend.objects.get(user=request.user, friend_id=friend_id)
        friend = friendship.friend
        profile = getattr(friend, 'userprofile', None)

        data = {
            'username': friend.username,
            'email': friend.email,
            'profile_photo': profile.profile_picture.url if profile and profile.profile_picture else '',
            'bank_account_number': profile.bank_account if profile else '',
            'bank_qr_code': profile.bank_qr_code.url if profile and profile.bank_qr_code else '',
        }
        return JsonResponse(data)
    except Friend.DoesNotExist:
        return JsonResponse({'error': 'Friend not found'}, status=404)
    except Exception:
        return JsonResponse({'error': 'An unexpected error occurred'}, status=500)


@login_required
def remove_friend(request, friend_id):
    if request.method == 'DELETE':
        Friend.objects.filter(
            (Q(user=request.user, friend_id=friend_id) | 
             Q(user_id=friend_id, friend=request.user))
        ).delete()
        return JsonResponse({'message': 'Friend removed successfully'})
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def account_settings(request):
    user = request.user
    user_profile, _ = UserProfile.objects.get_or_create(user=user)
    
    if request.method == 'POST':
        user_form = UserForm(request.POST, instance=user)
        profile_form = UserProfileForm(request.POST, request.FILES, instance=user_profile)
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Your account settings have been updated successfully.')
            return redirect('account_settings')
        else:
            messages.error(request, 'There was an error updating your account settings.')
    else:
        user_form = UserForm(instance=user)
        profile_form = UserProfileForm(instance=user_profile)
    
    context = {
        'user_form': user_form,
        'profile_form': profile_form,
        'user': user,
        'profile_picture_url': user_profile.profile_picture.url if user_profile.profile_picture else None,
        'bank_account': user_profile.bank_account,
        'bank_qr_code_url': user_profile.bank_qr_code.url if user_profile.bank_qr_code else None
    }
    return render(request, 'core/account_settings.html', context)

@require_POST
def change_password_ajax(request):
    form = PasswordChangeForm(request.user, request.POST)
    if form.is_valid():
        user = form.save()
        update_session_auth_hash(request, user)
        return JsonResponse({'status': 'success', 'message': 'Your password was successfully updated!'})
    else:
        errors = dict(form.errors.items())
        return JsonResponse({'status': 'error', 'errors': errors})

def user_logout(request):
    logout(request)
    return redirect('login')


### API ###
from rest_framework import viewsets
from .models import Bill  
from .serializers import BillSerializer  

class BillViewSet(viewsets.ModelViewSet):
    queryset = Bill.objects.all()
    serializer_class = BillSerializer

# Login & Register
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.core.files.base import ContentFile
import base64
import uuid
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm

@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    form = EmailAuthenticationForm(request, data=request.data)
    if form.is_valid():
        email = form.cleaned_data.get('username')
        password = form.cleaned_data.get('password')
        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            return Response({
                'success': True,
                'registration_complete': user.registration_complete,
                'redirect': 'register_step2' if not user.registration_complete else 'dashboard'
            })
        else:
            return Response({
                'success': False,
                'error': "Invalid email or password"
            }, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'success': False,
        'errors': form.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_step1_api(request):
    form = BasicUserCreationForm(request.data)
    if form.is_valid():
        user = form.save()
        user = authenticate(
            request, 
            username=user.username, 
            password=form.cleaned_data['password1'],
            backend='core.backends.EmailBackend'
        )
        if user is not None:
            login(request, user, backend='core.backends.EmailBackend')
            return Response({
                'success': True,
                'redirect': 'register_step2'
            })
    return Response({
        'success': False,
        'errors': form.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_step2_api(request):
    user = request.user
    if user.registration_complete:
        return Response({
            'success': False,
            'error': 'Registration already completed',
            'redirect': 'dashboard'
        }, status=status.HTTP_400_BAD_REQUEST)

    form = ProfileCompletionForm(request.POST, request.FILES)
    if form.is_valid():
        try:
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            # 處理個人資料圖片
            profile_picture_data = request.data.get('profile_picture_data')
            if profile_picture_data:
                format, imgstr = profile_picture_data.split(';base64,')
                ext = format.split('/')[-1]
                profile_picture = ContentFile(
                    base64.b64decode(imgstr), 
                    name=f'{uuid.uuid4()}.{ext}'
                )
                profile.profile_picture = profile_picture
            elif 'profile_picture' in request.FILES:
                profile.profile_picture = request.FILES['profile_picture']

            # 處理其他欄位
            profile.bank_account = form.cleaned_data['bank_account']
            if 'bank_qr_code' in request.FILES:
                profile.bank_qr_code = request.FILES['bank_qr_code']
            
            profile.save()
            
            user.registration_complete = True
            user.save()

            return Response({
                'success': True,
                'redirect': 'dashboard'
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'success': False,
        'errors': form.errors
    }, status=status.HTTP_400_BAD_REQUEST)

# Dashboard
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_api(request):
    User = get_user_model()
    user = User.objects.get(pk=request.user.pk)
    user_profile = UserProfile.objects.get(user=user)
    
    return Response({
        'username': user.username,
        'profilePicture': user_profile.profile_picture.url if user_profile.profile_picture else None,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_bills_api(request):
    user = request.user
    if not user.registration_complete:
        return Response({'error': 'Registration not complete'}, status=400)
    
    recent_bills = user.bills.all().order_by('-created_at')[:2]
    
    bills_data = [{
        'id': bill.id,
        'name': bill.name,
        'members': [{
            'id': member.id,
            'username': member.username
        } for member in bill.members.all()]
    } for bill in recent_bills]
    
    return Response(bills_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats_api(request):
    user = request.user
    total_groups = user.bills.count()
    friends = Friend.objects.filter(user=user).select_related('friend')
    
    return Response({
        'totalGroups': total_groups,
        'friends': [{
            'id': friend.friend.id,
            'username': friend.friend.username
        } for friend in friends]
    })

# Account Setting


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_api(request):
    user = request.user
    user_profile = UserProfile.objects.get_or_create(user=user)[0]

    if request.method == 'GET':
        return Response({
            'username': user.username,
            'email': user.email,
            'bank_account': user_profile.bank_account,
            'profile_picture': user_profile.profile_picture.url if user_profile.profile_picture else None,
            'bank_qr_code': user_profile.bank_qr_code.url if user_profile.bank_qr_code else None
        })

    elif request.method == 'PUT':
        try:
            # 更新用戶名
            if 'username' in request.data:
                user.username = request.data['username']
                user.save()

            # 更新個人資料
            if 'bank_account' in request.data:
                user_profile.bank_account = request.data['bank_account']
            
            if 'profile_picture' in request.FILES:
                user_profile.profile_picture = request.FILES['profile_picture']
            
            if 'bank_qr_code' in request.FILES:
                user_profile.bank_qr_code = request.FILES['bank_qr_code']
            
            user_profile.save()

            return Response({'message': 'Profile updated successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_api(request):
    form = PasswordChangeForm(request.user, request.data)
    if form.is_valid():
        user = form.save()
        update_session_auth_hash(request, user)
        return Response({'message': 'Password updated successfully'})
    return Response({'errors': form.errors}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_api(request):
    logout(request)
    return Response({'message': 'Successfully logged out'})