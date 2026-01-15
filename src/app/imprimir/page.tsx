import { PrintableWorksheetGenerator } from './printable-worksheet-generator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function PrintableWorksheetsPage() {
  return (
    <div className="max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-headline">Gerador de Folhas de Atividades</CardTitle>
                <CardDescription>Crie atividades personalizadas para matemática e português, formatadas para impressão.</CardDescription>
            </CardHeader>
            <CardContent>
              <PrintableWorksheetGenerator />
            </CardContent>
        </Card>
    </div>
  );
}
