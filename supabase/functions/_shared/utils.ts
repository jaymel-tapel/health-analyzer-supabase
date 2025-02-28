import { corsHeaders } from './cors.ts';

/**
 * Format a successful response with proper headers
 * 
 * @param data Response data to be wrapped in success envelope
 * @param status HTTP status code for the response
 * @returns Formatted Response object
 */
export function successResponse(data: any, status = 200) {
  // Ensure the response has consistent envelope format
  // This guarantees frontend won't break due to missing fields
  if (data && typeof data === 'object') {
    // Add created_at timestamp if not present
    if (!data.created_at) {
      data.created_at = new Date().toISOString();
    }
    
    // Ensure rawAnalysis is preserved if it exists
    if (data.rawAnalysis) {
      data.rawAnalysis = data.rawAnalysis;
    }

    // Ensure all array properties have at least empty arrays
    // rather than undefined values to prevent frontend errors
    if (!data.concerns) data.concerns = [];
    if (!data.recommendations) data.recommendations = [];
    
    // Set defaults for type-specific properties to prevent null/undefined
    if ('skinConditions' in data && !data.skinConditions) data.skinConditions = [];
    if ('dentalIssues' in data && !data.dentalIssues) data.dentalIssues = [];
    if ('postureIssues' in data && !data.postureIssues) data.postureIssues = [];
    if ('exerciseRecommendations' in data && !data.exerciseRecommendations) data.exerciseRecommendations = [];
    if ('foodItems' in data && !data.foodItems) data.foodItems = [];
    if ('abnormalities' in data && !data.abnormalities) data.abnormalities = [];
    
    // Ensure nutritionalInfo is always an object if present in type
    if ('nutritionalInfo' in data && !data.nutritionalInfo) {
      data.nutritionalInfo = {};
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

/**
 * Format an error response with proper headers
 * 
 * @param message Error message
 * @param status HTTP status code for the error
 * @returns Formatted Response object
 */
export function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

/**
 * Validate that required fields are present in the request
 */
export function validateRequiredFields(obj: Record<string, any>, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Safely parse JSON with error handling
 */
export function safeParseJSON(json: string): [any, Error | null] {
  try {
    return [JSON.parse(json), null];
  } catch (error) {
    return [null, error as Error];
  }
}

/**
 * Log errors with standardized format
 */
export function logError(functionName: string, error: Error): void {
  console.error(`[ERROR][${functionName}] ${error.message}`, error.stack);
} 