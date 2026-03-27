from django.contrib import admin

from .models import (
    AttendanceRecord,
    AttendanceSession,
    ClassEnrollment,
    ClassGroup,
    Course,
    DailyWirdLog,
    GuardianProfile,
    HonorRank,
    Lesson,
    Madrasa,
    MemorizationAssessment,
    Quiz,
    QuizAttempt,
    RewardEvent,
    StudentProfile,
    TeacherProfile,
)


admin.site.register(GuardianProfile)
admin.site.register(TeacherProfile)
admin.site.register(StudentProfile)
admin.site.register(Madrasa)
admin.site.register(ClassGroup)
admin.site.register(ClassEnrollment)
admin.site.register(AttendanceSession)
admin.site.register(AttendanceRecord)
admin.site.register(DailyWirdLog)
admin.site.register(MemorizationAssessment)
admin.site.register(HonorRank)
admin.site.register(RewardEvent)
admin.site.register(Course)
admin.site.register(Lesson)
admin.site.register(Quiz)
admin.site.register(QuizAttempt)
