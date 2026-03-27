from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    allowed_roles: set[str] = set()

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.allowed_roles)


class IsAdminRole(HasRole):
    allowed_roles = {"admin"}


class IsTeacherRole(HasRole):
    allowed_roles = {"teacher", "admin"}


class IsStudentRole(HasRole):
    allowed_roles = {"student", "admin"}


class IsGuardianRole(HasRole):
    allowed_roles = {"guardian", "admin"}
