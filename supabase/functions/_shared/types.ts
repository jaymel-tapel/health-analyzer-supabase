/**
 * Base health analysis request interface
 */
export interface HealthAnalysisRequest {
  image: string; // Base64 encoded image
  userId?: string; // Optional user ID if authenticated
  metadata?: Record<string, any>; // Additional metadata
  findProviders?: boolean; // Whether to search for healthcare providers
  location?: {
    latitude: number;
    longitude: number;
  }; // Optional location for provider search
}

/**
 * Healthcare provider interface
 */
export interface HealthcareProvider {
  id: string;
  name: string;
  specialty: string;
  location?: string;
  contact?: string;
  website?: string;
  distance?: number; // In kilometers or miles
}

/**
 * Base health analysis response interface
 */
export interface HealthAnalysisResponse {
  id?: string; // Database ID after storage
  analysis: string; // Main analysis text
  rawAnalysis?: string; // Raw analysis text for database storage
  concerns?: string[]; // Potential health concerns
  recommendations?: string[]; // Health recommendations
  created_at?: string; // ISO timestamp
  nearbyProviders?: HealthcareProvider[]; // Nearby healthcare providers
}

/**
 * Dental check specific response
 */
export interface DentalCheckResponse extends HealthAnalysisResponse {
  dentalIssues?: string[];
  oralHygieneScore?: number; // 0-10 rating
  dentistRecommended?: boolean;
}

/**
 * Skin tracker specific response
 */
export interface SkinTrackerResponse extends HealthAnalysisResponse {
  skinConditions?: string[];
  severityScore?: number; // 0-10 rating
  dermatologistRecommended?: boolean;
}

/**
 * Posture check specific response
 */
export interface PostureCheckResponse extends HealthAnalysisResponse {
  postureIssues?: string[];
  postureScore?: number; // 0-10 rating
  exerciseRecommendations?: string[];
}

/**
 * Nutrition analysis response
 */
export interface NutriSnapResponse extends HealthAnalysisResponse {
  foodItems?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    vitamins?: Record<string, number>;
  };
  healthScore?: number; // 0-10 rating
}

/**
 * Stool health analysis response
 */
export interface PoopHealthResponse extends HealthAnalysisResponse {
  stoolType?: number; // Bristol stool scale (1-7)
  abnormalities?: string[];
  hydrationIndicator?: 'low' | 'normal' | 'good';
  doctorConsultationRecommended?: boolean;
}

/**
 * OpenAI API response structure
 */
export interface OpenAIAnalysisResponse {
  model: string;
  created: number;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
} 