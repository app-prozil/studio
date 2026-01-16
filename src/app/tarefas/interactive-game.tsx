'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Confetti from 'react-confetti';

import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Volume2, ArrowRight, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type Question = {
  text: string;
  options: string[];
  answer: string;
  // Performance fields
  studentAnswer?: string;
  attempts?: number;
  status?: 'correct' | 'incorrect' | 'unanswered';
  timeTaken?: number;
};

type Task = {
    id: string;
    questions: Question[];
    subject: 'math' | 'portuguese';
    studentName?: string;
    isCompleted?: boolean;
    // Performance fields
    completedAt?: string;
    totalTime?: number;
}

type InteractiveGameProps = {
  subject: 'math' | 'portuguese';
};

function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return { width: size[0], height: size[1] };
}

export default function InteractiveGame({ subject }: InteractiveGameProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { width, height } = useWindowSize();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);
  
  // Animation & reward state
  const [showCorrectAnswerConfetti, setShowCorrectAnswerConfetti] = useState(false);
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Performance tracking state
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [currentAttempts, setCurrentAttempts] = useState(1);
  const taskStartTime = useMemo(() => Date.now(), []);


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
      // If task is already completed, redirect.
      if (taskData.isCompleted) {
        toast({ title: 'Tarefa já concluída', description: 'Você já finalizou esta atividade.' });
        router.push('/tarefas');
        return;
      }
      setQuestions(taskData.questions);
    }
  }, [taskData, router, toast]);

  useEffect(() => {
    // When a new question is loaded, reset attempts and start the timer for it.
    setQuestionStartTime(Date.now());
    setCurrentAttempts(1);
  }, [currentQuestionIndex]);

  const completeTask = useCallback(async (finalQuestions: Question[]) => {
    if (!taskDocRef) return;
    const totalTime = Math.round((Date.now() - taskStartTime) / 1000); // in seconds
    
    const correctCount = finalQuestions.filter(q => q.status === 'correct').length;
    const score = Math.round((correctCount / finalQuestions.length) * 100);
    setFinalScore(score);
    
    try {
      await updateDoc(taskDocRef, { 
        isCompleted: true,
        completedAt: new Date().toISOString(),
        totalTime: totalTime,
      });
    } catch (e) {
      console.error("Erro ao finalizar tarefa: ", e);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível marcar a tarefa como concluída.' });
    }
  }, [taskDocRef, taskStartTime, toast]);

  const handleAnswer = async (option: string) => {
    if (selectedAnswer !== null) return;
    
    const timeTaken = Date.now() - questionStartTime;
    setSelectedAnswer(option);
    
    const currentQuestion = questions[currentQuestionIndex];
    const correct = subject === 'math' 
      ? parseFloat(option) === parseFloat(currentQuestion.answer)
      : option === currentQuestion.answer;
    
    setIsCorrect(correct);
    
    const updatedQuestions = questions.map((q, index) => 
        index === currentQuestionIndex 
        ? {
            ...q,
            studentAnswer: option,
            attempts: currentAttempts,
            timeTaken: timeTaken,
            status: correct ? 'correct' : 'incorrect',
        }
        : q
    );
    setQuestions(updatedQuestions);
    
    if (taskDocRef) {
        updateDoc(taskDocRef, { questions: updatedQuestions }).catch(e => {
            console.error("Failed to update question performance", e)
        });
    }

    setTimeout(() => {
        setSelectedAnswer(null);
        setIsCorrect(null);
        if (correct) {
            setShowCorrectAnswerConfetti(true);
            setTimeout(() => setShowCorrectAnswerConfetti(false), 4000);

            if (currentQuestionIndex === questions.length - 1) {
                setIsGameComplete(true);
                completeTask(updatedQuestions);
            } else {
                setCurrentQuestionIndex((prev) => prev + 1);
            }
        } else {
            setCurrentAttempts(prev => prev + 1);
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
      <div className="relative flex flex-col items-center justify-center text-center h-64 space-y-4">
        {width > 0 && height > 0 && (
          <Confetti width={width} height={height} recycle={true} numberOfPieces={200} />
        )}
        
        {!isGiftOpened ? (
          <>
            <h2 className="text-3xl font-bold">Parabéns, {studentName}!</h2>
            <p className="text-xl text-muted-foreground">Você concluiu a tarefa!</p>
            <button onClick={() => setIsGiftOpened(true)} className="animate-bounce">
              <Gift className="w-32 h-32 text-primary" />
              <span className="mt-2 block font-semibold">Clique no seu prêmio!</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8 bg-card/80 backdrop-blur-sm rounded-lg shadow-2xl">
            <h2 className="text-3xl font-bold">Seu prêmio!</h2>
            <p className="text-6xl font-bold text-accent">{finalScore}%</p>
            <p className="text-lg font-medium">de acertos</p>
            <Button onClick={() => router.push('/tarefas')} className="text-lg mt-4">
                Voltar para Tarefas <ArrowRight className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const questionText = subject === 'portuguese' ? currentQuestion.text.replace('___', '_____') : currentQuestion.text;

  return (
    <div className="relative">
      {width > 0 && height > 0 && showCorrectAnswerConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={100}
          />
      )}
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
    </div>
  );
}
