'use server';

/**
 * @fileOverview A flow for generating questions for interactive games.
 *
 * - generateGameQuestions - A function that generates questions based on subject, topic, difficulty, and quantity.
 * - GenerateGameQuestionsInput - The input type for the function.
 * - GenerateGameQuestionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionSchema = z.object({
  text: z.string().describe('The question text. For Portuguese, it should be a sentence with a blank (___). For Math, it should be an equation like "A + B = ?".'),
  options: z.array(z.string()).length(3).describe('An array of 3 possible answers as strings.'),
  answer: z.string().describe('The correct answer from the options.'),
});

const GenerateGameQuestionsInputSchema = z.object({
  subject: z.enum(['math', 'portuguese']).describe('The subject of the game.'),
  topic: z.string().describe('A specific topic within the subject (e.g., "addition up to 10", "nouns").'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the questions.'),
  numberOfQuestions: z.number().int().min(1).max(20).describe('The number of questions to generate.'),
});
export type GenerateGameQuestionsInput = z.infer<typeof GenerateGameQuestionsInputSchema>;

const GenerateGameQuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema).describe('An array of generated questions.'),
});
export type GenerateGameQuestionsOutput = z.infer<typeof GenerateGameQuestionsOutputSchema>;


export async function generateGameQuestions(input: GenerateGameQuestionsInput): Promise<GenerateGameQuestionsOutput> {
  return generateGameQuestionsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateGameQuestionsPrompt',
  input: { schema: GenerateGameQuestionsInputSchema },
  output: { schema: GenerateGameQuestionsOutputSchema },
  prompt: `You are an expert in creating accessible educational games for children.
  Generate a list of questions for a game based on the following specifications.
  Ensure the questions are varied and appropriate for the given difficulty.
  For math, create simple equations. For example: '5 + 3 = ?'.
  For portuguese, create "fill in the blank" sentences where the blank is '___'. For example: 'O céu é ___'.
  Provide exactly 3 distinct options for each question. One option must be the correct answer. The options and answer must be strings.

  Subject: {{{subject}}}
  Topic: {{{topic}}}
  Difficulty: {{{difficulty}}}
  Number of Questions: {{{numberOfQuestions}}}
  `,
});

const generateGameQuestionsFlow = ai.defineFlow(
  {
    name: 'generateGameQuestionsFlow',
    inputSchema: GenerateGameQuestionsInputSchema,
    outputSchema: GenerateGameQuestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
