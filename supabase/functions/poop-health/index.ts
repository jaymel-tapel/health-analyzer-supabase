import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { analyzeImage, parseAnalysisResults } from '../_shared/openai.ts';
import { errorResponse, successResponse, validateRequiredFields, logError } from '../_shared/utils.ts';
import { poopHealthPrompt } from '../_shared/prompts.ts';
import { HealthAnalysisRequest, PoopHealthResponse } from '../_shared/types.ts';
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
    const analysisResult = await analyzeImage(requestData.image, poopHealthPrompt);
    
    // Return error if analysis was unsuccessful
    if (!analysisResult.success) {
      return errorResponse(`Unable to analyze the stool image: ${analysisResult.text}`, 400);
    }
    
    // Parse the analysis results
    const parsedResults = parseAnalysisResults(analysisResult.text);
    
    // Extract stool-specific information
    const poopResponse: PoopHealthResponse = {
      ...parsedResults,
      created_at: new Date().toISOString(),
      stoolType: extractBristolType(analysisResult.text),
      abnormalities: extractAbnormalities(analysisResult.text),
      hydrationIndicator: extractHydrationLevel(analysisResult.text),
      doctorConsultationRecommended: shouldRecommendDoctor(analysisResult.text, parsedResults.concerns),
      rawAnalysis: analysisResult.text, // Add raw analysis for database storage
    };
    
    // Store analysis results in database
    if (requestData.userId) {
      try {
        const storageResult = await storeAnalysisResults(
          'stool',
          poopResponse,
          'stool_analyses',
          requestData.userId
        );
        
        if (storageResult) {
          poopResponse.id = storageResult.id;
        }
        
        // Find nearby gastroenterologists if requested
        if (requestData.location && requestData.findProviders) {
          const nearbyClinics = await findNearbyProviders(
            'gastroenterologist',
            requestData.location.latitude,
            requestData.location.longitude
          );
          
          if (nearbyClinics) {
            poopResponse.nearbyProviders = nearbyClinics;
          }
        }
      } catch (dbError) {
        // Log database error but don't fail the request
        logError('poop-health-db', dbError as Error);
        console.error('Error storing stool analysis results:', dbError);
      }
    }
    
    // Return successful response
    return successResponse(poopResponse);
  } catch (error) {
    logError('poop-health', error as Error);
    return errorResponse('Error analyzing stool image: ' + (error as Error).message, 500);
  }
});

/**
 * Extract Bristol stool scale type from analysis text
 */
