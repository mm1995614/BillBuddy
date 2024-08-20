# Generated by Django 3.2.25 on 2024-06-27 15:59

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_alter_expense_paid_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='split_type',
            field=models.CharField(choices=[('equal', 'Equal Split'), ('custom', 'Custom Split')], default='equal', max_length=10),
        ),
        migrations.AlterField(
            model_name='expense',
            name='paid_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
    ]