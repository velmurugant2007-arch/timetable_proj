-- Run this entire script in the Supabase SQL Editor

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  college TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Years Table
CREATE TABLE years (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sections JSONB DEFAULT '[]'::jsonb
);

-- 3. Faculty Table
CREATE TABLE faculty (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  acronym TEXT,
  designation TEXT,
  image TEXT,
  "isMedicalLeave" BOOLEAN DEFAULT FALSE,
  remarks TEXT
);

-- 4. Subjects Table
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT NOT NULL,
  hours INTEGER DEFAULT 4,
  "facultyId" TEXT REFERENCES faculty(id) ON DELETE SET NULL,
  "isLab" BOOLEAN DEFAULT FALSE
);

-- 5. Timetables (Student Grid Data)
CREATE TABLE timetables (
  id TEXT PRIMARY KEY,
  grid JSONB DEFAULT '{}'::jsonb
);

-- 6. Imported Timetables
CREATE TABLE imported_timetables (
  id TEXT PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb
);

-- 7. Settings
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  "workingDays" JSONB DEFAULT '["MON", "TUE", "WED", "THU", "FRI", "SAT"]'::jsonb,
  "periodsPerDay" INTEGER DEFAULT 7,
  "breakAfter" INTEGER DEFAULT 3
);
-- Initialize default settings
INSERT INTO settings (id) VALUES (1);

-- 8. Faculty Master TT State
CREATE TABLE faculty_master_tt (
  id INTEGER PRIMARY KEY DEFAULT 1,
  meta JSONB,
  faculty JSONB DEFAULT '[]'::jsonb,
  generated TIMESTAMPTZ
);
-- Initialize default faculty master state
INSERT INTO faculty_master_tt (id) VALUES (1);

-- 9. Faculty Acronym Map
CREATE TABLE faculty_acronym_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_name TEXT,
  acronym TEXT
);

-- IMPORTANT: Disable Row Level Security (RLS) for the backend to access data freely via Anon key.
-- Alternatively, if you want RLS, you must use a Service Role Key in the backend instead of Anon Key.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE years DISABLE ROW LEVEL SECURITY;
ALTER TABLE faculty DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE timetables DISABLE ROW LEVEL SECURITY;
ALTER TABLE imported_timetables DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_master_tt DISABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_acronym_map DISABLE ROW LEVEL SECURITY;
