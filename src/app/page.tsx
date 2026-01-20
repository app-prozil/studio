'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Book, Calculator, Printer, LogIn } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const mathImage = PlaceHolderImages.find(img => img.id === 'math-learning');
  const portugueseImage = PlaceHolderImages.find(img => img.id === 'portuguese-reading');
  const printingImage = PlaceHolderImages.find(img => img.id === 'printable-worksheets');
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // This data is only needed if the user is logged in
  const teacherDocRef = useMemoFirebase(() => (user ? doc(firestore, 'teachers', user.uid) : null), [firestore, user]);
  const { data: teacherProfile, isLoading: isTeacherLoading } = useDoc(teacherDocRef);
  
  const studentDocRef = useMemoFirebase(() => (user ? doc(firestore, 'students', user.uid) : null), [firestore, user]);
  const { data: studentProfile, isLoading: isStudentLoading } = useDoc(studentDocRef);

  const isStudent = !!studentProfile;
  const isTeacherOrAdmin = !!teacherProfile || user?.uid === 'yUKh2hnexMdiTd2t9rXEU0SgjPk1';
  
  const tasksQuery = useMemoFirebase(() => 
    (isStudent && user) 
      ? query(collection(firestore, 'students', user.uid, 'tasks'), where('isCompleted', '==', false)) 
      : null, 
    [firestore, isStudent, user]
  );
  const { data: tasks, isLoading: isLoadingTasks } = useCollection(tasksQuery);

  const hasMathTask = tasks?.some(t => t.subject === 'matematica');
  const hasPortugueseTask = tasks?.some(t => t.subject === 'portugues');

  // Unified loading state
  const isLoading = isUserLoading || (user && (isTeacherLoading || isStudentLoading || isLoadingTasks));

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

        {showPrintCard && (
          <Card className="flex flex-col md:col-span-2 lg:col-span-1">
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
