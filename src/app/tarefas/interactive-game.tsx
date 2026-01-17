'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Volume2, ArrowRight, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Confetti from 'react-confetti';

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
    teacherId: string;
    questions: Question[];
    subject: 'math' | 'portuguese';
    studentName?: string;
    isCompleted?: boolean;
    // Performance fields
    completedAt?: string;
    totalTime?: number;
}

const testDriveMathQuestions: Question[] = [
    { text: 'QUANTO É 5 + 3?', options: ['7', '8', '9'], answer: '8' },
    { text: 'QUAL NÚMERO VEM DEPOIS DE 9?', options: ['8', '10', '11'], answer: '10' },
    { text: 'CONTE OS EMOJIS: 👍👍👍👍👍', options: ['4', '5', '6'], answer: '5' },
    { text: 'QUANTO É 4 - 2?', options: ['1', '2', '3'], answer: '2' },
    { text: 'QUAL NÚMERO VEM ANTES DE 7?', options: ['5', '6', '8'], answer: '6' },
    { text: 'QUANTO É 10 + 0?', options: ['0', '1', '10'], answer: '10' },
    { text: 'CONTE OS EMOJIS: 🚗🚗🚗', options: ['2', '3', '4'], answer: '3' },
    { text: 'QUAL FORMA TEM 4 LADOS IGUAIS?', options: ['CÍRCULO', 'TRIÂNGULO', 'QUADRADO'], answer: 'QUADRADO' },
    { text: 'QUANTO É 3 + 3?', options: ['5', '6', '7'], answer: '6' },
    { text: 'QUAL NÚMERO É MAIOR: 8 OU 6?', options: ['8', '6', 'IGUAIS'], answer: '8' },
];

const testDrivePortugueseQuestions: Question[] = [
    { text: "QUAL O SINÔNIMO DE 'BONITO'?", options: ["FEIO", "BELO", "GRANDE"], answer: "BELO" },
    { text: "COMPLETE COM O VERBO CORRETO: EU ___ PÃO.", options: ["COMO", "COME", "COMEMOS"], answer: "COMO" },
    { text: "O PLURAL DE 'MENINO' É ___.", options: ["MENINA", "MENINOS", "MENINAS"], answer: "MENINOS" },
    { text: "O CONTRÁRIO DE 'ABRIR' É ___.", options: ["FECHAR", "CORRER", "PULAR"], answer: "FECHAR" },
    { text: "QUAL ANIMAL FAZ 'MIAU'?", options: ["CACHORRO", "GATO", "PÁSSARO"], answer: "GATO" },
    { text: "A COR DO SOL É ___.", options: ["AZUL", "VERDE", "AMARELO"], answer: "AMARELO" },
    { text: "O QUE USAMOS PARA ESCREVER?", options: ["LÁPIS", "GARFO", "CAMA"], answer: "LÁPIS" },
    { text: "A PRIMEIRA LETRA DO ALFABETO É ___.", options: ["B", "C", "A"], answer: "A" },
    { text: "O PLURAL DE 'CÃO' É ___.", options: ["CÃOS", "CÃES", "CÃS"], answer: "CÃES" },
    { text: "QUAL O FEMININO DE 'PAI'?", options: ["TIA", "MÃE", "AVÓ"], answer: "MÃE" },
];


