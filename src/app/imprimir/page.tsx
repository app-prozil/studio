import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export default function PrintableWorksheetsPage() {
  return (
    <div className="max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-headline">Gerador de Folhas de Atividades</CardTitle>
                <CardDescription>Crie atividades personalizadas para matemática e português, formatadas para impressão.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-16 px-6 bg-muted/50 rounded-lg">
                  <Lightbulb className="mx-auto h-12 w-12 text-primary" />
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight">Em desenvolvimento</h3>
                  <p className="mt-2 text-muted-foreground">
                    A geração de folhas para impressão está sendo reformulada para usar o novo sistema de banco de exercícios.
                  </p>
              </div>
            </CardContent>
        </Card>
    </div>
  );
}
