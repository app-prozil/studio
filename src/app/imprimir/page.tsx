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
import { Loader2, PlusCircle, Download, FileText, Settings, User, GraduationCap, X, ShieldAlert, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type Exercise = {
  id: string;
  teacherId: string;
  text: string;
  text2?: string;
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
  
  const exercisesPerPage = 3;
  const pageChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < selectedExercises.length; i += exercisesPerPage) {
      chunks.push(selectedExercises.slice(i, i + exercisesPerPage));
    }
    return chunks;
  }, [selectedExercises]);

  const handleGeneratePdf = async () => {
    const pages = document.querySelectorAll<HTMLElement>('.printable-page');
    if (pages.length === 0) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nenhuma página para imprimir foi encontrada.' });
      return;
    }
  
    setIsGeneratingPdf(true);
  
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
  
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null,
        });
  
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
  
        if (i > 0) {
          pdf.addPage();
        }
  
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
  
      pdf.save('folha-de-atividades-prozil.pdf');
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: 'destructive', title: 'Erro ao Gerar PDF', description: 'Ocorreu um problema ao criar o arquivo. Tente novamente.' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  if (isUserLoading) {
    return <div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  }
  
  if (!isTeacher) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md mx-auto text-center">
                <CardHeader>
                    <div className="mx-auto bg-destructive/10 rounded-full p-4 w-fit mb-2">
                        <ShieldAlert className="w-12 h-12 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Acesso Restrito</CardTitle>
                    <CardDescription>Esta funcionalidade é exclusiva para professores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Faça login como professor para criar e imprimir folhas de atividades.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Fazer Login
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      );
  }

  return (
    <>
      <div className={showPreview ? '' : 'max-w-2xl mx-auto'}>
        {!showPreview ? (
           <div>
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
                                      <span className="truncate pr-2">{ex.text}{ex.text2 && ` ${ex.text2}`}</span>
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
        ) : (
          <div>
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
              <div id="printable-worksheet-container" className="bg-gray-200 dark:bg-gray-800 p-4 rounded-md">
                {pageChunks.map((chunk, pageIndex) => (
                  <div key={`page-${pageIndex}`} className="printable-page flex flex-col">
                      <header className="mb-12 space-y-4 page-header">
                          <h1 className="text-4xl font-bold text-center font-headline">Folha de Atividades</h1>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-lg py-4">
                              <div className="flex items-center gap-2 header-info-item">
                                  <GraduationCap className="w-6 h-6 text-muted-foreground" />
                                  <strong className="mr-2">Aluno(a):</strong>
                                  <span>{studentName || ''}</span>
                              </div>
                              <div className="flex items-center gap-2 header-info-item">
                                  <User className="w-6 h-6 text-muted-foreground" />
                                  <strong className="mr-2">Professor(a):</strong>
                                  <span>{teacherName || ''}</span>
                              </div>
                          </div>
                      </header>

                      <section className="space-y-10 flex-grow">
                          {chunk.map((exercise, exerciseIndex) => (
                              <div key={exercise.id} className="space-y-4 exercise-item">
                                  <p className="text-2xl font-bold">
                                      {(pageIndex * exercisesPerPage) + exerciseIndex + 1}. {`${exercise.text} ${exercise.text2 || ''}`.replace(/___/g, '__________')}
                                  </p>
                                  {exercise.options?.length > 0 ? (
                                      <ul className="options-list">
                                          {exercise.options.map((option, optIndex) => (
                                              <li key={optIndex} className="option-item">
                                                  <div className="option-checkbox"></div>
                                                  <span className="option-text">{option}</span>
                                              </li>
                                          ))}
                                      </ul>
                                  ) : (
                                      <p className="text-2xl pl-8 mt-8">R: ___________________________________</p>
                                  )}
                              </div>
                          ))}
                      </section>
                      <footer className="page-footer">
                        Página {pageIndex + 1} de {pageChunks.length}
                      </footer>
                  </div>
                ))}
              </div>
          </div>
        )}
      </div>

      {isGeneratingPdf && (
        <div className="fixed inset-0 bg-background/80 flex flex-col items-center justify-center z-50">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground">Gerando seu PDF, por favor aguarde...</p>
          <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos.</p>
        </div>
      )}

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
                            <p className="font-semibold">{ex.text}{ex.text2 && ` ${ex.text2}`}</p>
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
