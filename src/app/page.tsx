'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Book, Calculator, Printer, LogIn, Puzzle, User, Briefcase, Users, GraduationCap, ClipboardList, PieChart } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, collectionGroup } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

type Task = {
  id: string;
  isCompleted: boolean;
  subject: 'matematica' | 'portugues' | 'memoria';
  studentId: string;
};

type Teacher = {
    id: string;
};

type Student = {
    id: string;
};

export default function Home() {
  const mathImage = PlaceHolderImages.find(img => img.id === 'math-learning');
  const portugueseImage = PlaceHolderImages.find(img => img.id === 'portuguese-reading');
  const memoryImage = PlaceHolderImages.find(img => img.id === 'memory-game');
  const printingImage = PlaceHolderImages.find(img => img.id === 'printable-worksheets');
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isAdmin = user?.uid === 'yUKh2hnexMdiTd2t9rXEU0SgjPk1';

  const teacherDocRef = useMemoFirebase(() => (user ? doc(firestore, 'teachers', user.uid) : null), [firestore, user]);
  const { data: teacherProfile, isLoading: isTeacherLoading } = useDoc(teacherDocRef);

  const studentDocRef = useMemoFirebase(() => (user ? doc(firestore, 'students', user.uid) : null), [firestore, user]);
  const { data: studentProfile, isLoading: isStudentLoading } = useDoc(studentDocRef);

  const directorDocRef = useMemoFirebase(() => (user ? doc(firestore, 'directors', user.uid) : null), [firestore, user]);
  const { data: directorProfile, isLoading: isDirectorLoading } = useDoc(directorDocRef);
  
  const isStudent = !!studentProfile;
  const isTeacher = !!teacherProfile;
  const isDirector = !!directorProfile;
  const isTeacherOrAdmin = isTeacher || isAdmin;
  
  const studentTasksQuery = useMemoFirebase(() => 
    (isStudent && user) 
      ? query(collection(firestore, 'students', user.uid, 'tasks'), where('isCompleted', '==', false)) 
      : null, 
    [firestore, isStudent, user]
  );
  const { data: studentTasks, isLoading: isLoadingStudentTasks } = useCollection<Task>(studentTasksQuery);

  const hasMathTask = studentTasks?.some(t => t.subject === 'matematica');
  const hasPortugueseTask = studentTasks?.some(t => t.subject === 'portugues');
  const hasMemoryTask = studentTasks?.some(t => t.subject === 'memoria');
  
  // Data fetching for Director Dashboard
  const tasksCollectionGroup = useMemoFirebase(() => isDirector ? query(collectionGroup(firestore, 'tasks')) : null, [firestore, isDirector]);
  const { data: allTasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksCollectionGroup);
  
  const teachersQuery = useMemoFirebase(() => isDirector ? collection(firestore, 'teachers') : null, [firestore, isDirector]);
  const { data: teachers, isLoading: isLoadingTeachers } = useCollection<Teacher>(teachersQuery);

  const directorStudentsQuery = useMemoFirebase(() => isDirector ? collection(firestore, 'students') : null, [firestore, isDirector]);
  const { data: students, isLoading: isLoadingDirectorStudents } = useCollection<Student>(directorStudentsQuery);
  
  const dashboardStats = useMemo(() => {
    if (!isDirector || !allTasks || !teachers || !students) {
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
  }, [isDirector, allTasks, teachers, students]);


  const isLoading = isUserLoading || isTeacherLoading || isStudentLoading || isDirectorLoading || isLoadingStudentTasks || (isDirector && (isLoadingTasks || isLoadingTeachers || isLoadingDirectorStudents));


  if (isLoading) {
      return (
          <div className="space-y-8">
              <div className="text-center">
                  <Skeleton className="h-12 w-3/4 mx-auto" />
                  <Skeleton className="h-6 w-1/2 mx-auto mt-4" />
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-96 w-full" />
                  <Skeleton className="h-96 w-full" />
                  <Skeleton className="h-96 w-full" />
              </div>
          </div>
      );
  }

  if (isDirector && directorProfile) {
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

  const showPrintCard = !user || isTeacherOrAdmin;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight font-headline text-foreground sm:text-5xl">
          Bem-vindo ao ProZil
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {isTeacherOrAdmin ? "Sua plataforma de ensino acessível e divertida." : "Sua plataforma de aprendizado acessível e divertida."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-8 h-8 text-primary" />
              <span className="text-2xl font-headline">Matemática Divertida</span>
            </CardTitle>
            <CardDescription>
              {isTeacherOrAdmin
                ? "Crie jogos interativos e desafios para engajar seus alunos."
                : "Aprenda matemática com jogos interativos e desafios."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {mathImage && <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                <Image
                  src={mathImage.imageUrl}
                  alt={mathImage.description}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={mathImage.imageHint}
                />
            </div>}
            <p className="mb-4 text-muted-foreground">
              Jogos projetados com alto contraste e visuais grandes e claros para ajudar crianças com baixa visão.
            </p>
          </CardContent>
          <CardFooter>
            {user ? (
               <Button asChild className="w-full" disabled={isStudent && !hasMathTask}>
                  <Link href={isTeacherOrAdmin ? '/tarefas' : (isStudent ? '/tarefas' : '/matematica')}>
                    {isTeacherOrAdmin ? "Criar Jogo Interativo" : (isStudent ? 'Ver Tarefas' : 'Começar a Jogar')} <ArrowRight className="ml-2" />
                  </Link>
                </Button>
            ) : (
                <Button asChild className="w-full">
                  <Link href="/login">
                    Logar para Visualizar <LogIn className="ml-2" />
                  </Link>
                </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-8 h-8 text-primary" />
              <span className="text-2xl font-headline">Português Adaptativo</span>
            </CardTitle>
            <CardDescription>
              {isTeacherOrAdmin
                ? "Elabore exercícios que se adaptam ao ritmo de cada aluno."
                : "Exercícios que se adaptam ao seu ritmo de aprendizado."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
             {portugueseImage && <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                <Image
                  src={portugueseImage.imageUrl}
                  alt={portugueseImage.description}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={portugueseImage.imageHint}
                />
            </div>}
            <p className="mb-4 text-muted-foreground">
              Com suporte de texto para fala e layouts simplificados para facilitar a leitura.
            </p>
          </CardContent>
          <CardFooter>
             {user ? (
                <Button asChild className="w-full" disabled={isStudent && !hasPortugueseTask}>
                  <Link href={isTeacherOrAdmin ? '/tarefas' : (isStudent ? '/tarefas' : '/portugues')}>
                    {isTeacherOrAdmin ? "Criar Jogo Interativo" : (isStudent ? 'Ver Tarefas' : 'Começar a Praticar')} <ArrowRight className="ml-2" />
                  </Link>
                </Button>
             ) : (
                <Button asChild className="w-full">
                  <Link href="/login">
                    Logar para Visualizar <LogIn className="ml-2" />
                  </Link>
                </Button>
             )}
          </CardFooter>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="w-8 h-8 text-primary" />
              <span className="text-2xl font-headline">Jogos da Memória</span>
            </CardTitle>
            <CardDescription>
              {isTeacherOrAdmin
                ? "Crie jogos de memória para associar conceitos."
                : "Desafie sua memória e encontre os pares."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {memoryImage && <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                <Image
                  src={memoryImage.imageUrl}
                  alt={memoryImage.description}
                  fill
                  style={{ objectFit: 'cover' }}
                  data-ai-hint={memoryImage.imageHint}
                />
            </div>}
            <p className="mb-4 text-muted-foreground">
              Associe palavras, imagens e números de forma divertida e interativa.
            </p>
          </CardContent>
          <CardFooter>
            {user ? (
                <Button asChild className="w-full" disabled={isStudent && !hasMemoryTask}>
                  <Link href={isTeacherOrAdmin ? '/tarefas' : (isStudent ? '/tarefas' : '/memoria')}>
                    {isTeacherOrAdmin ? "Criar Jogo da Memória" : (isStudent ? 'Ver Tarefas' : 'Começar a Jogar')} <ArrowRight className="ml-2" />
                  </Link>
                </Button>
            ) : (
                <Button asChild className="w-full">
                  <Link href="/login">
                    Logar para Visualizar <LogIn className="ml-2" />
                  </Link>
                </Button>
            )}
          </CardFooter>
        </Card>

        {showPrintCard && (
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-8 h-8 text-primary" />
                <span className="text-2xl font-headline">Atividades para Imprimir</span>
              </CardTitle>
              <CardDescription>
                {isTeacherOrAdmin
                  ? "Gere folhas de atividades para usar em sala de aula ou como reforço."
                  : "Gere folhas de atividades personalizadas para aprender offline."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {printingImage && <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                  <Image
                    src={printingImage.imageUrl}
                    alt={printingImage.description}
                    fill
                    style={{ objectFit: 'cover' }}
                    data-ai-hint={printingImage.imageHint}
                  />
              </div>}
              <p className="mb-4 text-muted-foreground">
                Formatadas para baixa visão com alto contraste e fontes grandes.
              </p>
            </CardContent>
            <CardFooter>
               {user ? (
                    <Button asChild className="w-full">
                      <Link href="/imprimir">
                        Gerar Atividade <ArrowRight className="ml-2" />
                      </Link>
                    </Button>
               ) : (
                    <Button asChild className="w-full">
                      <Link href="/login">
                        Logar para Visualizar <LogIn className="ml-2" />
                      </Link>
                    </Button>
               )}
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
