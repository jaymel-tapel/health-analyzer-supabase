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