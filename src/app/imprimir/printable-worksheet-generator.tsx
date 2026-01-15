'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generatePrintableWorksheet, GeneratePrintableWorksheetOutput } from '@/ai/flows/generate-printable-worksheets';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Printer, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  subject: z.enum(['math', 'portuguese'], { required_error: 'Por favor, selecione uma matéria.' }),
  topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres.'),
  gradeLevel: z.coerce.number().min(1, 'O nível deve ser no mínimo 1.').max(12, 'O nível deve ser no máximo 12.'),
  numQuestions: z.coerce.number().min(1, 'O número de questões deve ser no mínimo 1.').max(20, 'O número de questões deve ser no máximo 20.'),
});

export function PrintableWorksheetGenerator() {
  const [worksheet, setWorksheet] = useState<GeneratePrintableWorksheetOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      gradeLevel: 1,
      numQuestions: 5,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setWorksheet(null);
    try {
      const result = await generatePrintableWorksheet(values);
      setWorksheet(result);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar atividade',
        description: 'Ocorreu um erro ao gerar a atividade. Tente novamente.',
      });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }
  
  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Atividade Imprimível</title>');
      printWindow.document.write('<style>body { font-family: "PT Sans", sans-serif; font-size: 24px; line-height: 1.5; } pre { white-space: pre-wrap; font-family: "PT Sans", sans-serif; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write('<pre>');
      printWindow.document.write(worksheet?.worksheetContent || '');
      printWindow.document.write('</pre>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Matéria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-lg h-12">
                        <SelectValue placeholder="Selecione uma matéria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="math" className="text-lg">Matemática</SelectItem>
                      <SelectItem value="portuguese" className="text-lg">Português</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Tópico</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Adição, Substantivos" {...field} className="text-lg h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Série / Nível</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="text-lg h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numQuestions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Nº de Questões</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="text-lg h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full h-14 text-xl">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-6 w-6" />
                Gerar Atividade
              </>
            )}
          </Button>
        </form>
      </Form>

      {worksheet && (
        <div className="w-full p-6 border rounded-lg bg-muted/50 mt-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold font-headline">Sua atividade está pronta!</h3>
                <Button onClick={handlePrint}><Printer className="mr-2"/> Imprimir</Button>
            </div>
            <Textarea
                readOnly
                value={worksheet.worksheetContent}
                className="w-full min-h-[400px] text-lg font-mono bg-white dark:bg-black p-4"
            />
        </div>
      )}
    </div>
  );
}
