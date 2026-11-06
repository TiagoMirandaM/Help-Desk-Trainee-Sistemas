from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (("Perfil de negócio", {"fields": ("role",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Perfil de negócio", {"fields": ("role",)}),)
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "role",
        "is_staff",
        "is_active",
    )
    list_filter = UserAdmin.list_filter + ("role",)
    search_fields = ("username", "first_name", "last_name", "email")
