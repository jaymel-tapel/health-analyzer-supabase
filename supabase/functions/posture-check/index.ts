import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { analyzeImage, parseAnalysisResults } from '../_shared/openai.ts';
import { errorResponse, successResponse, validateRequiredFields, logError } from '../_shared/utils.ts';
import { postureCheckPrompt } from '../_shared/prompts.ts';
import { HealthAnalysisRequest, PostureCheckResponse } from '../_shared/types.ts';
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
    const analysisResult = await analyzeImage(requestData.image, postureCheckPrompt);
    
    // Return error if analysis was unsuccessful
    if (!analysisResult.success) {
      return errorResponse(`Unable to analyze the posture image: ${analysisResult.text}`, 400);
    }
    
    // Parse the analysis results
    const parsedResults = parseAnalysisResults(analysisResult.text);
    
    // Extract posture-specific information
    const postureResponse: PostureCheckResponse = {
      ...parsedResults,
      created_at: new Date().toISOString(),
      postureIssues: extractPostureIssues(analysisResult.text),
      postureScore: extractPostureScore(analysisResult.text),
      exerciseRecommendations: extractExerciseRecommendations(analysisResult.text),
      rawAnalysis: analysisResult.text, // Add raw analysis for database storage
    };
    
    // Store analysis results in database
    if (requestData.userId) {
      try {
        const storageResult = await storeAnalysisResults(
          'posture',
          postureResponse,
          'posture_analyses',
          requestData.userId
        );
        
        if (storageResult) {
          postureResponse.id = storageResult.id;
        }
        
        // Find nearby physiotherapists if requested
        if (requestData.location && requestData.findProviders) {
          const nearbyPhysiotherapists = await findNearbyProviders(
            'physiotherapist',
            requestData.location.latitude,
            requestData.location.longitude
          );
          
          if (nearbyPhysiotherapists) {
            postureResponse.nearbyProviders = nearbyPhysiotherapists;
          }
        }
      } catch (dbError) {
        // Log database error but don't fail the request
        logError('posture-check-db', dbError as Error);
        console.error('Error storing posture analysis results:', dbError);
      }
    }
    
    // Return successful response
    return successResponse(postureResponse);
  } catch (error) {
    logError('posture-check', error as Error);
    return errorResponse('Error analyzing posture image: ' + (error as Error).message, 500);
  }
});

/**
 * Extract posture issues from analysis text
 */
export function extractPostureIssues(analysisText: string): string[] {
  try {
    const issues: string[] = [];
    
    // Look for posture issues in the text
    const postureIssuesMatch = analysisText.match(/(?:posture issues|problems|imbalances|concerns):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
    if (postureIssuesMatch && postureIssuesMatch[1]) {
      issues.push(
        ...postureIssuesMatch[1]
          .split('\n')
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      );
    }
    
    // Look for keywords that might indicate posture issues
    const postureKeywords = [
      'forward head', 'rounded shoulders', 'kyphosis', 'lordosis', 'scoliosis', 
      'anterior pelvic tilt', 'posterior pelvic tilt', 'hunched', 'slouched', 
      'uneven shoulders', 'head tilt', 'neck strain', 'text neck', 'uneven hips',
      'flat back', 'swayback', 'military posture', 'misalignment'
    ];
    
    // Simple keyword extraction
    for (const keyword of postureKeywords) {
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
    console.error('Error extracting posture issues:', error);
    return [];
  }
}

/**
 * Extract posture score from analysis text
 */
export function extractPostureScore(analysisText: string): number | undefined {
  try {
    // Look for score pattern like "posture score: 7/10" or "score of 7 out of 10"
    const scoreMatch = analysisText.match(/(?:posture)\s+(?:score|rating)\s*(?:is|of|:|=)?\s*(\d+)(?:\s*\/\s*|\s+out\s+of\s+)(?:10|ten)/i);
    
    if (scoreMatch && scoreMatch[1]) {
      const score = parseInt(scoreMatch[1], 10);
      if (!isNaN(score) && score >= 1 && score <= 10) {
        return score;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting posture score:', error);
    return undefined;
  }
}

/**
 * Extract exercise recommendations from analysis text
 */
export function extractExerciseRecommendations(analysisText: string): string[] {
  try {
    const exercises: string[] = [];
    
    // Look for exercise recommendations in the text
    const exerciseMatch = analysisText.match(/(?:exercise recommendations|exercises|stretches|recommended exercises):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
    if (exerciseMatch && exerciseMatch[1]) {
      exercises.push(
        ...exerciseMatch[1]
          .split('\n')
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      );
    }
    
    // If no specific exercise section is found but exercises are mentioned in recommendations
    if (exercises.length === 0) {
      const recommendations = analysisText.match(/recommendations:?.*?\n((?:.+\n?)+?)(?:\n\n|\Z)/i);
      if (recommendations && recommendations[1]) {
        const recLines = recommendations[1]
          .split('\n')
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(Boolean);
        
        // Filter for lines that might be exercises
        const exerciseKeywords = [
          'exercise', 'stretch', 'strengthen', 'posture', 'workout',
          'yoga', 'pilates', 'mobility', 'flexibility', 'core', 
          'shoulders', 'neck', 'back', 'spine', 'chest'
        ];
        
        for (const line of recLines) {
          for (const keyword of exerciseKeywords) {
            if (line.toLowerCase().includes(keyword)) {
              exercises.push(line);
              break;
            }
          }
        }
      }
    }
    
    return [...new Set(exercises)]; // Remove duplicates
  } catch (error) {
    console.error('Error extracting exercise recommendations:', error);
    return [];
  }
} 