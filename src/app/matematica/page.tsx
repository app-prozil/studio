'use client';

import { Suspense } from 'react';
import InteractiveGame from '@/app/tarefas/interactive-game';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// This component is wrapped in Suspense because InteractiveGame uses useSearchParams()
function MathGamePage() {
  return (
    <Card className="w-full max-w-3xl text-center">
      <CardHeader>
        <CardTitle className="text-4xl font-headline">Jogo de Matemática</CardTitle>
        <CardDescription className="text-lg">
          Resolva os desafios para completar a tarefa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InteractiveGame subject="math" />
      </CardContent>
    </Card>
  );
}

// The outer component that renders the Suspense fallback
export default function MathPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Suspense fallback={<div className="text-2xl">Carregando jogo...</div>}>
        <MathGamePage />
      </Suspense>
    </div>
  );
}
