from django.db.models import Sum
from rest_framework import serializers

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


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = "__all__"


class ClassGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassGroup
        fields = "__all__"


class ClassEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassEnrollment
        fields = "__all__"


class AttendanceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSession
        fields = "__all__"


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = "__all__"


class DailyWirdLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyWirdLog
        fields = "__all__"


class MemorizationAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemorizationAssessment
        fields = "__all__"


class RewardEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardEvent
        fields = "__all__"


class StudentDashboardSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    full_name = serializers.CharField()
    total_points = serializers.IntegerField()
    total_logs = serializers.IntegerField()
    attendance_present = serializers.IntegerField()


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"


def build_student_dashboard(user):
    total_points = user.reward_events.aggregate(total=Sum("points")).get("total") or 0
    total_logs = user.wird_logs.count()
    attendance_present = user.attendance_records.filter(status="present").count()
    return {
        "student_id": user.id,
        "full_name": user.full_name,
        "total_points": total_points,
        "total_logs": total_logs,
        "attendance_present": attendance_present,
    }
