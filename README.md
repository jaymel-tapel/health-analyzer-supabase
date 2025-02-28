# Health Analyzer API with Supabase Edge Functions

A comprehensive health analysis backend using Supabase Edge Functions and OpenAI's vision capabilities to provide insights on various health aspects.

## Features

- **Dental Analysis**: Analyze dental images to identify potential issues
- **Skin Condition Tracking**: Track skin conditions and get insights
- **Posture Analysis**: Get feedback and exercise recommendations based on posture images
- **Food Nutrition Analysis**: Calculate nutritional breakdown from food images
- **Stool Health Analysis**: Analyze stool images for health indicators

## Project Structure

```
health-analyzer-supabase/
├── .env                  # Environment variables (git-ignored)
├── .env.example          # Example environment variables template
├── start-dev.sh          # Script to start local development server
├── deploy-functions.sh   # Script to deploy all Edge Functions
├── migrate-db.sh         # Script to run database migrations
├── supabase/
│   ├── functions/        # Edge Functions
│   │   ├── _shared/      # Shared utilities and types
│   │   ├── dental-check/ # Dental analysis function
│   │   ├── skin-tracker/ # Skin condition analysis function
│   │   ├── posture-check/# Posture analysis function
│   │   ├── nutri-snap/   # Food nutrition analysis function
│   │   └── poop-health/  # Stool health analysis function
│   └── migrations/       # Database migrations
└── todo.md               # Project todo list
```

## Getting Started

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/)
- OpenAI API key
- Supabase project with service role key

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your environment variables:
   ```
   DB_URL=your_supabase_url
   SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   NODE_ENV=development
   CORS_ORIGIN=*
   ```

3. Link to your Supabase project:
   ```bash
   supabase link --project-ref your_project_ref
   ```

4. Set up environment secrets for your Supabase project:
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key
   supabase secrets set DB_URL=your_supabase_url
   supabase secrets set SERVICE_ROLE_KEY=your_service_role_key
   ```

5. Run database migrations:
   ```bash
   ./migrate-db.sh
   ```

### Development

To start the local development server:

```bash
./start-dev.sh
```

### Deployment

To deploy all Edge Functions:

```bash
./deploy-functions.sh
```

## API Endpoints

All endpoints accept POST requests with the following format:

```json
{
  "image": "base64_encoded_image_data"
}
```

- `/dental-check` - Analyze dental images
- `/skin-tracker` - Analyze skin conditions
- `/posture-check` - Analyze posture
- `/nutri-snap` - Analyze food nutrition
- `/poop-health` - Analyze stool health

## Sample Responses

### Dental Check Response

```json
{
  "success": true,
  "data": {
    "analysis": {
      "issues": ["Mild gingivitis", "Potential early enamel erosion"],
      "recommendations": [
        "Regular brushing with fluoride toothpaste",
        "Daily flossing",
        "Consider a dental checkup within the next 3 months"
      ],
      "overall_health": "Good with minor concerns",
      "urgency_level": "Low"
    },
    "created_at": "2023-06-15T12:34:56.789Z",
    "id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
  }
}
```

### Skin Tracker Response

```json
{
  "success": true,
  "data": {
    "analysis": {
      "condition_type": "Rash",
      "severity": "Mild",
      "characteristics": ["Red", "Slightly raised", "Non-scaly"],
      "possible_causes": ["Contact dermatitis", "Mild allergic reaction"],
      "recommendations": [
        "Keep the area clean and dry",
        "Avoid potential irritants",
        "Apply over-the-counter hydrocortisone if not improving"
      ],
      "should_see_doctor": false
    },
    "created_at": "2023-06-16T10:22:33.456Z",
    "id": "b2c3d4e5-f6a7-8901-bcde-2345678901cd"
  }
}
```

### Posture Check Response

```json
{
  "success": true,
  "data": {
    "analysis": {
      "posture_issues": ["Forward head posture", "Rounded shoulders"],
      "severity": "Moderate",
      "exercises": [
        {
          "name": "Chin tucks",
          "description": "Sit up straight, pull your chin back creating a 'double chin', hold for 5 seconds. Repeat 10 times, 3 sets daily."
        },
        {
          "name": "Doorway chest stretch",
          "description": "Stand in a doorway with arms on the frame at 90 degrees, step forward with one foot and lean forward to feel a stretch in the chest. Hold for 30 seconds, repeat 3 times."
        }
      ],
      "recommendations": [
        "Take frequent breaks from sitting",
        "Adjust computer screen to eye level",
        "Consider an ergonomic chair"
      ]
    },
    "created_at": "2023-06-17T15:45:12.789Z",
    "id": "c3d4e5f6-a7b8-9012-cdef-3456789012de"
  }
}
```

### Nutri-Snap Response

```json
{
  "success": true,
  "data": {
    "analysis": {
      "food_items": ["Grilled chicken breast", "Quinoa", "Steamed broccoli", "Olive oil"],
      "nutritional_info": {
        "calories": 420,
        "protein": 35,
        "carbs": 30,
        "fat": 15,
        "fiber": 8
      },
      "health_score": 8.5,
      "recommendations": [
        "Well-balanced meal with good protein content",
        "Consider adding some healthy fats like avocado",
        "Good portion control"
      ]
    },
    "created_at": "2023-06-18T19:12:45.123Z",
    "id": "d4e5f6a7-b8c9-0123-defg-456789012345"
  }
}
```

### Poop Health Response

```json
{
  "success": true,
  "data": {
    "analysis": {
      "bristol_type": 4,
      "color": "Medium brown",
      "abnormalities": [],
      "hydration_level": "Well hydrated",
      "recommendations": [
        "Normal, healthy stool",
        "Continue maintaining good hydration",
        "Current fiber intake appears adequate"
      ],
      "should_consult_doctor": false
    },
    "created_at": "2023-06-19T08:30:15.987Z",
    "id": "e5f6a7b8-c9d0-1234-efgh-5678901234ef"
  }
}
```

## Database Schema

The project uses the following database tables:

- `analysis_results` - Stores all analysis results
- `dental_analyses` - Stores dental analysis results
- `skin_analyses` - Stores skin analysis results
- `posture_analyses` - Stores posture analysis results
- `nutrition_analyses` - Stores food nutrition analysis results
- `stool_analyses` - Stores stool health analysis results

## License

This project is licensed under the MIT License - see the LICENSE file for details. 