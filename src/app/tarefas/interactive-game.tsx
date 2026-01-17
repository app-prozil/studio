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
import { cn } from '@/lib/utils';

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

const testDriveMathQuestions: Question[] = [
    { text: 'Quanto é 5 + 3?', options: ['7', '8', '9'], answer: '8' },
    { text: 'Qual número vem depois de 9?', options: ['8', '10', '11'], answer: '10' },
    { text: 'Conte os emojis: 👍👍👍👍👍', options: ['4', '5', '6'], answer: '5' },
    { text: 'Quanto é 4 - 2?', options: ['1', '2', '3'], answer: '2' },
    { text: 'Qual número vem antes de 7?', options: ['5', '6', '8'], answer: '6' },
    { text: 'Quanto é 10 + 0?', options: ['0', '1', '10'], answer: '10' },
    { text: 'Conte os emojis: 🚗🚗🚗', options: ['2', '3', '4'], answer: '3' },
    { text: 'Qual forma tem 4 lados iguais?', options: ['Círculo', 'Triângulo', 'Quadrado'], answer: 'Quadrado' },
    { text: 'Quanto é 3 + 3?', options: ['5', '6', '7'], answer: '6' },
    { text: 'Qual número é maior: 8 ou 6?', options: ['8', '6', 'Iguais'], answer: '8' },
];

const testDrivePortugueseQuestions: Question[] = [
    { text: "Qual o sinônimo de 'bonito'?", options: ["feio", "belo", "grande"], answer: "belo" },
    { text: "Complete com o verbo correto: Eu ___ pão.", options: ["como", "come", "comemos"], answer: "como" },
    { text: "O plural de 'menino' é ___.", options: ["menina", "meninos", "meninas"], answer: "meninos" },
    { text: "O contrário de 'abrir' é ___.", options: ["fechar", "correr", "pular"], answer: "fechar" },
    { text: "Qual animal faz 'Miau'?", options: ["Cachorro", "Gato", "Pássaro"], answer: "Gato" },
    { text: "A cor do sol é ___.", options: ["Azul", "Verde", "Amarelo"], answer: "Amarelo" },
    { text: "O que usamos para escrever?", options: ["Lápis", "Garfo", "Cama"], answer: "Lápis" },
    { text: "A primeira letra do alfabeto é ___.", options: ["B", "C", "A"], answer: "A" },
    { text: "O plural de 'cão' é ___.", options: ["cãos", "cães", "cãs"], answer: "cães" },
    { text: "Qual o feminino de 'pai'?", options: ["Tia", "Mãe", "Avó"], answer: "Mãe" },
];


