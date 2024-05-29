from django.contrib.auth.decorators import login_required
from .models import Bill, Expense, Friend
from django.contrib.auth.models import User
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from .forms import CustomUserCreationForm
from .forms import CustomUserChangeForm
import os
from django.conf import settings
from django import forms
from django.contrib.auth.views import LoginView
from .forms import EmailAuthenticationForm


@login_required
def dashboard(request):
    bills = Bill.objects.filter(members=request.user)
    friends = Friend.objects.filter(user=request.user)
    return render(request, 'core/dashboard.html', {'bills': bills, 'friends': friends})

@login_required
def create_bill(request):
    if request.method == 'POST':
        name = request.POST['bill-name']
        currency = request.POST['bill-currency']
        members = request.POST.getlist('bill-members')
        bill = Bill.objects.create(name=name, currency=currency)
        for member in members:
            user = User.objects.get(username=member)
            bill.members.add(user)
        return redirect('dashboard')
    return render(request, 'core/create_bill.html')

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
            login(request, user)
            return redirect('dashboard')
    else:
        form = CustomUserCreationForm()
    return render(request, 'core/register.html', {'form': form})

@login_required
def account_settings(request):
    if request.method == 'POST':
        form = CustomUserChangeForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            return redirect('dashboard')
    else:
        form = CustomUserChangeForm(instance=request.user)
    return render(request, 'core/account_settings.html', {'form': form})

def user_logout(request):
    logout(request)
    return redirect('login')

