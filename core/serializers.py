from rest_framework import serializers
from .models import BillBuddy 

class BillBuddySerializer(serializers.ModelSerializer):
    class Meta:
        model = BillBuddy
        fields = '__all__'  # 這會序列化所有欄位
        # 或者你也可以指定特定欄位：
        # fields = ['id', 'field1', 'field2', ...]  # 替換成你實際的欄位名稱