const testDriveTaskBase = {
  id: 'test-drive',
  studentName: 'Visitante',
  isCompleted: false,
};


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
  const [gameState, setGameState] = useState<'playing' | 'showingAnswer' | 'feedback' | 'finished'>('playing');
  
  // Animation & reward state
  const [showMainConfetti, setShowMainConfetti] = useState(false);
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // Performance tracking state
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [currentAttempts, setCurrentAttempts] = useState(1);
  const taskStartTime = useMemo(() => Date.now(), []);


  // Task parameters from URL
  const taskId = searchParams.get('taskId');
  const studentId = searchParams.get('studentId');
  const isTestDrive = taskId === 'test-drive';

  const [loadedTask, setLoadedTask] = useState<Task | null>(null);
  const [isGloballyLoading, setIsGloballyLoading] = useState(true);

  const taskDocRef = useMemoFirebase(
    () => (studentId && taskId && !isTestDrive ? doc(firestore, 'students', studentId, 'tasks', taskId) : null),
    [firestore, studentId, taskId, isTestDrive]
  );
  const { data: taskDataFromHook, isLoading: isTaskLoadingFromHook } = useDoc<Task>(taskDocRef);

  useEffect(() => {
    if (isTestDrive) {
        const questions = subject === 'math' ? testDriveMathQuestions : testDrivePortugueseQuestions;
        const mockTask: Task = { ...testDriveTaskBase, questions, subject };
        setLoadedTask(mockTask);
        setIsGloballyLoading(false);
    } else if (taskDataFromHook) {
        if (taskDataFromHook.isCompleted) {
            toast({ title: 'Tarefa já concluída', description: 'Você já finalizou esta atividade.' });
            router.push('/tarefas');
            return;
        }
        setLoadedTask(taskDataFromHook);
        setIsGloballyLoading(false);
    } else if (!isTaskLoadingFromHook && !taskDataFromHook && !isTestDrive) {
        setIsGloballyLoading(false);
    }
  }, [taskDataFromHook, isTaskLoadingFromHook, isTestDrive, subject, router, toast]);

  useEffect(() => {
    if (loadedTask && loadedTask.questions) {
        const initialQuestions = loadedTask.questions.map(q => ({
            ...q,
            status: 'unanswered',
            attempts: 0,
        }));
        setQuestions(initialQuestions);
        setGameState('playing');
    }
  }, [loadedTask]);


  useEffect(() => {
    // When a new question is loaded, reset attempts and start the timer for it.
    setQuestionStartTime(Date.now());
    setCurrentAttempts(1);
  }, [currentQuestionIndex]);

  const completeTask = useCallback(async (finalQuestions: Question[]) => {
    const correctCount = finalQuestions.filter(q => q.status === 'correct').length;
    const score = Math.round((correctCount / finalQuestions.length) * 100);
    setFinalScore(score);

    if (isTestDrive || !taskDocRef) {
        return;
    }
    
    const totalTime = Math.round((Date.now() - taskStartTime) / 1000); // in seconds
    
    try {
      await updateDoc(taskDocRef, { 
        isCompleted: true,
        completedAt: new Date().toISOString(),
        totalTime: totalTime,
        questions: finalQuestions, // Make sure final question state is saved
      });
    } catch (e) {
      console.error("Erro ao finalizar tarefa: ", e);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível marcar a tarefa como concluída.' });
    }
  }, [taskDocRef, taskStartTime, toast, isTestDrive]);

  const handleAnswer = useCallback(async (option: string) => {
    if (gameState !== 'playing') return;

    setGameState('showingAnswer');
    const timeTaken = Date.now() - questionStartTime;
    setSelectedAnswer(option);

    const currentQuestion = questions[currentQuestionIndex];
    const correct = subject === 'math'
      ? parseFloat(option) === parseFloat(currentQuestion.answer)
      : option === currentQuestion.answer;

    setIsCorrect(correct);

    const updatedQuestions = questions.map((q, index) => {
      if (index === currentQuestionIndex) {
        return {
            ...q,
            studentAnswer: option,
            timeTaken: (q.timeTaken || 0) + timeTaken,
            attempts: (q.attempts || 0) + 1,
            // Only set final status on the first attempt
            status: q.attempts === 0 ? (correct ? 'correct' : 'incorrect') : q.status,
        };
      }
      return q;
    });
    setQuestions(updatedQuestions);

    if (taskDocRef && !isTestDrive) {
        updateDoc(taskDocRef, { questions: updatedQuestions }).catch(e => {
            console.error("Failed to update question performance", e)
        });
    }

    if (correct) {
        setShowMainConfetti(true);
        setTimeout(() => {
             setGameState('feedback');
        }, 1500);
    } else {
        setTimeout(() => {
            setSelectedAnswer(null);
            setIsCorrect(null);
            setGameState('playing');
        }, 2000);
    }
  }, [gameState, questionStartTime, questions, currentQuestionIndex, subject, taskDocRef, isTestDrive]);

  const handleNextQuestion = useCallback(() => {
    setShowMainConfetti(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    
    if (currentQuestionIndex === questions.length - 1) {
      const finalQuestions = questions.map(q => {
          // If a question was never answered, mark it as unanswered.
          if (q.status === 'unanswered') return { ...q, status: 'unanswered' as const };
          return q;
      })
      setQuestions(finalQuestions);
      completeTask(finalQuestions);
      setGameState('finished');
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setGameState('playing');
    }
  }, [currentQuestionIndex, questions, completeTask]);

   useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) return;

      if (event.key === '1' && currentQuestion.options[0]) {
        handleAnswer(currentQuestion.options[0]);
      } else if (event.key === '2' && currentQuestion.options[1]) {
        handleAnswer(currentQuestion.options[1]);
      } else if (event.key === '3' && currentQuestion.options[2]) {
        handleAnswer(currentQuestion.options[2]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState, handleAnswer, questions, currentQuestionIndex]);

  if (isGloballyLoading) {
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

  if (!loadedTask || questions.length === 0) {
    return <div className="text-destructive-foreground text-center">Não foi possível carregar a atividade. Verifique se o link está correto ou tente novamente.</div>;
  }
  
  if (gameState === 'finished') {
    const studentName = loadedTask?.studentName || 'Visitante';
    return (
      <div className="relative flex flex-col items-center justify-center text-center h-96 space-y-4">
        {!isGiftOpened ? (
          <>
            <h2 className="text-4xl font-bold">Parabéns, {studentName}!</h2>
            <p className="text-2xl text-muted-foreground">Você concluiu a tarefa!</p>
            <button onClick={() => setIsGiftOpened(true)} className="animate-gift-bounce focus:outline-none">
              <Gift className="w-40 h-40 text-primary" />
              <span className="mt-4 block text-lg font-semibold">Clique no seu prêmio!</span>
            </button>
          </>
        ) : (
          <>
            {width > 0 && height > 0 && <Confetti width={width} height={height} recycle={false} numberOfPieces={800} gravity={0.08} />}
            <div className="animate-score-reveal flex flex-col items-center gap-4 p-8 bg-card/80 backdrop-blur-sm rounded-lg shadow-2xl">
              <h2 className="text-3xl font-bold">Sua pontuação!</h2>
              <p className="text-7xl font-bold text-accent">{finalScore}%</p>
              <p className="text-xl font-medium">de acertos</p>
              <Button onClick={() => router.push('/tarefas')} size="lg" className="text-lg mt-4">
                  Voltar para Tarefas <ArrowRight className="ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }
  
  if (gameState === 'feedback') {
    return (
        <div className="relative flex flex-col items-center justify-center text-center h-96 space-y-6">
            {width > 0 && height > 0 && showMainConfetti && (
              <Confetti width={width} height={height} recycle={false} numberOfPieces={400} gravity={0.1} />
            )}
            <CheckCircle className="w-24 h-24 text-success" />
            <h2 className="text-5xl font-bold">Muito bem!</h2>
            <Button onClick={handleNextQuestion} size="lg" className="text-2xl mt-4">
                Próxima Pergunta <ArrowRight className="ml-2" />
            </Button>
        </div>
    )
  }


  const currentQuestion = questions[currentQuestionIndex];
  const questionText = subject === 'portuguese' ? currentQuestion.text.replace('___', '_____') : currentQuestion.text;

  return (
    <div className="relative">
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
              className={cn(
                  'h-32 text-4xl font-bold relative',
                  selectedAnswer === option && 'animate-option-click',
                  selectedAnswer === option && isCorrect === true && 'animate-correct-answer'
              )}
              disabled={gameState !== 'playing'}
            >
              <span className="absolute top-2 left-3 text-lg font-mono bg-background/50 text-foreground rounded-full h-8 w-8 flex items-center justify-center border-2">{index + 1}</span>
              {option}
            </Button>
          ))}
        </div>
        {gameState === 'showingAnswer' && isCorrect !== null && (
          <div className={`flex items-center justify-center text-4xl font-bold`}>
              {isCorrect ? <CheckCircle className="w-16 h-16 text-success mr-4"/> : <XCircle className="w-16 h-16 text-destructive mr-4"/>}
              {isCorrect ? 'Correto!' : 'Tente de novo!'}
          </div>
        )}
      </div>
    </div>
  );
}
