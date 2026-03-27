from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceRecordViewSet,
    AttendanceSessionViewSet,
    ClassEnrollmentViewSet,
    ClassGroupViewSet,
    CourseViewSet,
    DailyWirdLogViewSet,
    MemorizationAssessmentViewSet,
    RewardEventViewSet,
    StudentDashboardView,
    StudentProfileViewSet,
)


router = DefaultRouter()
router.register("student-profiles", StudentProfileViewSet, basename="student-profile")
router.register("class-groups", ClassGroupViewSet, basename="class-group")
router.register("enrollments", ClassEnrollmentViewSet, basename="enrollment")
router.register("attendance-sessions", AttendanceSessionViewSet, basename="attendance-session")
router.register("attendance-records", AttendanceRecordViewSet, basename="attendance-record")
router.register("wird-logs", DailyWirdLogViewSet, basename="wird-log")
router.register("assessments", MemorizationAssessmentViewSet, basename="assessment")
router.register("rewards", RewardEventViewSet, basename="reward")
router.register("courses", CourseViewSet, basename="course")

urlpatterns = [
    path("dashboard/student/", StudentDashboardView.as_view(), name="student-dashboard"),
    path("", include(router.urls)),
]
