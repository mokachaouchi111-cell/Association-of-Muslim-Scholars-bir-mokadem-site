from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole, IsStudentRole, IsTeacherRole

from .models import (
    AttendanceRecord,
    AttendanceSession,
    ClassEnrollment,
    ClassGroup,
    Course,
    DailyWirdLog,
    MemorizationAssessment,
    RewardEvent,
    StudentProfile,
)
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
    ClassEnrollmentSerializer,
    ClassGroupSerializer,
    CourseSerializer,
    DailyWirdLogSerializer,
    MemorizationAssessmentSerializer,
    RewardEventSerializer,
    StudentDashboardSerializer,
    StudentProfileSerializer,
    build_student_dashboard,
)


class StaffWritePermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.role in {"teacher", "admin"}


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.select_related("user", "guardian").all()
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAdminRole]


class ClassGroupViewSet(viewsets.ModelViewSet):
    queryset = ClassGroup.objects.select_related("madrasa", "teacher").all()
    serializer_class = ClassGroupSerializer
    permission_classes = [StaffWritePermission]


class ClassEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = ClassEnrollment.objects.select_related("class_group", "student").all()
    serializer_class = ClassEnrollmentSerializer
    permission_classes = [StaffWritePermission]


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    queryset = AttendanceSession.objects.select_related("class_group", "created_by").all()
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsTeacherRole]


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related("session", "student", "marked_by").all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsTeacherRole]


class DailyWirdLogViewSet(viewsets.ModelViewSet):
    queryset = DailyWirdLog.objects.select_related("student").all()
    serializer_class = DailyWirdLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in {"teacher", "admin"}:
            return self.queryset
        return self.queryset.filter(student=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "student":
            serializer.save(student=user)
            return
        serializer.save()


class MemorizationAssessmentViewSet(viewsets.ModelViewSet):
    queryset = MemorizationAssessment.objects.select_related("student", "teacher", "class_group").all()
    serializer_class = MemorizationAssessmentSerializer
    permission_classes = [IsTeacherRole]

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


class RewardEventViewSet(viewsets.ModelViewSet):
    queryset = RewardEvent.objects.select_related("student", "awarded_by").all()
    serializer_class = RewardEventSerializer
    permission_classes = [IsTeacherRole]

    def perform_create(self, serializer):
        serializer.save(awarded_by=self.request.user)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [StaffWritePermission]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StudentDashboardView(APIView):
    permission_classes = [IsStudentRole]

    def get(self, request):
        if request.user.role != "student":
            raise PermissionDenied("Student dashboard is only for student accounts.")
        payload = build_student_dashboard(request.user)
        serializer = StudentDashboardSerializer(payload)
        return Response(serializer.data)
