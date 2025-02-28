import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Database } from '../_shared/database.types.ts';
import { HealthcareProvider } from '../_shared/types.ts';

// Initialize Supabase client
export const supabaseClient = createClient<Database>(
  Deno.env.get('DB_URL') || '',
  Deno.env.get('SERVICE_ROLE_KEY') || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Store health analysis results in the database
export async function storeAnalysisResults<T extends Record<string, any>>(
  analysisType: string,
  analysisData: T,
  specificTableName: string,
  userId?: string
): Promise<{ id: string } | null> {
  try {
    // Prepare base analysis data
    const baseAnalysisData = {
      user_id: userId || null,
      analysis_type: analysisType,
      raw_analysis: analysisData.rawAnalysis || '',
      concerns: analysisData.concerns || [],
      recommendations: analysisData.recommendations || [],
      created_at: new Date().toISOString(),
    };

    // Insert into base health_analyses table first
    const { data: baseData, error: baseError } = await supabaseClient
      .from('health_analyses')
      .insert(baseAnalysisData)
      .select('id')
      .single();

    if (baseError || !baseData) {
      console.error(`Error storing base analysis: ${baseError?.message}`);
      return null;
    }

    // Prepare specific analysis data
    const specificAnalysisData = {
      id: baseData.id,
      ...prepareSpecificData(analysisType, analysisData),
    };

    // Insert into specific analysis table
    const { error: specificError } = await supabaseClient
      .from(specificTableName)
      .insert(specificAnalysisData);

    if (specificError) {
      console.error(`Error storing specific analysis: ${specificError.message}`);
      // Attempt to clean up the base record if specific insert failed
      await supabaseClient.from('health_analyses').delete().eq('id', baseData.id);
      return null;
    }

    return { id: baseData.id };
  } catch (error) {
    console.error(`Error in storeAnalysisResults: ${error}`);
    return null;
  }
}

// Helper function to map general analysis data to specific table structure
function prepareSpecificData(
  analysisType: string,
  analysisData: Record<string, any>
): Record<string, any> {
  switch (analysisType) {
    case 'dental':
      return {
        dental_issues: analysisData.dentalIssues || [],
        oral_hygiene_score: analysisData.oralHygieneScore,
        dentist_recommendation: analysisData.dentistRecommended || false,
      };
    case 'skin':
      return {
        skin_conditions: analysisData.skinConditions || [],
        severity_score: analysisData.severityScore,
        dermatologist_recommendation: analysisData.dermatologistRecommended || false,
      };
    case 'posture':
      return {
        posture_issues: analysisData.postureIssues || [],
        posture_score: analysisData.postureScore,
        exercise_recommendations: analysisData.exerciseRecommendations || [],
      };
    case 'nutrition':
      return {
        food_items: analysisData.foodItems || [],
        calories: analysisData.nutritionalInfo?.calories,
        protein: analysisData.nutritionalInfo?.protein,
        carbs: analysisData.nutritionalInfo?.carbs,
        fat: analysisData.nutritionalInfo?.fat,
        fiber: analysisData.nutritionalInfo?.fiber,
        health_score: analysisData.healthScore,
        vitamins: analysisData.nutritionalInfo?.vitamins || {},
      };
    case 'stool':
      return {
        stool_type: analysisData.stoolType,
        abnormalities: analysisData.abnormalities || [],
        hydration_indicator: analysisData.hydrationIndicator,
        doctor_recommendation: analysisData.doctorConsultationRecommended || false,
      };
    default:
      return {};
  }
}

// Fetch nearby healthcare providers
export async function findNearbyProviders(
  specialty: string,
  latitude?: number,
  longitude?: number
): Promise<HealthcareProvider[] | null> {
  try {
    // For now, just filter by specialty
    // In a real implementation, this would include geospatial queries
    let query = supabaseClient
      .from('healthcare_providers')
      .select('*')
      .eq('specialty', specialty);

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching providers: ${error.message}`);
      return null;
    }

    // Map the data to HealthcareProvider type
    return data ? data.map(provider => ({
      id: provider.id,
      name: provider.name,
      specialty: provider.specialty,
      location: provider.location,
      contact: provider.contact,
      website: provider.website,
      // Calculate distance if lat/long provided (simplified for now)
      distance: latitude && longitude ? Math.random() * 10 : undefined // Placeholder
    })) : null;
  } catch (error) {
    console.error(`Error in findNearbyProviders: ${error}`);
    return null;
  }
} 