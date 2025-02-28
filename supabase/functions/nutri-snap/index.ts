import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { analyzeImage, parseAnalysisResults } from '../_shared/openai.ts';
import { errorResponse, successResponse, validateRequiredFields, logError } from '../_shared/utils.ts';
import { nutriSnapPrompt } from '../_shared/prompts.ts';
import { HealthAnalysisRequest, NutriSnapResponse } from '../_shared/types.ts';
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
    const analysisResult = await analyzeImage(requestData.image, nutriSnapPrompt);
    
    // Return error if analysis was unsuccessful
    if (!analysisResult.success) {
      return errorResponse(`Unable to analyze the food image: ${analysisResult.text}`, 400);
    }
    
    // Parse the analysis results
    const parsedResults = parseAnalysisResults(analysisResult.text);
    
    // Extract nutrition-specific information
    const nutriResponse: NutriSnapResponse = {
      ...parsedResults,
      created_at: new Date().toISOString(),
      foodItems: extractFoodItems(analysisResult.text),
      nutritionalInfo: extractNutritionalInfo(analysisResult.text),
      healthScore: extractHealthScore(analysisResult.text),
      rawAnalysis: analysisResult.text, // Add raw analysis for database storage
    };
    
    // Store analysis results in database
    if (requestData.userId) {
      try {
        const storageResult = await storeAnalysisResults(
          'nutrition',
          nutriResponse,
          'nutrition_analyses',
          requestData.userId
        );
        
        if (storageResult) {
          nutriResponse.id = storageResult.id;
        }
        
        // Find nearby nutritionists if requested
        if (requestData.location && requestData.findProviders) {
          const nearbyNutritionists = await findNearbyProviders(
            'nutritionist',
            requestData.location.latitude,
            requestData.location.longitude
          );
          
          if (nearbyNutritionists) {
            nutriResponse.nearbyProviders = nearbyNutritionists;
          }
        }
      } catch (dbError) {
        // Log database error but don't fail the request
        logError('nutri-snap-db', dbError as Error);
        console.error('Error storing nutrition analysis results:', dbError);
      }
    }
    
    // Return successful response
    return successResponse(nutriResponse);
  } catch (error) {
    logError('nutri-snap', error as Error);
    return errorResponse('Error analyzing food image: ' + (error as Error).message, 500);
  }
});

/**
 * Extract food items from analysis text
 */
