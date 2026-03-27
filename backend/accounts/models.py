from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Roles(models.TextChoices):
        STUDENT = "student", "Student"
        TEACHER = "teacher", "Teacher"
        ADMIN = "admin", "Admin"
        GUARDIAN = "guardian", "Guardian"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=180)
    phone = models.CharField(max_length=40, blank=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.STUDENT)

    REQUIRED_FIELDS = ["email", "full_name"]

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"
