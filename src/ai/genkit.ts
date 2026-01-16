import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const plugins = [];

if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
} else {
  // The app will work, but AI features will fail with a toast error.
  console.warn(
    'GEMINI_API_KEY or GOOGLE_API_KEY is not set in .env file. GenAI features will be disabled.'
  );
}

export const ai = genkit({
  plugins,
  model: 'googleai/gemini-pro',
});
