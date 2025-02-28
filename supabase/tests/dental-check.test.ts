import { assertEquals, assertExists } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { parseAnalysisResults } from "../functions/_shared/openai.ts";
import { 
  extractDentalIssues, 
  extractOralHygieneScore, 
  shouldRecommendDentist 
} from "../functions/dental-check/index.ts";

// Mock OpenAI response text
const mockAnalysisText = `
Assessment:
The image shows teeth with some visible issues. The gums appear slightly reddened, which could indicate mild gingivitis. There's visible plaque buildup on the lower front teeth. One tooth appears to have a small cavity forming.

Concerns:
- Mild gingivitis indicated by reddened gums
- Plaque buildup on lower teeth
- Potential early cavity on one tooth
- Some staining visible on several teeth

Recommendations:
- Improve brushing technique, especially on lower front teeth
- Regular flossing to reduce gum inflammation
- Consider a dental checkup to address the potential cavity
- Use a fluoride mouthwash to strengthen enamel

Based on what I can see, I'd give this an oral hygiene score of 6/10. A professional dental cleaning would be beneficial.
`;

// Unit tests
Deno.test("parseAnalysisResults extracts structured data", () => {
  const result = parseAnalysisResults(mockAnalysisText);
  
  assertEquals(result.analysis, mockAnalysisText);
  assertEquals(result.concerns.length, 4);
  assertEquals(result.recommendations.length, 4);
  
  assertEquals(result.concerns[0], "Mild gingivitis indicated by reddened gums");
  assertEquals(result.recommendations[2], "Consider a dental checkup to address the potential cavity");
});

Deno.test("extractDentalIssues finds dental problems", () => {
  const issues = extractDentalIssues(mockAnalysisText);
  
  assertExists(issues);
  assert(issues.length >= 3, "Should extract at least 3 dental issues");
  
  // Check if specific issues were found
  assert(issues.some(issue => issue.toLowerCase().includes("gingivitis")), 
         "Should detect gingivitis");
  assert(issues.some(issue => issue.toLowerCase().includes("plaque")), 
         "Should detect plaque");
  assert(issues.some(issue => issue.toLowerCase().includes("cavity")), 
         "Should detect cavity");
});

Deno.test("extractOralHygieneScore parses score correctly", () => {
  const score = extractOralHygieneScore(mockAnalysisText);
  
  assertExists(score);
  assertEquals(score, 6);
});

Deno.test("shouldRecommendDentist detects when dentist is needed", () => {
  const concerns = [
    "Mild gingivitis indicated by reddened gums",
    "Plaque buildup on lower teeth",
    "Potential early cavity on one tooth",
  ];
  
  const recommendation = shouldRecommendDentist(mockAnalysisText, concerns);
  assertEquals(recommendation, true);
});

// Helper function for assertions
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
} 