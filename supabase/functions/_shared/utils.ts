import { corsHeaders } from './cors.ts';

/**
 * Format a successful response with proper headers
 */
export function successResponse(data: any, status = 200) {
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