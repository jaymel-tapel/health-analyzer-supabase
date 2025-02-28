-- Create health analysis tables

-- Base analysis table for common fields
CREATE TABLE IF NOT EXISTS health_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  analysis_type TEXT NOT NULL,
  image_url TEXT,
  raw_analysis TEXT NOT NULL,
  concerns TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Dental analysis results
CREATE TABLE IF NOT EXISTS dental_analyses (
  id UUID PRIMARY KEY REFERENCES health_analyses(id) ON DELETE CASCADE,
  dental_issues TEXT[] DEFAULT '{}',
  oral_hygiene_score SMALLINT,
  dentist_recommendation BOOLEAN DEFAULT FALSE
);

-- Skin analysis results
CREATE TABLE IF NOT EXISTS skin_analyses (
  id UUID PRIMARY KEY REFERENCES health_analyses(id) ON DELETE CASCADE,
  skin_conditions TEXT[] DEFAULT '{}',
  severity_score SMALLINT,
  dermatologist_recommendation BOOLEAN DEFAULT FALSE
);

-- Posture analysis results
CREATE TABLE IF NOT EXISTS posture_analyses (
  id UUID PRIMARY KEY REFERENCES health_analyses(id) ON DELETE CASCADE,
  posture_issues TEXT[] DEFAULT '{}',
  posture_score SMALLINT,
  exercise_recommendations TEXT[] DEFAULT '{}'
);

-- Nutrition analysis results
CREATE TABLE IF NOT EXISTS nutrition_analyses (
  id UUID PRIMARY KEY REFERENCES health_analyses(id) ON DELETE CASCADE,
  food_items TEXT[] DEFAULT '{}',
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  fiber INTEGER,
  health_score SMALLINT,
  vitamins JSONB DEFAULT '{}'
);

-- Stool health analysis results
CREATE TABLE IF NOT EXISTS stool_analyses (
  id UUID PRIMARY KEY REFERENCES health_analyses(id) ON DELETE CASCADE,
  stool_type SMALLINT,
  abnormalities TEXT[] DEFAULT '{}',
  hydration_indicator TEXT,
  doctor_recommendation BOOLEAN DEFAULT FALSE
);

-- Healthcare providers lookup table
CREATE TABLE IF NOT EXISTS healthcare_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  location TEXT,
  contact TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS health_analyses_user_id_idx ON health_analyses(user_id);
CREATE INDEX IF NOT EXISTS health_analyses_analysis_type_idx ON health_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS health_analyses_created_at_idx ON health_analyses(created_at); 