from django.contrib.auth.decorators import login_required
from .models import Bill, Expense, Friend, UserProfile, ParticipantAmount
from django.contrib.auth.models import User
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from .forms import CustomUserCreationForm
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
from .forms import ExpenseForm
import json
import logging
from django.http import JsonResponse
from django.core.exceptions import ObjectDoesNotExist
import requests


def user_login(request):
    if request.method == 'POST':
        form = EmailAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            email = form.cleaned_data.get('username')  # 获取输入的电子邮件地址
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=email, password=password)  # 使用电子邮件进行身份验证
            if user is not None:
                login(request, user)
                return redirect('dashboard')
            else:
                # 如果身份验证失败，添加错误信息
                form.add_error(None, "Invalid email or password")
    else:
        form = EmailAuthenticationForm()
    return render(request, 'core/login.html', {'form': form})

def register(request):    
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            backend = 'django.contrib.auth.backends.ModelBackend'
            user.backend = backend
            login(request, user, backend=backend)
            return redirect('dashboard')
    else:
        form = CustomUserCreationForm()
    return render(request, 'core/register.html', {'form': form})


@login_required
def dashboard(request):
    user = request.user
    bills = user.bills.all()
    friends = Friend.objects.filter(user=user)
    user_profile = UserProfile.objects.get(user=user)
    context = {
        'bills': bills,
        'friends': friends,
        'username': request.user.username,
        'profile_picture_url': user_profile.profile_picture.url if user_profile.profile_picture else None
    }
    return render(request, 'core/dashboard.html', context)

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
        return redirect('dashboard')
    
    current_user = request.user
    friends = Friend.objects.filter(user=current_user).select_related('friend')
    friends_list = [friend.friend for friend in friends]

    return render(request, 'core/create_bill.html', {'friends': friends_list})

@login_required
def bill_detail(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    members = bill.members.all()
    expenses = Expense.objects.filter(bill=bill)

    if request.method == 'POST':
        description = request.POST.get('description')
        amount = request.POST.get('amount')
        paid_by = CustomUser.objects.get(username=request.POST.get('paid_by'))
        split_type = request.POST.get('split_type')

        # 如果有貨幣轉換需求，請在此處添加邏輯
        input_currency = request.POST.get('currency')
        bill_currency = bill.currency

        # 使用 Fixer.io API 進行匯率轉換
        if input_currency != bill_currency:
            fixer_api_key = 'ea18a090880dcf460c4313dbdaf9e848'
            url = f"http://data.fixer.io/api/latest?access_key={fixer_api_key}&base={input_currency}&symbols={bill_currency}"
            response = requests.get(url)
            data = response.json()
            if data['success']:
                rate = data['rates'][bill_currency]
                amount = float(amount) * rate
            else:
                messages.error(request, "Error fetching exchange rate.")
                return redirect('bill_detail', bill_id=bill_id)

        if split_type == 'equal':
            participants = [member.id for member in members]
        else:
            participants = request.POST.getlist('participants')
        
        if not participants:
            messages.error(request, "You must select at least one participant.")
            return redirect('bill_detail', bill_id=bill_id)
        
        total_amount = 0
        if split_type == 'custom':
            try:
                participants_data = {member_id: request.POST.get(f'participant_amount_{member_id}') for member_id in participants}
                total_amount = sum(float(amount) for amount in participants_data.values())
                if total_amount != float(amount):
                    messages.error(request, "Total participants amount must equal the expense amount.")
                    return redirect('bill_detail', bill_id=bill_id)
            except ValueError:
                messages.error(request, "Invalid participant amounts data.")
                return redirect('bill_detail', bill_id=bill_id)
        
        expense = Expense.objects.create(
            bill=bill,
            description=description,
            amount=amount,
            paid_by=paid_by,
            split_type=split_type
        )
        
        if split_type == 'equal':
            amount_per_participant = float(amount) / len(participants)
            for participant_id in participants:
                user = CustomUser.objects.get(id=participant_id)
                expense.participants.add(user)
                ParticipantAmount.objects.create(expense=expense, user=user, amount=amount_per_participant)
        else:
            for participant_id, participant_amount in participants_data.items():
                user = CustomUser.objects.get(id=participant_id)
                expense.participants.add(user)
                ParticipantAmount.objects.create(expense=expense, user=user, amount=float(participant_amount))
        
        expense.save()
        return redirect('bill_detail', bill_id=bill_id)
    
    context = {
        'bill': bill,
        'members': members,
        'expenses': expenses,
        'current_user': request.user
    }
    return render(request, 'core/bill_detail.html', context)

def get_expense_data(request, expense_id):
    expense = get_object_or_404(Expense, id=expense_id)
    participants = expense.participantamount_set.values('user_id', 'amount')
    data = {
        'description': expense.description,
        'amount': expense.amount,
        'paid_by': expense.paid_by.id,
        'split_type': expense.split_type,
        'participants': list(participants),
    }
    return JsonResponse(data)

def edit_expense(request, expense_id):
    expense = get_object_or_404(Expense, id=expense_id)
    if request.method == "POST":
        form = ExpenseForm(request.POST, instance=expense)
        if form.is_valid():
            expense = form.save(commit=False)
            if form.cleaned_data['split_type'] == 'custom':
                participant_amounts = request.POST.get('participant_amounts')
                if participant_amounts:
                    try:
                        participants_data = json.loads(participant_amounts)
                        total_amount = sum(float(amount) for amount in participants_data.values())
                        if total_amount != expense.amount:
                            return JsonResponse({'success': False, 'message': 'Total participants amount must equal the expense amount.'})
                        expense.participantamount_set.all().delete()
                        for participant_id, amount in participants_data.items():
                            user = CustomUser.objects.get(id=participant_id)
                            ParticipantAmount.objects.create(expense=expense, user=user, amount=amount)
                    except json.JSONDecodeError:
                        return JsonResponse({'success': False, 'message': 'Invalid participant amounts data.'})
            else:
                expense.participantamount_set.all().delete()
            expense.save()
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'message': form.errors})
    else:
        participant_data = {pa.user.id: str(pa.amount) for pa in expense.participantamount_set.all()}
        initial_data = {
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
        }
        return JsonResponse(data)

    return JsonResponse({'success': False, 'message': 'Invalid request method.'})

