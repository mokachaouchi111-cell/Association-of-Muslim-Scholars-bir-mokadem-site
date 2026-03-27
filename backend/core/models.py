from django.conf import settings
from django.db import models


User = settings.AUTH_USER_MODEL


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class GuardianProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="guardian_profile")
    national_id = models.CharField(max_length=80, blank=True)
    address = models.TextField(blank=True)

    def __str__(self):
        return f"Guardian: {self.user}"


class TeacherProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")
    specialization = models.CharField(max_length=120, blank=True)
    hire_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Teacher: {self.user}"


class StudentProfile(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        GRADUATED = "graduated", "Graduated"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    guardian = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guardian_students",
    )
    birth_date = models.DateField(null=True, blank=True)
    blood_type = models.CharField(max_length=5, blank=True)
    enrollment_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Student: {self.user}"


class Madrasa(TimeStampedModel):
    name = models.CharField(max_length=180)
    location = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ClassGroup(TimeStampedModel):
    madrasa = models.ForeignKey(Madrasa, on_delete=models.CASCADE, related_name="groups")
    name = models.CharField(max_length=150)
    level_name = models.CharField(max_length=80, blank=True)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="teaching_groups")
    room_name = models.CharField(max_length=80, blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    schedule_text = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("madrasa", "name")

    def __str__(self):
        return f"{self.name} - {self.madrasa.name}"


class ClassEnrollment(TimeStampedModel):
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, related_name="enrollments")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="class_enrollments")
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("class_group", "student", "start_date")


class AttendanceSession(TimeStampedModel):
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, related_name="sessions")
    session_date = models.DateField()
    topic = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_sessions")

    class Meta:
        unique_together = ("class_group", "session_date")


class AttendanceRecord(TimeStampedModel):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        EXCUSED = "excused", "Excused"

    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attendance_records")
    status = models.CharField(max_length=10, choices=Status.choices)
    note = models.TextField(blank=True)
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="marked_attendance")

    class Meta:
        unique_together = ("session", "student")


class DailyWirdLog(TimeStampedModel):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wird_logs")
    log_date = models.DateField()
    target_ayat = models.PositiveIntegerField(default=0)
    completed_ayat = models.PositiveIntegerField(default=0)
    review_ayat = models.PositiveIntegerField(default=0)
    minutes_spent = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ("student", "log_date")


class MemorizationAssessment(TimeStampedModel):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memorization_assessments")
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="given_assessments")
    class_group = models.ForeignKey(ClassGroup, on_delete=models.SET_NULL, null=True, blank=True)
    assessed_on = models.DateField()
    from_text = models.CharField(max_length=255)
    to_text = models.CharField(max_length=255)
    tajweed_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pronunciation_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    memorization_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    published_to_guardian = models.BooleanField(default=False)


class HonorRank(TimeStampedModel):
    code = models.CharField(max_length=60, unique=True)
    display_name = models.CharField(max_length=120)
    min_points = models.PositiveIntegerField(default=0)
    badge_color = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ("min_points",)

    def __str__(self):
        return self.display_name


class RewardEvent(TimeStampedModel):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reward_events")
    points = models.IntegerField()
    reason = models.CharField(max_length=255)
    source_type = models.CharField(max_length=50, blank=True)
    source_id = models.UUIDField(null=True, blank=True)
    awarded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="awarded_rewards")


class Course(TimeStampedModel):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    level_name = models.CharField(max_length=80, blank=True)
    is_published = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_courses")

    def __str__(self):
        return self.title


class Lesson(TimeStampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    video_url = models.URLField(blank=True)
    content_text = models.TextField(blank=True)
    order_no = models.PositiveIntegerField()

    class Meta:
        unique_together = ("course", "order_no")
        ordering = ("order_no",)


class Quiz(TimeStampedModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="quizzes")
    title = models.CharField(max_length=200)
    pass_score = models.DecimalField(max_digits=5, decimal_places=2, default=60)


class QuizAttempt(TimeStampedModel):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quiz_attempts")
    score = models.DecimalField(max_digits=5, decimal_places=2)
    passed = models.BooleanField(default=False)
