'use client';

import { Suspense } from 'react';
import InteractiveGame from '@/app/tarefas/interactive-game';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Frown } from 'lucide-react';

function PortugueseGamePageContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');

  if (!taskId) {
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
        <CardTitle className="text-4xl font-headline">Exercício de Português</CardTitle>
        <CardDescription className="text-lg max-w-xl mx-auto">
          Mergulhe nos exercícios, complete as frases e mostre que você domina o idioma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InteractiveGame subject="portuguese" />
      </CardContent>
    </Card>
  );
}

export default function PortuguesePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Suspense fallback={<div className="text-2xl">Carregando...</div>}>
        <PortugueseGamePageContent />
      </Suspense>
    </div>
  );
}
