'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, collectionGroup, doc, query } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, FileText, User, ShieldAlert, LogIn, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { TaskReportDialog } from '@/app/tarefas/teacher-task-view';


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

type Teacher = {
    id: string;
    name: string;
    prozilId: string;
    email: string;
};

type Student = {
    id: string;
    name: string;
    prozilId: string;
};


export default function DirectorByTeacherPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [viewingReport, setViewingReport] = useState<Task | null>(null);
  
  const directorDocRef = useMemoFirebase(() => (user ? doc(firestore, 'directors', user.uid) : null), [firestore, user]);
  const { data: directorProfile, isLoading: isDirectorLoading } = useDoc(directorDocRef);
  const isAuthorized = !!directorProfile;
  
  const tasksCollectionGroup = useMemoFirebase(() => isAuthorized ? query(collectionGroup(firestore, 'tasks')) : null, [firestore, isAuthorized]);
  const { data: allTasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksCollectionGroup);
  
  const teachersQuery = useMemoFirebase(() => isAuthorized ? collection(firestore, 'teachers') : null, [firestore, isAuthorized]);
  const { data: teachers, isLoading: isLoadingTeachers } = useCollection<Teacher>(teachersQuery);

  const studentsQuery = useMemoFirebase(() => isAuthorized ? collection(firestore, 'students') : null, [firestore, isAuthorized]);
  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

  const isLoading = isUserLoading || isDirectorLoading || isLoadingTasks || isLoadingTeachers || isLoadingStudents;

  const { tasksByTeacher } = useMemo(() => {
    if (!allTasks || !teachers || !students) {
      return { tasksByTeacher: {} };
    }

    const studentMap = new Map(students.map(s => [s.id, s]));
    const validStudentIds = new Set(students.map(s => s.id));

    const processedTasks = Array.from(new Map(allTasks.map(task => [task.id, task])).values())
      .filter(task => validStudentIds.has(task.studentId))
      .map(task => ({
          ...task,
          studentName: studentMap.get(task.studentId)?.name || task.studentName || 'Nome não encontrado'
      }));

    const groupedByTeacherId = processedTasks.reduce((acc: Record<string, Task[]>, task: Task) => {
      const teacherId = task.teacherId;
      if (!acc[teacherId]) {
        acc[teacherId] = [];
      }
      acc[teacherId].push(task);
      return acc;
    }, {});

    const tasksByTeacher: Record<string, { tasks: Task[], teacher: Teacher }> = {};
    for (const teacher of teachers) {
        if (groupedByTeacherId[teacher.id]) {
            tasksByTeacher[teacher.name] = {
                teacher: teacher,
                tasks: groupedByTeacherId[teacher.id].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            };
        }
    }
    
    return { tasksByTeacher };

  }, [allTasks, teachers, students]);

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
          <Users className="w-10 h-10 text-primary"/>
          Visão por Professor
        </h1>
        <p className="text-muted-foreground">Veja todas as tarefas atribuídas, agrupadas por professor.</p>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Tarefas por Professor</CardTitle>
          <CardDescription>Acompanhe as atividades criadas por cada professor.</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(tasksByTeacher).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Nenhuma tarefa atribuída por professores foi encontrada.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(tasksByTeacher).map(([teacherName, { tasks, teacher }]) => (
                <AccordionItem value={teacher.id} key={teacher.id}>
                  <AccordionTrigger className="text-lg font-medium hover:no-underline">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary" />
                      {teacherName}
                      <Badge variant="outline">{tasks.length} tarefas</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                     <ul className="space-y-3 pt-2">
                      {tasks.map(task => (
                         <li key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-background/50 gap-4">
                             <div className="grid gap-1.5 flex-1">
                                 <p className={`font-semibold ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                   {task.title}
                                 </p>
                                 <p className="text-sm text-muted-foreground">Para: {task.studentName}</p>
                                 <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mt-1">
                                     <Badge variant={task.isCompleted ? 'success' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge>
                                     <span>
                                      Entrega: {format(new Date(task.dueDate), "dd/MM/yyyy")}
                                     </span>
                                     <span className="flex items-center gap-1">
                                      <FileText className="w-3 h-3"/> {task.questions?.length || 0} questões
                                     </span>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setViewingReport(task)}>
                                    <Eye className="mr-2 h-3 w-3"/> Ver Relatório
                                </Button>
                             </div>
                          </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      <TaskReportDialog task={viewingReport} isOpen={!!viewingReport} onOpenChange={() => setViewingReport(null)} />
    </div>
  );
}
