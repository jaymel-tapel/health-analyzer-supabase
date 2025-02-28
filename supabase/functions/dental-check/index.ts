import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { analyzeImage, parseAnalysisResults } from '../_shared/openai.ts';
import { errorResponse, successResponse, validateRequiredFields, logError } from '../_shared/utils.ts';
import { dentalCheckPrompt } from '../_shared/prompts.ts';
import { DentalCheckResponse, HealthAnalysisRequest } from '../_shared/types.ts';
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
    const analysisResult = await analyzeImage(requestData.image, dentalCheckPrompt);
    
    // Return error if analysis was unsuccessful
    if (!analysisResult.success) {
      return errorResponse(`Unable to analyze the dental image: ${analysisResult.text}`, 400);
    }
    
    // Parse the analysis results
    const parsedResults = parseAnalysisResults(analysisResult.text);
    
    // Extract dental-specific information
    const dentalResponse: DentalCheckResponse = {
      ...parsedResults,
      created_at: new Date().toISOString(),
      dentalIssues: extractDentalIssues(analysisResult.text),
      oralHygieneScore: extractOralHygieneScore(analysisResult.text),
      dentistRecommended: shouldRecommendDentist(analysisResult.text, parsedResults.concerns),
      rawAnalysis: analysisResult.text, // Add raw analysis for database storage
    };
    
    // Store analysis results in database
    if (requestData.userId) {
      try {
        const storageResult = await storeAnalysisResults(
          'dental',
          dentalResponse,
          'dental_analyses',
          requestData.userId
        );
        
        if (storageResult) {
          dentalResponse.id = storageResult.id;
        }
        
        // Find nearby dentists if requested
        if (requestData.location && requestData.findProviders) {
          const nearbyDentists = await findNearbyProviders(
            'dentist',
            requestData.location.latitude,
            requestData.location.longitude
          );
          
          if (nearbyDentists) {
            dentalResponse.nearbyProviders = nearbyDentists;
          }
        }
      } catch (dbError) {
        // Log database error but don't fail the request
        logError('dental-check-db', dbError as Error);
        console.error('Error storing dental analysis results:', dbError);
      }
    }
    
    // Return successful response
    return successResponse(dentalResponse);
  } catch (error) {
    logError('dental-check', error as Error);
    return errorResponse('Error analyzing dental image: ' + (error as Error).message, 500);
  }
});

/**
 * Extract dental issues from analysis text
 */
export function extractDentalIssues(analysisText: string): string[] {
  try {
    const issues: string[] = [];
    
    // Look for dental issues in the text
    const dentaIssuesMatch = analysisText.match(/(?:dental issues|problems|concerns):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
    if (dentaIssuesMatch && dentaIssuesMatch[1]) {
      issues.push(
        ...dentaIssuesMatch[1]
          .split('\n')
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      );
    }
    
    // Look for keywords that might indicate dental issues
    const dentalKeywords = [
      'cavity', 'cavities', 'decay', 'plaque', 'tartar', 'gingivitis', 
      'periodontal', 'discoloration', 'staining', 'misalignment', 
      'crooked', 'wisdom tooth', 'inflamed gums', 'receding gums'
    ];
    
    // Simple keyword extraction (could be improved with NLP)
    for (const keyword of dentalKeywords) {
      if (analysisText.toLowerCase().includes(keyword) && 
          !issues.some(issue => issue.toLowerCase().includes(keyword))) {
        
        // Find the sentence containing the keyword
        const sentences = analysisText.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            issues.push(sentence.trim());
            break;
          }
        }
      }
    }
    
    return [...new Set(issues)]; // Remove duplicates
  } catch (error) {
    console.error('Error extracting dental issues:', error);
    return [];
  }
}

/**
 * Extract oral hygiene score from analysis text
 */
export function extractOralHygieneScore(analysisText: string): number | undefined {
  try {
    // Look for score pattern like "score: 7/10" or "score of 7 out of 10"
    const scoreMatch = analysisText.match(/(?:oral hygiene|hygiene)\s+score\s*(?:is|of|:|=)?\s*(\d+)(?:\s*\/\s*|\s+out\s+of\s+)(?:10|ten)/i);
    
    if (scoreMatch && scoreMatch[1]) {
      const score = parseInt(scoreMatch[1], 10);
      if (!isNaN(score) && score >= 1 && score <= 10) {
        return score;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting oral hygiene score:', error);
    return undefined;
  }
}

/**
 * Determine if dentist recommendation is needed
 */
export function shouldRecommendDentist(analysisText: string, concerns: string[]): boolean {
  // Keywords that indicate potential need for dental visit
  const dentistVisitKeywords = [
    'visit a dentist', 'dental professional', 'dentist', 'dental checkup',
    'dental visit', 'professional cleaning', 'dental consultation',
    'see a dentist', 'dental attention', 'dental care needed',
    'professional examination', 'dental treatment'
  ];
  
  // Look for recommendation in the analysis text
  for (const keyword of dentistVisitKeywords) {
    if (analysisText.toLowerCase().includes(keyword)) {
      return true;
    }
  }
  
  // Check if any concerns mention dental visit
  for (const concern of concerns) {
    for (const keyword of dentistVisitKeywords) {
      if (concern.toLowerCase().includes(keyword)) {
        return true;
      }
    }
  }
  
  // Conservative approach: return true if more than 3 concerns
  if (concerns.length >= 3) {
    return true;
  }
  
  return false;
} 