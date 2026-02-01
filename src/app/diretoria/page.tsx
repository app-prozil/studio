'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, collectionGroup, doc, query } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Download, ShieldAlert, LogIn, GraduationCap, Users, User, FileText, PieChart, ClipboardList, Briefcase } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { TaskReportDialog, StudentGeneralReportDialog } from '@/app/tarefas/teacher-task-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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


function DirectorByStudentView() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [viewingReport, setViewingReport] = useState<Task | null>(null);
  const [viewingGeneralReportFor, setViewingGeneralReportFor] = useState<{name: string, tasks: Task[], teacherName?: string} | null>(null);
  
  const tasksCollectionGroup = useMemoFirebase(() => query(collectionGroup(firestore, 'tasks')), [firestore]);
  const { data: allTasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksCollectionGroup);
  
  const studentsQuery = useMemoFirebase(() => collection(firestore, 'students'), [firestore]);
  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

  const isLoading = isLoadingTasks || isLoadingStudents;

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
      <div className="space-y-4 pt-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
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
    </Card>
  );
}

function DirectorByTeacherView() {
    const firestore = useFirestore();
    const [viewingReport, setViewingReport] = useState<Task | null>(null);

    const tasksCollectionGroup = useMemoFirebase(() => query(collectionGroup(firestore, 'tasks')), [firestore]);
    const { data: allTasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksCollectionGroup);
    
    const teachersQuery = useMemoFirebase(() => collection(firestore, 'teachers'), [firestore]);
    const { data: teachers, isLoading: isLoadingTeachers } = useCollection<Teacher>(teachersQuery);

    const studentsQuery = useMemoFirebase(() => collection(firestore, 'students'), [firestore]);
    const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

    const isLoading = isLoadingTasks || isLoadingTeachers || isLoadingStudents;

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
          <div className="space-y-4 pt-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        );
    }
    
    return (
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
            <TaskReportDialog task={viewingReport} isOpen={!!viewingReport} onOpenChange={() => setViewingReport(null)} />
        </Card>
    );
}

export default function DirectorDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('by-student');

  const directorDocRef = useMemoFirebase(() => (user ? doc(firestore, 'directors', user.uid) : null), [firestore, user]);
  const { data: directorProfile, isLoading: isDirectorLoading } = useDoc(directorDocRef);
  
  const tasksCollectionGroup = useMemoFirebase(() => directorProfile ? query(collectionGroup(firestore, 'tasks')) : null, [firestore, directorProfile]);
  const { data: allTasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksCollectionGroup);
  
  const teachersQuery = useMemoFirebase(() => directorProfile ? collection(firestore, 'teachers') : null, [firestore, directorProfile]);
  const { data: teachers, isLoading: isLoadingTeachers } = useCollection<Teacher>(teachersQuery);

  const studentsQuery = useMemoFirebase(() => directorProfile ? collection(firestore, 'students') : null, [firestore, directorProfile]);
  const { data: students, isLoading: isLoadingStudents } = useCollection<Student>(studentsQuery);

  const isLoading = isUserLoading || isDirectorLoading || isLoadingTasks || isLoadingTeachers || isLoadingStudents;

  const dashboardStats = useMemo(() => {
    if (!directorProfile || !allTasks || !teachers || !students) {
      return { totalTeachers: 0, totalStudents: 0, totalTasks: 0, completionRate: 0 };
    }
    const validStudentIds = new Set(students.map(s => s.id));
    const uniqueTasks = Array.from(new Map(allTasks.map(task => [task.id, task])).values())
        .filter(task => validStudentIds.has(task.studentId));

    const completedTasks = uniqueTasks.filter(t => t.isCompleted).length;
    const completionRate = uniqueTasks.length > 0 ? Math.round((completedTasks / uniqueTasks.length) * 100) : 0;
    
    return {
      totalTeachers: teachers.length,
      totalStudents: students.length,
      totalTasks: uniqueTasks.length,
      completionRate
    };
  }, [directorProfile, allTasks, teachers, students]);


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
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
  
  if (!directorProfile) {
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
          <Briefcase className="w-10 h-10 text-primary"/>
          Painel da Diretoria
        </h1>
        <p className="text-muted-foreground">Acompanhe as métricas e acesse as visões detalhadas de professores e alunos.</p>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Professores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalTeachers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atribuídas</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.completionRate}%</div>
          </CardContent>
        </Card>
      </div>

       <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="by-student">Visão por Aluno</TabsTrigger>
                <TabsTrigger value="by-teacher">Visão por Professor</TabsTrigger>
            </TabsList>
            <TabsContent value="by-student" className="mt-6">
                <DirectorByStudentView />
            </TabsContent>
            <TabsContent value="by-teacher" className="mt-6">
                <DirectorByTeacherView />
            </TabsContent>
        </Tabs>
    </div>
  );
}