@login_required
def delete_expense(request, expense_id):
    expense = get_object_or_404(Expense, id=expense_id)
    bill_id = expense.bill.id
    expense.delete()
    return redirect('bill_detail', bill_id=bill_id)

@login_required
def calculate_debts(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    total_paid = {}
    total_owed = {}

    for member in bill.members.all():
        total_paid[member.username] = 0
        total_owed[member.username] = 0

    for expense in bill.expenses.all():
        total_paid[expense.paid_by.username] += expense.amount

        total_spent = sum(participant_amount.amount for participant_amount in expense.participantamount_set.all())

        for participant_amount in expense.participantamount_set.all():
            participant_share = (participant_amount.amount / total_spent) * expense.amount
            total_owed[participant_amount.user.username] += participant_share

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

    response_lines = []
    for creditor, debtors in final_debts.items():
        for debtor, amount in debtors.items():
            if amount > 0:
                response_lines.append(f"{debtor} owes {creditor} {amount:.2f} {bill.currency}")

    response = "<br>".join(response_lines)
    return JsonResponse(response, safe=False)

@login_required
def delete_bill(request, bill_id):
    bill = get_object_or_404(Bill, id=bill_id)
    
    if request.method == 'POST':
        bill.delete()
        messages.success(request, 'Bill has been successfully deleted.')
        return redirect('dashboard')
    
    return render(request, 'core/bill_details.html', {'bill': bill})

@login_required
def add_friend(request):
    if request.method == "POST":
        email = request.POST['email']
        username = request.POST['username']
        
        try:
            user = CustomUser.objects.get(email=email, username=username)
            friend_relation, created = Friend.objects.get_or_create(user=request.user, friend=user)
            if created:
                messages.success(request, f"{user.username} has been successfully added to your friends list!")
            else:
                messages.info(request, f"{user.username} is already in your friends list!")
        except CustomUser.DoesNotExist:
            messages.error(request, "User not found. Please check the email and username and try again.")
        return redirect('add_friend')

    return render(request, 'core/add_friends.html')


logger = logging.getLogger(__name__)

def get_friend_profile(request, friend_id):
    logger.info(f"Attempting to fetch profile for friend ID: {friend_id}")
    try:
        friend = Friend.objects.get(friend_id=friend_id)
        user = friend.friend
        profile = getattr(user, 'userprofile', None)
        data = {
            'username': user.username,
            'email': user.email,
            'profile_photo': profile.profile_picture.url if profile and profile.profile_picture else '',            
            'bank_account_number': profile.bank_account if profile else '',
            'bank_qr_code': profile.bank_qr_code.url if profile and profile.bank_qr_code else '',
        }
        logger.info(f"Successfully fetched profile for friend ID: {friend_id}")
        return JsonResponse(data)
    except Friend.DoesNotExist:
        logger.error(f"Friend with ID {friend_id} not found")
        return JsonResponse({'error': 'Friend not found'}, status=404)
    except Exception as e:
        logger.error(f"Error fetching profile for friend ID {friend_id}: {str(e)}", exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def remove_friend(request, friend_id):
    if request.method == 'DELETE':
        friend = get_object_or_404(Friend, user=request.user, friend_id=friend_id)
        friend.delete()
        return JsonResponse({'message': 'Friend removed successfully'})
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def account_settings(request):
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        user_form = UserProfileForm(request.POST, request.FILES, instance=user_profile)
        if user_form.is_valid():
            user_form.save()
            messages.success(request, 'Your account settings have been updated successfully.')
            return redirect('account_settings')
    else:
        user_form = UserProfileForm(instance=user_profile)
    
    context = {
        'user_form': user_form,
        'user': request.user
    }
    return render(request, 'core/account_settings.html', context)

def user_logout(request):
    logout(request)
    return redirect('login')

