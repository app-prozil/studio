'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, collectionGroup, doc, query } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Download, ShieldAlert, LogIn, GraduationCap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { TaskReportDialog, StudentGeneralReportDialog } from '@/app/tarefas/teacher-task-view';


type PerformanceQuestion = {
  text: string;
  options: string[];
  answer: string;
  studentAnswer?: string;
  attempts?: number;
  status?: 'correct' | 'incorrect' | 'unanswered';
  timeTaken?: number;
};

type Task = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  dueDate: string;
  teacherId: string;
  studentId: string;
  studentProzilId: string;
  studentName?: string;
  teacherName?: string;
  subject: 'matematica' | 'portugues' | 'memoria';
  taskType: 'jogo_interativo' | 'folha_imprimivel';
  isCompleted: boolean;
  completedAt?: string;
  totalTime?: number;
  questions: PerformanceQuestion[];
};

type Student = {
    id: string;
    name: string;
    prozilId: string;
};


export default function DirectorByStudentPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [viewingReport, setViewingReport] = useState<Task | null>(null);
  const [viewingGeneralReportFor, setViewingGeneralReportFor] = useState<{name: string, tasks: Task[], teacherName?: string} | null>(null);
  
  const directorDocRef = useMemoFirebase(() => (user ? doc(firestore, 'directors', user.uid) : null), [firestore, user]);
  const { data: directorProfile, isLoading: isDirectorLoading } = useDoc(directorDocRef);
  const isAuthorized = !!directorProfile;
  
  const tasksCollectionGroup = useMemoFirebase(() => isAuthorized ? query(collectionGroup(firestore, 'tasks')) : null, [firestore, isAuthorized]);
  const { data: allTasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksCollectionGroup);
  
  const studentsQuery = useMemoFirebase(() => isAuthorized ? collection(firestore, 'students') : null, [firestore, isAuthorized]);
  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

  const isLoading = isUserLoading || isDirectorLoading || isLoadingTasks || isLoadingStudents;

  const { tasksByStudent } = useMemo(() => {
    if (!allTasks || !students) {
      return { tasksByStudent: {} };
    }

    const studentMap = new Map(students.map(s => [s.id, s]));
    const validStudentIds = new Set(students.map(s => s.id));

    const processedTasks = Array.from(new Map(allTasks.map(task => [task.id, task])).values())
      .filter(task => validStudentIds.has(task.studentId))
      .map(task => ({
          ...task,
          studentName: studentMap.get(task.studentId)?.name || task.studentName || 'Nome não encontrado'
      }));
    
    const tasksByStudent = processedTasks.reduce((acc: Record<string, Task[]>, task: Task) => {
        const studentId = task.studentId;
        if (!acc[studentId]) {
            acc[studentId] = [];
        }
        acc[studentId].push(task);
        return acc;
    }, {});

    for (const studentId in tasksByStudent) {
        tasksByStudent[studentId].sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) {
            return a.isCompleted ? 1 : -1;
            }
            return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        });
    }

    return { tasksByStudent };

  }, [allTasks, students]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-2/3" />
        <div className="mt-8 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-lg mx-auto text-center">
          <CardHeader>
              <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
              <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Você precisa estar logado para acessar esta página.</p>
          </CardContent>
          <CardFooter className="justify-center">
              <Button asChild><Link href="/login"><LogIn className="mr-2"/>Fazer Login</Link></Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-lg mx-auto text-center">
          <CardHeader>
              <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
              <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Esta página é exclusiva para o perfil de Diretoria.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline flex items-center gap-3">
          <GraduationCap className="w-10 h-10 text-primary"/>
          Visão por Aluno
        </h1>
        <p className="text-muted-foreground">Veja o desempenho e as tarefas de cada aluno individualmente.</p>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>Tarefas por Aluno</CardTitle>
          <CardDescription>Acompanhe o desempenho de cada aluno e gere relatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(tasksByStudent).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Nenhuma tarefa atribuída a alunos foi encontrada.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(tasksByStudent).map(([studentId, studentTasks]) => {
                const studentName = studentTasks[0]?.studentName || studentId;
                return (
                <AccordionItem value={studentId} key={studentId}>
                  <AccordionTrigger className="text-lg font-medium hover:no-underline">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      {studentName}
                      <Badge variant="outline">{studentTasks.length} tarefas</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex justify-end pb-2 -mt-2">
                       <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => setViewingGeneralReportFor({ name: studentName, tasks: studentTasks, teacherName: studentTasks[0]?.teacherName })}>
                          <Download className="mr-2 h-4 w-4"/>
                          Gerar Relatório Geral do Aluno
                      </Button>
                    </div>
                     <ul className="space-y-3 pt-2">
                      {studentTasks.map(task => (
                         <li key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-background/50 gap-4">
                             <div className="grid gap-1.5 flex-1">
                                 <p className={`font-semibold ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                   {task.title}
                                 </p>
                                 <p className="text-sm text-muted-foreground">Por: {task.teacherName}</p>
                                 <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mt-1">
                                     <Badge variant={task.isCompleted ? 'success' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge>
                                     <span>
                                      Entrega: {format(new Date(task.dueDate), "dd/MM/yyyy")}
                                     </span>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setViewingReport(task)}>
                                    <Eye className="mr-2 h-3 w-3"/> Ver Relatório da Tarefa
                                </Button>
                             </div>
                          </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )})}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      <TaskReportDialog task={viewingReport} isOpen={!!viewingReport} onOpenChange={() => setViewingReport(null)} />
      {viewingGeneralReportFor && (
          <StudentGeneralReportDialog 
              studentName={viewingGeneralReportFor.name}
              tasks={viewingGeneralReportFor.tasks}
              teacherName={viewingGeneralReportFor.teacherName}
              isOpen={!!viewingGeneralReportFor} 
              onOpenChange={() => setViewingGeneralReportFor(null)} 
          />
      )}
    </div>
  );
}
