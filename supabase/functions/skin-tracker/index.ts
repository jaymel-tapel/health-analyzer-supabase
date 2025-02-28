import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { analyzeImage, parseAnalysisResults } from '../_shared/openai.ts';
import { errorResponse, successResponse, validateRequiredFields, logError } from '../_shared/utils.ts';
import { skinTrackerPrompt } from '../_shared/prompts.ts';
import { HealthAnalysisRequest, SkinTrackerResponse } from '../_shared/types.ts';
import { storeAnalysisResults, findNearbyProviders } from '../_shared/supabase.ts';

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    // Get request body
    const requestData: HealthAnalysisRequest = await req.json();
    
    // Validate required fields
    const validationError = validateRequiredFields(requestData, ['image']);
    if (validationError) {
      return errorResponse(validationError, 400);
    }
    
    // Analyze image with OpenAI
    const analysisText = await analyzeImage(requestData.image, skinTrackerPrompt);
    
    // Parse the analysis results
    const parsedResults = parseAnalysisResults(analysisText);
    
    // Extract skin-specific information
    const skinResponse: SkinTrackerResponse = {
      ...parsedResults,
      created_at: new Date().toISOString(),
      skinConditions: extractSkinConditions(analysisText),
      severityScore: extractSeverityScore(analysisText),
      dermatologistRecommended: shouldRecommendDermatologist(analysisText, parsedResults.concerns),
      rawAnalysis: analysisText, // Add raw analysis for database storage
    };
    
    // Store analysis results in database
    if (requestData.userId) {
      try {
        const storageResult = await storeAnalysisResults(
          'skin',
          skinResponse,
          'skin_analyses',
          requestData.userId
        );
        
        if (storageResult) {
          skinResponse.id = storageResult.id;
        }
        
        // Find nearby dermatologists if requested
        if (requestData.location && requestData.findProviders) {
          const nearbyDermatologists = await findNearbyProviders(
            'dermatologist',
            requestData.location.latitude,
            requestData.location.longitude
          );
          
          if (nearbyDermatologists) {
            skinResponse.nearbyProviders = nearbyDermatologists;
          }
        }
      } catch (dbError) {
        // Log database error but don't fail the request
        logError('skin-tracker-db', dbError as Error);
        console.error('Error storing skin analysis results:', dbError);
      }
    }
    
    // Return successful response
    return successResponse(skinResponse);
  } catch (error) {
    logError('skin-tracker', error as Error);
    return errorResponse('Error analyzing skin image: ' + (error as Error).message, 500);
  }
});

/**
 * Extract skin conditions from analysis text
 */
function extractSkinConditions(analysisText: string): string[] {
  try {
    const conditions: string[] = [];
    
    // Look for skin conditions in the text
    const conditionsMatch = analysisText.match(/(?:skin conditions|skin issues|potential conditions):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
    if (conditionsMatch && conditionsMatch[1]) {
      conditions.push(
        ...conditionsMatch[1]
          .split('\n')
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      );
    }
    
    // Look for keywords that might indicate skin conditions
    const skinKeywords = [
      'acne', 'rosacea', 'eczema', 'psoriasis', 'dermatitis', 
      'folliculitis', 'hives', 'rash', 'melanoma', 'mole', 
      'sunburn', 'hyperpigmentation', 'dryness', 'irritation'
    ];
    
    // Simple keyword extraction
    for (const keyword of skinKeywords) {
      if (analysisText.toLowerCase().includes(keyword) && 
          !conditions.some(condition => condition.toLowerCase().includes(keyword))) {
        
        // Find the sentence containing the keyword
        const sentences = analysisText.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            conditions.push(sentence.trim());
            break;
          }
        }
      }
    }
    
    return [...new Set(conditions)]; // Remove duplicates
  } catch (error) {
    console.error('Error extracting skin conditions:', error);
    return [];
  }
}

/**
 * Extract severity score from analysis text
 */
function extractSeverityScore(analysisText: string): number | undefined {
  try {
    // Look for score pattern like "severity score: 7/10" or "severity of 7 out of 10"
    const scoreMatch = analysisText.match(/(?:severity|condition)\s+(?:score|rating|level)\s*(?:is|of|:|=)?\s*(\d+)(?:\s*\/\s*|\s+out\s+of\s+)(?:10|ten)/i);
    
    if (scoreMatch && scoreMatch[1]) {
      const score = parseInt(scoreMatch[1], 10);
      if (!isNaN(score) && score >= 1 && score <= 10) {
        return score;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting severity score:', error);
    return undefined;
  }
}

/**
 * Determine if dermatologist recommendation is needed
 */
function shouldRecommendDermatologist(analysisText: string, concerns: string[]): boolean {
  // Keywords that indicate potential need for dermatologist visit
  const dermatologistKeywords = [
    'dermatologist', 'skin specialist', 'medical attention', 
    'professional opinion', 'medical consultation', 'doctor',
    'healthcare provider', 'medical professional', 'seek treatment',
    'medical advice', 'professional evaluation'
  ];
  
  // Look for recommendation in the analysis text
  for (const keyword of dermatologistKeywords) {
    if (analysisText.toLowerCase().includes(keyword)) {
      return true;
    }
  }
  
  // Check if any concerns mention dermatologist
  for (const concern of concerns) {
    for (const keyword of dermatologistKeywords) {
      if (concern.toLowerCase().includes(keyword)) {
        return true;
      }
    }
  }
  
  // Conservative approach: return true for potentially serious conditions
  const seriousConditions = [
    'melanoma', 'basal cell', 'squamous cell', 'skin cancer', 
    'infection', 'severe', 'spreading', 'worsen', 'ulcer'
  ];
  
  for (const condition of seriousConditions) {
    if (analysisText.toLowerCase().includes(condition)) {
      return true;
    }
  }
  
  // Return true if severity score is 7 or higher (if we can extract it)
  const severityScore = extractSeverityScore(analysisText);
  if (severityScore !== undefined && severityScore >= 7) {
    return true;
  }
  
  return false;
} 