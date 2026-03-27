# Quranic Platform ERD

This ERD covers the core modules:
- User portals (`student`, `teacher`, `admin`, `guardian`)
- Attendance and memorization evaluations
- Points and honor ranking
- Certificates
- Room/event scheduling
- Micro-LMS (courses/quizzes)
- Smart content tagging and recommendations

```mermaid
erDiagram
    app_user ||--o| student_profile : "is"
    app_user ||--o| teacher_profile : "is"
    app_user ||--o| guardian_profile : "is"
    app_user ||--o{ student_profile : "guardian_user_id"

    madrasa ||--o{ class_group : "has"
    app_user ||--o{ class_group : "teaches"
    class_group ||--o{ class_enrollment : "enrolls"
    app_user ||--o{ class_enrollment : "joins"

    class_group ||--o{ attendance_session : "has"
    attendance_session ||--o{ attendance_record : "has"
    app_user ||--o{ attendance_record : "student"
    app_user ||--o{ attendance_record : "marked_by"

    app_user ||--o{ daily_wird_log : "writes"
    app_user ||--o{ memorization_assessment : "student"
    app_user ||--o{ memorization_assessment : "teacher"

    app_user ||--o{ reward_event : "gets"
    app_user ||--o{ reward_event : "awarded_by"
    honor_rank }o--o{ app_user : "resolved by total_points"

    certificate_template ||--o{ certificate_issue : "used_by"
    app_user ||--o{ certificate_issue : "issued_to_student"

    room ||--o{ local_event : "hosts"
    app_user ||--o{ local_event : "organizes"

    course ||--o{ lesson : "contains"
    course ||--o{ quiz : "contains"
    quiz ||--o{ quiz_question : "has"
    quiz ||--o{ quiz_attempt : "has"
    app_user ||--o{ quiz_attempt : "student"

    content_item ||--o{ content_skill_tag : "tagged_with"
    skill_tag ||--o{ content_skill_tag : "tag"
    content_item ||--o{ content_interest_tag : "tagged_with"
    interest_tag ||--o{ content_interest_tag : "tag"
    app_user ||--o{ user_content_view : "views"
    content_item ||--o{ user_content_view : "viewed"
```

## Notes

- Use `app_user.role` to control dashboard access and API permissions.
- `memorization_assessment.published_to_guardian` controls parent visibility.
- `student_points_summary` view computes gamification totals without duplicating data.
- `local_event` + `room` prevents scheduling conflicts at application level.
- Content recommendation can be built by matching viewed content tags with other content tags.
