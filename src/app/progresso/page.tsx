'use client'

import { useMemo, useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogIn } from 'lucide-react';

type PerformanceQuestion = {
  status?: 'correct' | 'incorrect' | 'unanswered';
};

type Task = {
  id: string;
  subject: 'matematica' | 'portugues';
  isCompleted: boolean;
  completedAt?: string;
  questions: PerformanceQuestion[];
};

type Student = {
  id: string;
  name: string;
  prozilId: string;
};

const chartConfig = {
  matematica: {
    label: 'Matemática',
    color: 'hsl(var(--accent))',
  },
  portugues: {
    label: 'Português',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const monthOrder = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function ProgressDashboard({ tasks, name }: { tasks: Task[] | null, name: string | null }) {
  const stats = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { averageScore: 0, completedThisMonth: 0, chartData: [] };
    }

    const validTasks = tasks.filter(t => t.questions && t.questions.length > 0);

    const scores = validTasks.map(task => {
      const correct = task.questions.filter(q => q.status === 'correct').length;
      const total = task.questions.length;
      return total > 0 ? (correct / total) * 100 : 0;
    });

    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const completedThisMonth = validTasks.filter(task => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear;
    }).length;

    const monthlyData: { [key: string]: { matematica: number[], portugues: number[] } } = {};

    validTasks.forEach(task => {
      if (!task.completedAt) return;
      const date = new Date(task.completedAt);
      const monthKey = format(date, 'MMM', { locale: ptBR }).toLowerCase();
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { matematica: [], portugues: [] };
      }

      const score = (task.questions.filter(q => q.status === 'correct').length / task.questions.length) * 100;
      
      if (task.subject === 'matematica') {
        monthlyData[monthKey].matematica.push(score);
      } else {
        monthlyData[monthKey].portugues.push(score);
      }
    });
    
    const chartData = Object.keys(monthlyData).map(month => {
      const matScores = monthlyData[month].matematica;
      const porScores = monthlyData[month].portugues;
      return {
        month: month.charAt(0).toUpperCase() + month.slice(1),
        matematica: matScores.length > 0 ? Math.round(matScores.reduce((a, b) => a + b, 0) / matScores.length) : null,
        portugues: porScores.length > 0 ? Math.round(porScores.reduce((a, b) => a + b, 0) / porScores.length) : null,
      };
    });
    
    chartData.sort((a, b) => monthOrder.indexOf(a.month.toLowerCase()) - monthOrder.indexOf(b.month.toLowerCase()));

    return { averageScore, completedThisMonth, chartData };
  }, [tasks]);

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum Dado de Progresso</CardTitle>
          <CardDescription>Nenhuma atividade concluída foi encontrada para {name || 'este usuário'}.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-10">
          Complete algumas atividades para ver o progresso aqui!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Pontuação Média</CardTitle>
                <CardDescription>Sua pontuação média em todas as atividades.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-center p-6 text-6xl font-bold">
                {stats.averageScore}<span className="text-2xl font-normal text-muted-foreground">%</span>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Atividades Concluídas</CardTitle>
                <CardDescription>Total de atividades que você completou este mês.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-center p-6 text-6xl font-bold">
                {stats.completedThisMonth}
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho ao Longo do Tempo</CardTitle>
          <CardDescription>Média de pontuação por matéria em cada mês.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" unit="%" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="matematica" fill="var(--color-matematica)" radius={4} />
                <Bar dataKey="portugues" fill="var(--color-portugues)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function StudentProgressView({ studentId, studentName }: { studentId: string, studentName: string | null }) {
  const firestore = useFirestore();
  const tasksQuery = useMemoFirebase(() => 
    query(collection(firestore, 'students', studentId, 'tasks'), where('isCompleted', '==', true)), 
    [firestore, studentId]
  );
  const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid gap-6 md:grid-cols-2 mt-8">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold font-headline">Seu Progresso</h1>
      <p className="mt-2 text-muted-foreground">Acompanhe sua evolução, veja suas pontuações e descubra onde você mais se destaca.</p>
      <div className="mt-8">
        <ProgressDashboard tasks={tasks} name={studentName} />
      </div>
    </div>
  )
}

function TeacherProgressView({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      const studentsColRef = collection(firestore, 'students');
      const q = query(studentsColRef, where('teacherIds', 'array-contains', teacherId));
      try {
          const querySnapshot = await getDocs(q);
          const studentData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
          setStudents(studentData);
      } catch (e) {
          console.error("Error fetching students: ", e);
      } finally {
          setIsLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [teacherId, firestore]);

  const tasksQuery = useMemoFirebase(() => 
    selectedStudentId ? query(collection(firestore, 'students', selectedStudentId, 'tasks'), where('isCompleted', '==', true)) : null,
    [firestore, selectedStudentId]
  );
  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-4xl font-bold font-headline">Progresso dos Alunos</h1>
        <p className="mt-2 text-muted-foreground">Monitore o desempenho dos seus alunos, filtre por estudante e identifique pontos que precisam de atenção.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Aluno</CardTitle>
          <CardDescription>Selecione um aluno para ver seu progresso detalhado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={setSelectedStudentId} value={selectedStudentId} disabled={isLoadingStudents || students.length === 0}>
            <SelectTrigger className="w-full md:w-[320px]">
              <SelectValue placeholder={isLoadingStudents ? "Carregando alunos..." : "Selecione um aluno..."} />
            </SelectTrigger>
            <SelectContent>
              {students.length > 0 ?
                students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                : <SelectItem value="no-students" disabled>Nenhum aluno vinculado.</SelectItem>
              }
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {selectedStudentId && (
        isLoadingTasks ? 
          <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <div className="grid gap-6 md:grid-cols-2 mt-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-40 w-full" />
              </div>
              <Skeleton className="h-80 w-full" />
          </div> 
        :
        <div>
          <h2 className="text-3xl font-bold mb-6 font-headline">Relatório de {selectedStudent?.name}</h2>
          <ProgressDashboard tasks={tasks} name={selectedStudent?.name || null}/>
        </div>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const teacherDocRef = useMemoFirebase(() => (user ? doc(firestore, 'teachers', user.uid) : null), [firestore, user]);
  const { data: teacherProfile, isLoading: isTeacherLoading } = useDoc(teacherDocRef);
  
  const studentDocRef = useMemoFirebase(() => (user ? doc(firestore, 'students', user.uid) : null), [firestore, user]);
  const { data: studentProfile, isLoading: isStudentLoading } = useDoc(studentDocRef);

  const isLoading = isUserLoading || isTeacherLoading || isStudentLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid gap-6 md:grid-cols-2 mt-8">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md mx-auto text-center">
              <CardHeader>
                  <div className="mx-auto bg-destructive/10 rounded-full p-4 w-fit mb-2">
                      <ShieldAlert className="w-12 h-12 text-destructive" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Acesso Restrito</CardTitle>
                  <CardDescription>Esta página é protegida.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-muted-foreground">
                      Para visualizar seu progresso, você precisa estar logado na sua conta.
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

  if (teacherProfile) {
    return <TeacherProgressView teacherId={user.uid} />;
  }

  if (studentProfile) {
    return <StudentProgressView studentId={user.uid} studentName={studentProfile.name} />;
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
      <p className="text-muted-foreground">Não conseguimos identificar seu perfil como professor ou aluno.</p>
    </div>
  );
}
