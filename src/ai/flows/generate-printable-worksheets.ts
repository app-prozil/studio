'use server';

/**
 * @fileOverview A flow for generating printable worksheets in math and Portuguese for children with low vision.
 *
 * - generatePrintableWorksheet - A function that generates a printable worksheet based on the provided subject and specifications.
 * - GeneratePrintableWorksheetInput - The input type for the generatePrintableWorksheet function.
 * - GeneratePrintableWorksheetOutput - The return type for the generatePrintableWorksheet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePrintableWorksheetInputSchema = z.object({
  subject: z.enum(['math', 'portuguese']).describe('The subject of the worksheet.'),
  topic: z.string().describe('The specific topic for the worksheet (e.g., addition, verb conjugation).'),
  gradeLevel: z.number().describe('The grade level of the worksheet.'),
  numQuestions: z.number().describe('The number of questions to include in the worksheet.'),
});
export type GeneratePrintableWorksheetInput = z.infer<typeof GeneratePrintableWorksheetInputSchema>;

const GeneratePrintableWorksheetOutputSchema = z.object({
  worksheetContent: z.string().describe('The generated worksheet content in a printable format (e.g., LaTeX or plain text).'),
});
export type GeneratePrintableWorksheetOutput = z.infer<typeof GeneratePrintableWorksheetOutputSchema>;

export async function generatePrintableWorksheet(input: GeneratePrintableWorksheetInput): Promise<GeneratePrintableWorksheetOutput> {
  return generatePrintableWorksheetFlow(input);
}

const generatePrintableWorksheetPrompt = ai.definePrompt({
  name: 'generatePrintableWorksheetPrompt',
  input: {schema: GeneratePrintableWorksheetInputSchema},
  output: {schema: GeneratePrintableWorksheetOutputSchema},
  prompt: `You are an expert in creating educational worksheets for children with low vision.

  Generate a printable worksheet for the following subject, topic, and grade level. The worksheet should be formatted for low vision, featuring high contrast, large fonts, and a simplified layout.

  Subject: {{{subject}}}
  Topic: {{{topic}}}
  Grade Level: {{{gradeLevel}}}
  Number of Questions: {{{numQuestions}}}

  The worksheet should be easily printable and ready for use. Provide the content in a format suitable for printing, prioritizing clarity and readability for students with visual impairments. Return the content as plain text or LaTeX format.

  Worksheet Content:`, // No Handlebars in here.
});

const generatePrintableWorksheetFlow = ai.defineFlow(
  {
    name: 'generatePrintableWorksheetFlow',
    inputSchema: GeneratePrintableWorksheetInputSchema,
    outputSchema: GeneratePrintableWorksheetOutputSchema,
  },
  async input => {
    const {output} = await generatePrintableWorksheetPrompt(input);
    return output!;
  }
);