export function extractBristolType(analysisText: string): number | undefined {
  try {
    // Look for Bristol scale mention
    const bristolMatch = analysisText.match(/(?:bristol(?:\s+stool)?\s+(?:scale|type|category|class)(?:\s+classification)?|stool\s+type)(?:\s+is|\s*:\s*|\s+-\s*|\s+appears\s+to\s+be\s+)(?:type\s+)?(\d+)/i);
    
    if (bristolMatch && bristolMatch[1]) {
      const type = parseInt(bristolMatch[1], 10);
      // Bristol scale is 1-7
      if (!isNaN(type) && type >= 1 && type <= 7) {
        return type;
      }
    }
    
    // Try alternative wordings
    const keywordMatch = analysisText.match(/(?:type|category|class)(?:\s+is|\s*:\s*|\s+-\s*|\s+appears\s+to\s+be\s+)(?:type\s+)?(\d+)(?:\s+on\s+the\s+bristol)/i);
    if (keywordMatch && keywordMatch[1]) {
      const type = parseInt(keywordMatch[1], 10);
      if (!isNaN(type) && type >= 1 && type <= 7) {
        return type;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting Bristol stool type:', error);
    return undefined;
  }
}

/**
 * Extract abnormalities from analysis text
 */
export function extractAbnormalities(analysisText: string): string[] {
  try {
    const abnormalities: string[] = [];
    
    // Look for abnormalities in the text
    const abnormalitiesMatch = analysisText.match(/(?:abnormalities|unusual\s+features|concerning\s+features|notable\s+findings|issues|problems):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
    if (abnormalitiesMatch && abnormalitiesMatch[1]) {
      abnormalities.push(
        ...abnormalitiesMatch[1]
          .split('\n')
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      );
    }
    
    // Look for keywords that might indicate abnormalities
    const abnormalityKeywords = [
      'blood', 'mucus', 'pus', 'undigested', 'parasite', 'worm', 
      'black', 'tarry', 'pale', 'greasy', 'floating', 'foul', 
      'diarrhea', 'constipation', 'irregular', 'abnormal'
    ];
    
    // Simple keyword extraction
    for (const keyword of abnormalityKeywords) {
      if (analysisText.toLowerCase().includes(keyword) && 
          !abnormalities.some(abnormality => abnormality.toLowerCase().includes(keyword))) {
        
        // Find the sentence containing the keyword
        const sentences = analysisText.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(keyword)) {
            abnormalities.push(sentence.trim());
            break;
          }
        }
      }
    }
    
    return [...new Set(abnormalities)]; // Remove duplicates
  } catch (error) {
    console.error('Error extracting abnormalities:', error);
    return [];
  }
}

/**
 * Extract hydration level from analysis text
 */
export function extractHydrationLevel(analysisText: string): 'low' | 'normal' | 'good' | undefined {
  try {
    // Look for hydration mentions
    const hydrationMatch = analysisText.match(/(?:hydration|water\s+intake|fluid\s+intake)(?:\s+appears|\s+seems|\s+is|\s+looks|\s+level|\s+status|\s+indicator)?(?:\s+to\s+be)?(?:\s+is)?[\s:]*(\w+)/i);
    
    if (hydrationMatch && hydrationMatch[1]) {
      const hydrationText = hydrationMatch[1].toLowerCase();
      
      // Map common terms to our three categories
      if (hydrationText.match(/(?:low|inadequate|poor|insufficient|dehydrat)/)) {
        return 'low';
      } else if (hydrationText.match(/(?:normal|adequate|sufficient|okay|ok|fine)/)) {
        return 'normal';
      } else if (hydrationText.match(/(?:good|excellent|great|optimal|well|high)/)) {
        return 'good';
      }
    }
    
    // Look for dehydration mentions as an alternative approach
    if (analysisText.toLowerCase().includes('dehydrat')) {
      return 'low';
    } else if (analysisText.toLowerCase().includes('well hydrated')) {
      return 'good';
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting hydration level:', error);
    return undefined;
  }
}

/**
 * Determine if doctor consultation is recommended
 */
export function shouldRecommendDoctor(analysisText: string, concerns: string[]): boolean {
  // Keywords that indicate potential need for doctor visit
  const doctorKeywords = [
    'consult', 'doctor', 'physician', 'medical', 'healthcare provider', 
    'professional', 'evaluation', 'clinical', 'specialist', 'gastroenterologist',
    'visit', 'appointment', 'checkup', 'check-up', 'attention'
  ];
  
  // Look for recommendation in the analysis text
  for (const keyword of doctorKeywords) {
    if (analysisText.toLowerCase().includes(keyword)) {
      return true;
    }
  }
  
  // Check if any concerns mention doctor
  for (const concern of concerns) {
    for (const keyword of doctorKeywords) {
      if (concern.toLowerCase().includes(keyword)) {
        return true;
      }
    }
  }
  
  // Abnormality keywords that almost always warrant medical attention
  const severeKeywords = [
    'blood', 'bleeding', 'black stool', 'tarry', 'parasite', 
    'severe', 'extreme', 'persistent', 'chronic', 'continuous'
  ];
  
  for (const keyword of severeKeywords) {
    if (analysisText.toLowerCase().includes(keyword)) {
      return true;
    }
  }
  
  // Conservative approach: return true if Bristol scale is extreme (1 or 7)
  const bristolType = extractBristolType(analysisText);
  if (bristolType === 1 || bristolType === 7) {
    return true;
  }
  
  return false;
} 