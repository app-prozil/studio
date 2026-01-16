'use client';

import { Suspense } from 'react';
import InteractiveGame from '@/app/tarefas/interactive-game';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// This component is wrapped in Suspense because InteractiveGame uses useSearchParams()
function PortugueseGamePage() {
  return (
    <Card className="w-full max-w-3xl text-center">
      <CardHeader>
        <CardTitle className="text-4xl font-headline">Exercício de Português</CardTitle>
        <CardDescription className="text-lg">
          Complete as frases para completar a tarefa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InteractiveGame subject="portuguese" />
      </CardContent>
    </Card>
  );
}

// The outer component that renders the Suspense fallback
export default function PortuguesePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Suspense fallback={<div className="text-2xl">Carregando exercício...</div>}>
        <PortugueseGamePage />
      </Suspense>
    </div>
  );
}
