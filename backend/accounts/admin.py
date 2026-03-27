from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Role Data", {"fields": ("full_name", "phone", "role")}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("Role Data", {"fields": ("email", "full_name", "phone", "role")}),
    )
    list_display = ("username", "email", "full_name", "role", "is_staff", "is_active")
    search_fields = ("username", "email", "full_name")
