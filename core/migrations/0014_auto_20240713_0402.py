# Generated by Django 3.2.25 on 2024-07-12 20:02

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_auto_20240713_0355'),
    ]

    operations = [
        #migrations.RemoveField(
        #    model_name='friend',
        #    name='nickname',
        #),
        migrations.AddField(
            model_name='customuser',
            name='registration_complete',
            field=models.BooleanField(default=False),
        ),
    ]