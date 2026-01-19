'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Download, FileText, Settings, User, GraduationCap, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

type Exercise = {
  id: string;
  teacherId: string;
  text: string;
  options: string[];
  answer: string;
  subject: 'matematica' | 'portugues';
  difficulty: 'easy' | 'medium' | 'hard';
};

function PrintableWorksheetGenerator() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const isTeacher = !!user;

  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [studentName, setStudentName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [bankSubjectFilter, setBankSubjectFilter] = useState<'all' | 'matematica' | 'portugues'>('all');

  const exercisesQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'teachers', user.uid, 'exercises') : null),
    [firestore, user]
  );
  const { data: exercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesQuery);

  const filteredBankExercises = useMemo(() => {
    if (!exercises) return [];
    if (bankSubjectFilter === 'all') return exercises;
    return exercises.filter(ex => ex.subject === bankSubjectFilter);
  }, [exercises, bankSubjectFilter]);
  
  const handleGeneratePdf = async () => {
    const worksheetElement = document.getElementById('worksheet-preview');
    if (!worksheetElement) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível encontrar o elemento da folha de atividades.' });
        return;
    }

    setIsGeneratingPdf(true);

    // Apply printing styles
    worksheetElement.classList.add('printing');

    try {
        const canvas = await html2canvas(worksheetElement, {
            scale: 3, // Increase resolution
            useCORS: true,
            backgroundColor: '#ffffff',
        });

        // Remove printing styles after capture
        worksheetElement.classList.remove('printing');

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasRatio = canvasHeight / canvasWidth;
        
        let finalWidth = pdfWidth;
        let finalHeight = pdfWidth * canvasRatio;

        if (finalHeight > pdfHeight) {
            finalHeight = pdfHeight;
            finalWidth = pdfHeight / canvasRatio;
        }

        const xPos = (pdfWidth - finalWidth) / 2;
        const yPos = (pdfHeight - finalHeight) / 2;

        pdf.addImage(imgData, 'JPEG', xPos, yPos, finalWidth, finalHeight);
        pdf.save('folha-de-atividades-prozil.pdf');

    } catch (err) {
        console.error("Error generating PDF:", err);
        worksheetElement.classList.remove('printing'); // Ensure cleanup on error
        toast({
            variant: 'destructive',
            title: 'Erro ao gerar PDF',
            description: 'Ocorreu um problema ao criar o arquivo.',
        });
    } finally {
        setIsGeneratingPdf(false);
    }
  };


  if (isUserLoading) {
    return <div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isTeacher) {
      return (
        <Card className="max-w-xl mx-auto">
            <CardHeader>
                <CardTitle>Acesso Restrito</CardTitle>
                <CardDescription>Apenas professores podem criar folhas de atividades a partir do banco de exercícios.</CardDescription>
            </CardHeader>
        </Card>
      );
  }

  if (showPreview) {
    return (
        <div id="printable-worksheet">
             <div className="flex items-center justify-between gap-4 mb-8">
                <h1 className="text-2xl font-bold">Pré-visualização da Folha</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isGeneratingPdf}>
                        <Settings className="mr-2" /> Editar
                    </Button>
                    <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                         {isGeneratingPdf ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                         {isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                    </Button>
                </div>
            </div>
            <Card className="p-4 sm:p-8 bg-background" id="worksheet-preview">
                <header className="mb-12 space-y-4">
                    <h1 className="text-4xl font-bold text-center font-headline">Folha de Atividades</h1>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-lg py-4">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-muted-foreground" />
                            <strong className="mr-2">Aluno(a):</strong>
                            <span>{studentName || '________________________________'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <User className="w-6 h-6 text-muted-foreground" />
                            <strong className="mr-2">Professor(a):</strong>
                            <span>{teacherName || '___________________________'}</span>
                        </div>
                    </div>
                </header>

                <section className="space-y-10">
                    {selectedExercises.map((exercise, index) => (
                        <div key={exercise.id} className="space-y-4">
                            <p className="text-2xl font-bold">
                                {index + 1}. {exercise.text.replace(/___/g, '__________')}
                            </p>
                            {exercise.subject === 'portugues' ? (
                                <div className="space-y-4 pl-8">
                                    {exercise.options.map((option, optIndex) => (
                                        <div key={optIndex} className="flex items-center gap-4 text-2xl">
                                            <div className="w-8 h-8 border-4 border-foreground rounded-md"></div>
                                            <span>{option}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-2xl pl-8">R: _________________________</p>
                            )}
                        </div>
                    ))}
                </section>
            </Card>
        </div>
    );
  }

  return (
    <>
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Gerador de Folhas de Atividades</CardTitle>
                    <CardDescription>Crie atividades personalizadas para impressão a partir do seu banco de exercícios.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-lg">Exercícios</Label>
                        <Card className="p-4">
                             {selectedExercises.length > 0 && (
                                <ul className="space-y-2 mb-4">
                                  {selectedExercises.map((ex) => (
                                    <li key={ex.id} className="flex items-center justify-between p-2 text-sm bg-muted rounded-md">
                                      <span className="truncate pr-2">{ex.text}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={() => setSelectedExercises(prev => prev.filter(p => p.id !== ex.id))}
                                      >
                                        <X className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            <Button variant="outline" className="w-full" onClick={() => setIsBankOpen(true)}>
                                <PlusCircle className="mr-2" /> Selecionar Exercícios ({selectedExercises.length})
                            </Button>
                        </Card>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="student-name" className="text-lg">Nome do Aluno (Opcional)</Label>
                        <Input id="student-name" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Ex: João da Silva"/>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="teacher-name" className="text-lg">Nome do Professor (Opcional)</Label>
                        <Input id="teacher-name" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Ex: Prof. Maria"/>
                    </div>

                </CardContent>
                <CardFooter>
                    <Button 
                        size="lg" 
                        onClick={() => setShowPreview(true)}
                        disabled={selectedExercises.length === 0}
                    >
                        <FileText className="mr-2"/> Gerar Pré-visualização
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
              <DialogHeader><DialogTitle>Adicionar Exercícios do Banco</DialogTitle><DialogDescription>Selecione os exercícios que você quer incluir na folha de atividades.</DialogDescription></DialogHeader>
               <div className="flex flex-wrap items-center gap-2 pt-2 border-y pb-4">
                  <span className="text-sm font-medium pr-4">Filtrar por:</span>
                  <Button variant={bankSubjectFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('all')}>Todos</Button>
                  <Button variant={bankSubjectFilter === 'matematica' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('matematica')}>Matemática</Button>
                  <Button variant={bankSubjectFilter === 'portugues' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('portugues')}>Português</Button>
              </div>
              <div className="flex-1 overflow-y-auto pr-4">
                  {isLoadingExercises ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : filteredBankExercises.length > 0 ? (
                    filteredBankExercises.map(ex => (
                      <div key={ex.id} className="flex items-center gap-4 p-2 border-b">
                          <Checkbox 
                              id={`bank-${ex.id}`} 
                              checked={selectedExercises.some(s => s.id === ex.id)}
                              onCheckedChange={(checked) => {
                                  if (checked) {
                                      setSelectedExercises(prev => [...prev, ex]);
                                  } else {
                                      setSelectedExercises(prev => prev.filter(p => p.id !== ex.id));
                                  }
                              }}
                          />
                          <label htmlFor={`bank-${ex.id}`} className="flex-1 cursor-pointer">
                              <p className="font-semibold">{ex.text}</p>
                              <div className="flex gap-2 mt-1">
                                  <Badge variant="secondary">{ex.subject === 'matematica' ? 'Matemática' : 'Português'}</Badge>
                                  <Badge variant="outline">{ex.difficulty}</Badge>
                              </div>
                          </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum exercício encontrado. Crie alguns no Banco de Exercícios primeiro.
                    </div>
                  )}
              </div>
              <DialogFooter>
                  <Button onClick={() => setIsBankOpen(false)}>
                    Confirmar Seleção ({selectedExercises.length})
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}

export default function PrintableWorksheetsPage() {
    return <PrintableWorksheetGenerator />;
}
