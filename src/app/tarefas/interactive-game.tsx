'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Volume2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type Question = {
  text: string;
  options: string[];
  answer: string;
};

type Task = {
    id: string;
    questions: Question[];
    subject: 'math' | 'portuguese';
    studentName?: string;
}

type InteractiveGameProps = {
  subject: 'math' | 'portuguese';
};

export default function InteractiveGame({ subject }: InteractiveGameProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);

  // Task parameters from URL
  const taskId = searchParams.get('taskId');
  const studentId = searchParams.get('studentId');

  const taskDocRef = useMemoFirebase(
    () => (studentId && taskId ? doc(firestore, 'students', studentId, 'tasks', taskId) : null),
    [firestore, studentId, taskId]
  );
  const { data: taskData, isLoading: isTaskLoading } = useDoc<Task>(taskDocRef);

  useEffect(() => {
    if (taskData && taskData.questions) {
      setQuestions(taskData.questions);
    }
  }, [taskData]);

  const completeTask = useCallback(async () => {
    if (!taskDocRef) return;
    try {
      await updateDoc(taskDocRef, { isCompleted: true });
    } catch (e) {
      console.error("Erro ao atualizar tarefa: ", e);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível marcar a tarefa como concluída.' });
    }
  }, [taskDocRef, toast]);

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(option);
    const currentQuestion = questions[currentQuestionIndex];
    const correct = subject === 'math' 
      ? parseFloat(option) === parseFloat(currentQuestion.answer)
      : option === currentQuestion.answer;
    
    setIsCorrect(correct);
    
    setTimeout(() => {
        setSelectedAnswer(null);
        setIsCorrect(null);
        if (correct) {
            if (currentQuestionIndex === questions.length - 1) {
                // Last question answered correctly
                setIsGameComplete(true);
                completeTask();
            } else {
                setCurrentQuestionIndex((prev) => prev + 1);
            }
        }
    }, 2000);
  };

  if (isTaskLoading) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    );
  }

  if (!taskData || questions.length === 0) {
    return <div className="text-destructive-foreground text-center">Não foi possível carregar a atividade. Verifique se o link está correto ou tente novamente.</div>;
  }
  
  if (isGameComplete) {
    const studentName = taskData?.studentName || 'aluno(a)';
    return (
        <div className="flex flex-col items-center justify-center text-center h-48 space-y-4">
            <CheckCircle className="w-24 h-24 text-success" />
            <h2 className="text-3xl font-bold">Parabéns, {studentName}, tarefa concluída!</h2>
            <Button onClick={() => router.push('/tarefas')} className="text-lg">
                Voltar para Tarefas <ArrowRight className="ml-2" />
            </Button>
        </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const questionText = subject === 'portuguese' ? currentQuestion.text.replace('___', '_____') : currentQuestion.text;

  return (
    <div className="space-y-8">
      <div className="relative p-8 border-4 border-dashed rounded-lg border-accent">
        <p className={`font-bold ${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'}`}>
            {questionText}
        </p>
        <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => {
            const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
            utterance.lang = 'pt-BR';
            window.speechSynthesis.speak(utterance);
        }}>
          <Volume2 className="w-8 h-8" />
          <span className="sr-only">Ler em voz alta</span>
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {currentQuestion.options.map((option, index) => (
          <Button
            key={index}
            onClick={() => handleAnswer(option)}
            variant={selectedAnswer === option ? (isCorrect ? 'success' : 'destructive') : 'default'}
            className='h-32 text-4xl font-bold'
            disabled={selectedAnswer !== null}
          >
            {option}
          </Button>
        ))}
      </div>
      {isCorrect !== null && (
        <div className={`flex items-center justify-center text-4xl font-bold ${isCorrect ? 'text-success-foreground' : 'text-destructive-foreground'}`}>
            {isCorrect ? <CheckCircle className="w-16 h-16 text-success mr-4"/> : <XCircle className="w-16 h-16 text-destructive mr-4"/>}
            {isCorrect ? 'Muito bem!' : 'Ops, tente de novo!'}
        </div>
      )}
    </div>
  );
}