export function extractFoodItems(analysisText: string): string[] {
  try {
    const items: string[] = [];
    
    // Look for food items in the text
    const foodItemsMatch = analysisText.match(/(?:food items|ingredients|contents|meal contains|dish consists of):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
    if (foodItemsMatch && foodItemsMatch[1]) {
      items.push(
        ...foodItemsMatch[1]
          .split('\n')
          .map(line => line.replace(/^-\s*/, '').trim())
          .filter(Boolean)
      );
    }
    
    // If no specific food items section, try to find items in the assessment
    if (items.length === 0) {
      const assessment = analysisText.match(/(?:assessment|analysis|overview):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
      if (assessment && assessment[1]) {
        // Extract food items from sentences like "The meal consists of X, Y, and Z"
        const foodPhrases = [
          "contains", "consists of", "includes", "composed of", 
          "made up of", "visible", "appears to be", "appears to have"
        ];
        
        const sentences = assessment[1].split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          for (const phrase of foodPhrases) {
            if (sentence.toLowerCase().includes(phrase)) {
              // Extract what comes after the phrase
              const parts = sentence.split(new RegExp(`${phrase}\\s+`, 'i'));
              if (parts.length > 1) {
                // Split by commas and "and"
                const foodList = parts[1]
                  .replace(/\.$/, '') // Remove trailing period
                  .split(/,\s*|\s+and\s+|\s*&\s*/) // Split by comma, "and", or "&"
                  .map(item => item.trim())
                  .filter(Boolean);
                
                items.push(...foodList);
              }
              break;
            }
          }
        }
      }
    }
    
    return [...new Set(items)]; // Remove duplicates
  } catch (error) {
    console.error('Error extracting food items:', error);
    return [];
  }
}

/**
 * Extract nutritional information from analysis text
 */
export function extractNutritionalInfo(analysisText: string): {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  vitamins?: Record<string, number>;
} {
  try {
    const nutritionInfo: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      vitamins?: Record<string, number>;
    } = {};
    
    // Extract calories
    const caloriesMatch = analysisText.match(/(?:calories|caloric content|energy content|caloric value)[\s:]*(?:approximately|approx|around|about|estimated at|~)?\s*(\d+)(?:\s*-\s*|\s*to\s*)?\d*\s*(?:kcal|calories)/i);
    if (caloriesMatch && caloriesMatch[1]) {
      nutritionInfo.calories = parseInt(caloriesMatch[1], 10);
    }
    
    // Extract macros using typed keys to avoid linter errors
    type MacroKey = 'protein' | 'carbs' | 'fat' | 'fiber';
    const macroPatterns: Record<MacroKey, RegExp> = {
      protein: /(?:protein)[\s:]*(?:approximately|approx|around|about|estimated at|~)?\s*(\d+)(?:\.\d+)?\s*(?:g|grams)/i,
      carbs: /(?:carbs|carbohydrates)[\s:]*(?:approximately|approx|around|about|estimated at|~)?\s*(\d+)(?:\.\d+)?\s*(?:g|grams)/i,
      fat: /(?:fat|fats)[\s:]*(?:approximately|approx|around|about|estimated at|~)?\s*(\d+)(?:\.\d+)?\s*(?:g|grams)/i,
      fiber: /(?:fiber|fibre)[\s:]*(?:approximately|approx|around|about|estimated at|~)?\s*(\d+)(?:\.\d+)?\s*(?:g|grams)/i
    };
    
    for (const macro of Object.keys(macroPatterns) as MacroKey[]) {
      const match = analysisText.match(macroPatterns[macro]);
      if (match && match[1]) {
        nutritionInfo[macro] = parseInt(match[1], 10);
      }
    }
    
    // Extract vitamins and minerals
    const vitaminSection = analysisText.match(/(?:vitamins|minerals|micronutrients):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
    if (vitaminSection && vitaminSection[1]) {
      const vitamins: Record<string, number> = {};
      
      const vitaminLines = vitaminSection[1]
        .split('\n')
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean);
      
      for (const line of vitaminLines) {
        // Match patterns like "Vitamin C: high" or "Vitamin A (20% DV)"
        const vitaminMatch = line.match(/^(vitamin\s+\w+|calcium|iron|zinc|potassium|magnesium)(?:[:\s-]+|\s*\()(high|medium|low|good|excellent|\d+%)/i);
        if (vitaminMatch) {
          const [, name, value] = vitaminMatch;
          
          // Convert textual ratings to numeric values
          let numericValue = 0;
          if (value.match(/high|excellent/i)) numericValue = 80;
          else if (value.match(/medium|good/i)) numericValue = 50;
          else if (value.match(/low/i)) numericValue = 20;
          else if (value.includes('%')) {
            const percentMatch = value.match(/(\d+)%/);
            if (percentMatch) numericValue = parseInt(percentMatch[1], 10);
          }
          
          vitamins[name.trim().toLowerCase()] = numericValue;
        }
      }
      
      if (Object.keys(vitamins).length > 0) {
        nutritionInfo.vitamins = vitamins;
      }
    }
    
    return nutritionInfo;
  } catch (error) {
    console.error('Error extracting nutritional info:', error);
    return {};
  }
}

/**
 * Extract health score from analysis text
 */
export function extractHealthScore(analysisText: string): number | undefined {
  try {
    // Look for score pattern like "health score: 7/10" or "nutritional score of 7 out of 10"
    const scoreMatch = analysisText.match(/(?:health|nutritional|nutrition)\s+(?:score|rating|value)\s*(?:is|of|:|=)?\s*(\d+)(?:\s*\/\s*|\s+out\s+of\s+)(?:10|ten)/i);
    
    if (scoreMatch && scoreMatch[1]) {
      const score = parseInt(scoreMatch[1], 10);
      if (!isNaN(score) && score >= 1 && score <= 10) {
        return score;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error extracting health score:', error);
    return undefined;
  }
} 