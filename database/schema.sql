-- Quranic Association Platform - Core PostgreSQL Schema
-- Target: Student/Teacher/Admin portals + madrasa management + micro-LMS
-- PostgreSQL 14+

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Users and Roles
-- =========================
CREATE TABLE app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'guardian')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE guardian_profile (
  user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  national_id TEXT,
  address TEXT
);

CREATE TABLE teacher_profile (
  user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  specialization TEXT,
  hire_date DATE
);

CREATE TABLE student_profile (
  user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  guardian_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
  birth_date DATE,
  blood_type TEXT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  notes TEXT
);

CREATE INDEX idx_student_guardian ON student_profile(guardian_user_id);

-- =========================
-- Madrasa and Groups
-- =========================
CREATE TABLE madrasa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE class_group (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  madrasa_id UUID NOT NULL REFERENCES madrasa(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level_name TEXT,
  teacher_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
  room_name TEXT,
  capacity INT CHECK (capacity > 0),
  schedule_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_class_group_teacher ON class_group(teacher_user_id);

CREATE TABLE class_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_group_id UUID NOT NULL REFERENCES class_group(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  UNIQUE (class_group_id, student_user_id, start_date)
);

CREATE INDEX idx_class_enrollment_student ON class_enrollment(student_user_id);

-- =========================
-- Attendance
-- =========================
CREATE TABLE attendance_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_group_id UUID NOT NULL REFERENCES class_group(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  topic TEXT,
  created_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_group_id, session_date)
);

CREATE TABLE attendance_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_session(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  note TEXT,
  marked_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_user_id)
);

CREATE INDEX idx_attendance_student ON attendance_record(student_user_id);

-- =========================
-- Memorization Tracking and Evaluation
-- =========================
CREATE TABLE daily_wird_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  target_ayat INT CHECK (target_ayat >= 0),
  completed_ayat INT CHECK (completed_ayat >= 0),
  review_ayat INT CHECK (review_ayat >= 0),
  minutes_spent INT CHECK (minutes_spent >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_user_id, log_date)
);

CREATE INDEX idx_wird_student_date ON daily_wird_log(student_user_id, log_date DESC);

CREATE TABLE memorization_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  teacher_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  class_group_id UUID REFERENCES class_group(id) ON DELETE SET NULL,
  assessed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  from_text TEXT NOT NULL,
  to_text TEXT NOT NULL,
  tajweed_score NUMERIC(5,2) CHECK (tajweed_score BETWEEN 0 AND 100),
  pronunciation_score NUMERIC(5,2) CHECK (pronunciation_score BETWEEN 0 AND 100),
  memorization_score NUMERIC(5,2) CHECK (memorization_score BETWEEN 0 AND 100),
  overall_score NUMERIC(5,2) GENERATED ALWAYS AS (
    ROUND(COALESCE((tajweed_score + pronunciation_score + memorization_score) / 3, 0), 2)
  ) STORED,
  notes TEXT,
  published_to_guardian BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessment_student_date ON memorization_assessment(student_user_id, assessed_on DESC);

-- =========================
-- Gamification
-- =========================
CREATE TABLE honor_rank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  min_points INT NOT NULL CHECK (min_points >= 0),
  badge_color TEXT
);

CREATE TABLE reward_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT,
  source_id UUID,
  awarded_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reward_student ON reward_event(student_user_id);

CREATE VIEW student_points_summary AS
SELECT
  s.user_id AS student_user_id,
  COALESCE(SUM(r.points), 0) AS total_points
FROM student_profile s
LEFT JOIN reward_event r ON r.student_user_id = s.user_id
GROUP BY s.user_id;

-- =========================
-- Certificates
-- =========================
CREATE TABLE certificate_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  certificate_type TEXT NOT NULL CHECK (certificate_type IN ('honor', 'ijaza', 'completion')),
  html_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE certificate_issue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES certificate_template(id) ON DELETE RESTRICT,
  student_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  issued_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certificate_student ON certificate_issue(student_user_id, issue_date DESC);

-- =========================
-- Local Events and Room Booking
-- =========================
CREATE TABLE room (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  capacity INT CHECK (capacity > 0),
  location_text TEXT
);

CREATE TABLE local_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  room_id UUID REFERENCES room(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  organizer_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL,
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_event_room_time ON local_event(room_id, starts_at, ends_at);

-- =========================
-- Micro-LMS
-- =========================
CREATE TABLE course (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  level_name TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES app_user(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lesson (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  content_text TEXT,
  order_no INT NOT NULL CHECK (order_no > 0),
  UNIQUE (course_id, order_no)
);

CREATE TABLE quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pass_score NUMERIC(5,2) NOT NULL CHECK (pass_score BETWEEN 0 AND 100)
);

CREATE TABLE quiz_question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options_json JSONB NOT NULL,
  correct_answer TEXT NOT NULL
);

CREATE TABLE quiz_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempt_student ON quiz_attempt(student_user_id, attempted_at DESC);

-- =========================
-- Smart Content Indexing
-- =========================
CREATE TABLE content_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'audio', 'video')),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  body_text TEXT,
  media_url TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE skill_tag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE interest_tag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE content_skill_tag (
  content_id UUID NOT NULL REFERENCES content_item(id) ON DELETE CASCADE,
  skill_tag_id UUID NOT NULL REFERENCES skill_tag(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, skill_tag_id)
);

CREATE TABLE content_interest_tag (
  content_id UUID NOT NULL REFERENCES content_item(id) ON DELETE CASCADE,
  interest_tag_id UUID NOT NULL REFERENCES interest_tag(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, interest_tag_id)
);

CREATE TABLE user_content_view (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content_item(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_content_view_user ON user_content_view(user_id, viewed_at DESC);

-- Updated-at helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_app_user_updated_at
BEFORE UPDATE ON app_user
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