const testDriveTaskBase = {
  id: 'test-drive',
  teacherId: 'test-teacher',
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
  const { user, isUserLoading: isAuthLoading } = useUser();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'showingAnswer' | 'finished'>('loading');
  
  // Animation & reward state
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Performance tracking state
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const taskStartTime = useMemo(() => Date.now(), []);


  // Task parameters from URL
  const taskId = searchParams.get('taskId');
  const studentId = searchParams.get('studentId'); 
  const taskSource = searchParams.get('source') || 'student';
  const isTestMode = taskId === 'test-drive' || searchParams.get('mode') === 'test';
  const isTestDrive = taskId === 'test-drive';

  const [loadedTask, setLoadedTask] = useState<Task | null>(null);

  const collectionPath = taskSource === 'teacher' ? 'teachers' : 'students';

  const taskDocRef = useMemoFirebase(
    () => (
        !isTestDrive && !isAuthLoading && user && studentId && taskId 
        ? doc(firestore, collectionPath, studentId, 'tasks', taskId) 
        : null
    ),
    [firestore, studentId, taskId, isTestDrive, collectionPath, isAuthLoading, user]
  );
  
  const { data: taskDataFromHook, isLoading: isTaskLoadingFromHook } = useDoc<Task>(taskDocRef);

  useEffect(() => {
    if (isAuthLoading) {
      return; 
    }
    
    setGameState('loading');
    
    if (isTestDrive) {
        const questions = subject === 'math' ? testDriveMathQuestions : testDrivePortugueseQuestions;
        const mockTask: Task = { ...testDriveTaskBase, questions, subject };
        setLoadedTask(mockTask);
        setQuestions(mockTask.questions.map(q => ({...q, status: 'unanswered', attempts: 0 })));
        setGameState('playing');
    } else if (taskDataFromHook) {
        if (taskDataFromHook.isCompleted && !isTestMode && gameState !== 'finished') {
            toast({ title: 'Tarefa já concluída', description: 'Você já finalizou esta atividade.' });
            router.push('/tarefas');
            return;
        }
        setLoadedTask(taskDataFromHook);
        setQuestions(taskDataFromHook.questions.map(q => ({...q, status: q.status || 'unanswered', attempts: q.attempts || 0 })));
        setGameState('playing');
    }
  }, [taskDataFromHook, isTestDrive, subject, router, toast, isTestMode, isAuthLoading, gameState]);


  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);
  
  const completeTask = useCallback((finalQuestions: Question[]) => {
      if (isTestMode || !taskDocRef || !firestore || !loadedTask?.teacherId || !loadedTask.id) return;
        
      const totalTime = Math.round((Date.now() - taskStartTime) / 1000);
      const performanceData = {
        isCompleted: true,
        completedAt: new Date().toISOString(),
        totalTime: totalTime,
        questions: finalQuestions,
      };

      updateDoc(taskDocRef, performanceData).catch(e => {
        console.error("Erro ao finalizar tarefa (aluno): ", e);
      });
      
      const teacherTaskRef = doc(firestore, 'teachers', loadedTask.teacherId, 'tasks', loadedTask.id);
      updateDoc(teacherTaskRef, performanceData).catch(e => {
          console.error("Erro ao finalizar tarefa (professor): ", e);
          toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível sincronizar o resultado da tarefa com o professor.' });
      });
  }, [isTestMode, taskDocRef, firestore, loadedTask, taskStartTime, toast]);

  const handleNextQuestion = useCallback((updatedQuestions: Question[]) => {
    const isLastQuestion = currentQuestionIndex >= updatedQuestions.length - 1;

    if (isLastQuestion) {
        setGameState('finished');
        
        const correctCount = updatedQuestions.filter(q => q.status === 'correct').length;
        const score = Math.round((correctCount / updatedQuestions.length) * 100);
        setFinalScore(score);
        
        completeTask(updatedQuestions);
    } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setGameState('playing');
    }
  }, [currentQuestionIndex, completeTask]);

  const handleAnswer = useCallback((option: string) => {
    if (gameState !== 'playing') return;

    const timeTaken = Date.now() - questionStartTime;
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    const isAnswerCorrect = option.toUpperCase() === currentQuestion.answer.toUpperCase();
    
    setGameState('showingAnswer'); 
    setSelectedAnswer(option);
    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      setShowConfetti(true);
    }

    const updatedQuestions = questions.map((q, index) => {
        if (index === currentQuestionIndex) {
            const isAlreadyCorrect = q.status === 'correct';
            const newAttempts = (q.attempts || 0) + 1;
            
            return {
                ...q,
                studentAnswer: option,
                attempts: newAttempts,
                status: isAlreadyCorrect ? 'correct' : (isAnswerCorrect ? 'correct' : 'incorrect'),
                timeTaken: (q.timeTaken || 0) + timeTaken,
            };
        }
        return q;
    });
    setQuestions(updatedQuestions);

    if (taskDocRef && !isTestMode) {
        updateDoc(taskDocRef, { questions: updatedQuestions }).catch(e => {
            console.error("Failed to update question performance", e)
        });
    }

    setTimeout(() => {
        if (isAnswerCorrect) {
            setShowConfetti(false);
            handleNextQuestion(updatedQuestions);
        } else {
            setGameState('playing');
            setSelectedAnswer(null);
            setIsCorrect(null);
        }
    }, isAnswerCorrect ? 2000 : 2500);
  }, [gameState, questionStartTime, questions, currentQuestionIndex, taskDocRef, isTestMode, handleNextQuestion]);

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

  const isLoading = gameState === 'loading' || isAuthLoading || (isTaskLoadingFromHook && !isTestDrive);

  if (isLoading) {
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

  if (!isTestDrive && !isLoading && !loadedTask) {
    return <div className="text-destructive text-center">Não foi possível carregar a atividade. Verifique se o link está correto ou tente novamente.</div>;
  }
  
  if (gameState === 'finished') {
    const studentName = loadedTask?.studentName || 'Visitante';
    return (
      <div className="relative flex flex-col items-center justify-center text-center h-96 space-y-4">
        <div className={cn("particle-burst", isGiftOpened && "is-active")}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="particle" style={{'--i': i} as React.CSSProperties} />
          ))}
        </div>

        {!isGiftOpened ? (
          <>
            <h2 className="text-4xl font-bold z-10">PARABÉNS, {studentName.toUpperCase()}!</h2>
            <p className="text-2xl text-muted-foreground z-10">VOCÊ CONCLUIU A TAREFA!</p>
            <button onClick={() => setIsGiftOpened(true)} className="animate-gift-bounce focus:outline-none relative z-10">
              <Gift className="w-40 h-40 text-primary" />
              <span className="mt-4 block text-lg font-semibold">CLIQUE NO SEU PRÊMIO!</span>
            </button>
          </>
        ) : (
          <>
            {width > 0 && height > 0 && <Confetti width={width} height={height} recycle={false} numberOfPieces={800} gravity={0.08} />}
            <div className="animate-score-reveal flex flex-col items-center gap-4 p-8 bg-card/80 backdrop-blur-sm rounded-lg shadow-2xl relative z-10">
              <h2 className="text-3xl font-bold">SUA PONTUAÇÃO!</h2>
              <p className="text-7xl font-bold text-accent">{finalScore}%</p>
              <p className="text-xl font-medium">DE ACERTOS</p>
              <Button onClick={() => router.push('/tarefas')} size="lg" className="text-lg mt-4">
                  VOLTAR PARA TAREFAS <ArrowRight className="ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  
  if (!currentQuestion) {
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
  
  const questionText = subject === 'portuguese' ? currentQuestion.text.replace('___', '_____') : currentQuestion.text;

  return (
    <div className="relative">
      {showConfetti && width > 0 && height > 0 && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
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
        {gameState === 'showingAnswer' && (
          <div className={`flex items-center justify-center text-4xl font-bold`}>
              {isCorrect === true && <CheckCircle className="w-16 h-16 text-success mr-4"/>}
              {isCorrect === false && <XCircle className="w-16 h-16 text-destructive mr-4"/>}
              {isCorrect === true ? 'MUITO BEM!' : (isCorrect === false ? 'TENTE DE NOVO!' : '')}
          </div>
        )}
      </div>
    </div>
  );
}
