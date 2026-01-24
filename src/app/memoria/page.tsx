'use client';

import { Suspense } from 'react';
import InteractiveGame from '@/app/tarefas/interactive-game';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Frown, LogIn, Puzzle, Loader2, ClipboardCheck } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';


function MemoryGamePageContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const teacherDocRef = useMemoFirebase(() => (user ? doc(firestore, 'teachers', user.uid) : null), [firestore, user]);
  const { data: teacherProfile, isLoading: isTeacherLoading } = useDoc(teacherDocRef);
  const isTeacher = !!teacherProfile || user?.uid === 'yUKh2hnexMdiTd2t9rXEU0SgjPk1';

  if (isUserLoading || (user && isTeacherLoading)) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) {
    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-lg mx-auto text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                        <Puzzle className="w-12 h-12 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold font-headline">Jogos da Memória</CardTitle>
                    <CardDescription className="text-lg">
                       Teste sua memória e reforce seu conhecimento encontrando os pares corretos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Faça login para acessar seus jogos da memória.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Fazer Login para Jogar
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (!taskId) {
    if (isTeacher) {
        return (
            <Card className="w-full max-w-lg mx-auto text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                        <Puzzle className="w-12 h-12 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold font-headline">Área de Memória</CardTitle>
                    <CardDescription className="text-lg">
                        Crie e gerencie jogos da memória para seus alunos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Use o gerenciador de tarefas para criar novas atividades de memória.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/tarefas">
                            <ClipboardCheck className="mr-2 h-4 w-4" />
                            Ir para Tarefas
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }
    return (
      <Card className="w-full max-w-3xl text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-headline flex items-center justify-center gap-4">
            <Frown className="w-10 h-10 text-muted-foreground" /> Nenhuma Tarefa Selecionada
          </CardTitle>
          <CardDescription className="text-lg">
            Para jogar, você precisa iniciar uma atividade a partir da sua lista de tarefas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link href="/tarefas">Ir para Minhas Tarefas</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl text-center">
      <CardHeader>
        <CardTitle className="text-4xl font-headline">Jogo da Memória</CardTitle>
        <CardDescription className="text-lg max-w-xl mx-auto">
          Encontre todos os pares para completar o desafio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InteractiveGame subject="memoria" />
      </CardContent>
    </Card>
  );
}

export default function MemoryPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Suspense fallback={<div className="text-2xl">Carregando...</div>}>
        <MemoryGamePageContent />
      </Suspense>
    </div>
  );
}
