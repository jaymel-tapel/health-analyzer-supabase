/// <reference lib="deno.ns" />

import { OpenAIAnalysisResponse } from './types.ts';
import { logError } from './utils.ts';

/**
 * Analyze an image using OpenAI's vision model
 * 
 * @param imageBase64 Base64 encoded image data
 * @param prompt System prompt for OpenAI analysis
 * @returns Object with analysis text and success status
 */
export async function analyzeImage(imageBase64: string, prompt: string): Promise<{ text: string; success: boolean }> {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }
    
    const result = await response.json() as OpenAIAnalysisResponse;
    
    if (!result.choices || result.choices.length === 0) {
      return { text: 'No analysis results returned from OpenAI', success: false };
    }
    
    const content = result.choices[0].message.content;
    
    // Check if the content indicates an inability to analyze the image
    // Expanded list of patterns that indicate analysis failure
    const unableToAnalyzePatterns = [
      // Direct statements about inability
      'unable to analyze',
      'cannot analyze',
      'could not analyze',
      'not able to analyze',
      'can\'t analyze',
      'cannot see',
      'cannot identify',
      'cannot determine',
      'unable to identify',
      'unable to see',
      'unable to assess',
      'unable to provide',
      'cannot provide',
      'cannot properly analyze',
      'cannot make out',
      
      // Image quality issues
      'unclear image',
      'image is unclear',
      'image is too blurry',
      'blurry image',
      'poor quality image',
      'low resolution',
      'insufficient detail',
      'not clear enough',
      'image quality is',
      'difficult to see',
      
      // Content visibility issues
      'no visible',
      'not visible',
      'nothing visible',
      'cannot visualize',
      'cannot observe',
      'not showing',
      'not present in',
      'insufficient visibility',
      
      // Inappropriate content
      'inappropriate content',
      'inappropriate image',
      'offensive content',
      'violates guidelines',
      'not appropriate',
      
      // Request for better image
      'better image is required',
      'clearer image',
      'higher quality image',
      'need a better',
      'please provide a clearer'
    ];
    
    for (const pattern of unableToAnalyzePatterns) {
      if (content.toLowerCase().includes(pattern)) {
        return { text: content, success: false };
      }
    }
    
    return { text: content, success: true };
  } catch (error) {
    logError('analyzeImage', error as Error);
    return { text: (error as Error).message, success: false };
  }
}

/**
 * Parse structured data from the OpenAI analysis text
 * 
 * @param analysisText Full text from OpenAI analysis
 * @returns Parsed structure with main analysis, concerns and recommendations
 */
export function parseAnalysisResults(analysisText: string): {
  analysis: string;
  concerns: string[];
  recommendations: string[];
} {
  try {
    // Default structure
    const result = {
      analysis: analysisText,
      concerns: [] as string[],
      recommendations: [] as string[],
    };
    
    // Try to extract sections using regex patterns
    const concernsMatch = analysisText.match(/(?:concerns|potential concerns|issues|potential issues):?.*?\n((?:.+\n?)+?)(?:\n\n|\n[A-Za-z]+:|\Z)/i);
    if (concernsMatch && concernsMatch[1]) {
      result.concerns = concernsMatch[1]
        .split('\n')
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean);
    }
    
    const recommendationsMatch = analysisText.match(/(?:recommendations|suggested actions|advice|suggestions):?.*?\n((?:.+\n?)+?)(?:\n\n|\Z)/i);
    if (recommendationsMatch && recommendationsMatch[1]) {
      result.recommendations = recommendationsMatch[1]
        .split('\n')
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(Boolean);
    }
    
    return result;
  } catch (error) {
    logError('parseAnalysisResults', error as Error);
    // Return original text as fallback
    return {
      analysis: analysisText,
      concerns: [] as string[],
      recommendations: [] as string[],
    };
  }
} 