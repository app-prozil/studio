'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, collectionGroup, doc, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, LogIn, Briefcase, Users, GraduationCap, ClipboardList, PieChart, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import Link from 'next/link';


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


export default function DirectorDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

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
  
  const dashboardStats = useMemo(() => {
    if (!allTasks || !teachers || !students) {
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

  }, [allTasks, teachers, students]);


  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-2/3" />
        <div className="mt-8 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
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

       <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-8 h-8 text-primary" />
              <span className="text-2xl font-headline">Visão por Professor</span>
            </CardTitle>
            <CardDescription>
              Monitore as tarefas atribuídas e o progresso de cada professor.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
             <p className="text-muted-foreground">
                Acompanhe as atividades, veja relatórios detalhados por tarefa e entenda como cada professor está utilizando a plataforma.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/diretoria/por-professor">Acessar Visão por Professor <ArrowRight className="ml-2" /></Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-primary" />
              <span className="text-2xl font-headline">Visão por Aluno</span>
            </CardTitle>
            <CardDescription>
              Acompanhe o desempenho e as tarefas de cada aluno individualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
             <p className="text-muted-foreground">
                Visualize todas as tarefas de um aluno, gere relatórios de desempenho geral e identifique pontos de atenção.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/diretoria/por-aluno">Acessar Visão por Aluno <ArrowRight className="ml-2" /></Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
