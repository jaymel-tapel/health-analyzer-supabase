export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      health_analyses: {
        Row: {
          id: string;
          user_id: string | null;
          analysis_type: string;
          image_url: string | null;
          raw_analysis: string;
          concerns: string[];
          recommendations: string[];
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          analysis_type: string;
          image_url?: string | null;
          raw_analysis: string;
          concerns?: string[];
          recommendations?: string[];
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          analysis_type?: string;
          image_url?: string | null;
          raw_analysis?: string;
          concerns?: string[];
          recommendations?: string[];
          created_at?: string;
          updated_at?: string | null;
        };
      };
      dental_analyses: {
        Row: {
          id: string;
          dental_issues: string[];
          oral_hygiene_score: number | null;
          dentist_recommendation: boolean;
        };
        Insert: {
          id: string;
          dental_issues?: string[];
          oral_hygiene_score?: number | null;
          dentist_recommendation?: boolean;
        };
        Update: {
          id?: string;
          dental_issues?: string[];
          oral_hygiene_score?: number | null;
          dentist_recommendation?: boolean;
        };
      };
      skin_analyses: {
        Row: {
          id: string;
          skin_conditions: string[];
          severity_score: number | null;
          dermatologist_recommendation: boolean;
        };
        Insert: {
          id: string;
          skin_conditions?: string[];
          severity_score?: number | null;
          dermatologist_recommendation?: boolean;
        };
        Update: {
          id?: string;
          skin_conditions?: string[];
          severity_score?: number | null;
          dermatologist_recommendation?: boolean;
        };
      };
      posture_analyses: {
        Row: {
          id: string;
          posture_issues: string[];
          posture_score: number | null;
          exercise_recommendations: string[];
        };
        Insert: {
          id: string;
          posture_issues?: string[];
          posture_score?: number | null;
          exercise_recommendations?: string[];
        };
        Update: {
          id?: string;
          posture_issues?: string[];
          posture_score?: number | null;
          exercise_recommendations?: string[];
        };
      };
      nutrition_analyses: {
        Row: {
          id: string;
          food_items: string[];
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          fiber: number | null;
          health_score: number | null;
          vitamins: Json;
        };
        Insert: {
          id: string;
          food_items?: string[];
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          fiber?: number | null;
          health_score?: number | null;
          vitamins?: Json;
        };
        Update: {
          id?: string;
          food_items?: string[];
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          fiber?: number | null;
          health_score?: number | null;
          vitamins?: Json;
        };
      };
      stool_analyses: {
        Row: {
          id: string;
          stool_type: number | null;
          abnormalities: string[];
          hydration_indicator: string | null;
          doctor_recommendation: boolean;
        };
        Insert: {
          id: string;
          stool_type?: number | null;
          abnormalities?: string[];
          hydration_indicator?: string | null;
          doctor_recommendation?: boolean;
        };
        Update: {
          id?: string;
          stool_type?: number | null;
          abnormalities?: string[];
          hydration_indicator?: string | null;
          doctor_recommendation?: boolean;
        };
      };
      healthcare_providers: {
        Row: {
          id: string;
          name: string;
          specialty: string;
          location: string | null;
          contact: string | null;
          website: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          specialty: string;
          location?: string | null;
          contact?: string | null;
          website?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          specialty?: string;
          location?: string | null;
          contact?: string | null;
          website?: string | null;
          created_at?: string;
        };
      };
    };
  };
} 