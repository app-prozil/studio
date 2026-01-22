'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Volume2, ArrowRight, Gift } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Confetti from 'react-confetti';

type Question = {
  text: string;
  text2?: string;
  options: string[];
  answer: string;
  questionType?: 'multiple_choice' | 'fill_in_the_blank';
  // Performance fields
  studentAnswer?: string;
  attempts?: number;
  status?: 'correct' | 'incorrect' | 'unanswered';
  timeTaken?: number;
};

type Task = {
    id: string;
    teacherId: string;
    studentId: string;
    questions: Question[];
    subject: 'math' | 'portuguese';
    studentName?: string;
    isCompleted?: boolean;
    // Performance fields
    completedAt?: string;
    totalTime?: number;
}

const testDriveMathQuestions: Question[] = [
    { text: 'QUANTO É 5 + 3?', options: ['7', '8', '9'], answer: '8', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: 'QUAL NÚMERO VEM DEPOIS DE 9?', options: ['8', '10', '11'], answer: '10', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: 'CONTE OS EMOJIS:', text2: '👍👍👍👍👍', options: ['4', '5', '6'], answer: '5', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: 'QUANTO É 4 - 2?', options: ['1', '2', '3'], answer: '2', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: '2 + 2 = ___', options: ['4', '3', '5'], answer: '4', status: 'unanswered', attempts: 0, questionType: 'fill_in_the_blank' },
    { text: 'QUAL NÚMERO VEM ANTES DE 7?', options: ['5', '6', '8'], answer: '6', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: 'QUANTO É 10 + 0?', options: ['0', '1', '10'], answer: '10', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: 'CONTE OS EMOJIS:', text2: '🚗🚗🚗', options: ['2', '3', '4'], answer: '3', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: 'QUAL FORMA TEM 4 LADOS IGUAIS?', options: ['CÍRCULO', 'TRIÂNGULO', 'QUADRADO'], answer: 'QUADRADO', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: 'QUANTO É 3 + 3?', options: ['5', '6', '7'], answer: '6', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: 'QUAL NÚMERO É MAIOR: 8 OU 6?', options: ['8', '6', 'IGUAIS'], answer: '8', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
];

const testDrivePortugueseQuestions: Question[] = [
    { text: "QUAL O SINÔNIMO DE 'BONITO'?", options: ["FEIO", "BELO", "GRANDE"], answer: "BELO", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "COMPLETE COM O VERBO CORRETO: EU ___ PÃO.", options: ["COMO", "COME", "COMEMOS"], answer: "COMO", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "O PLURAL DE 'MENINO' É ___.", options: ["MENINA", "MENINOS", "MENINAS"], answer: "MENINOS", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "O CONTRÁRIO DE 'ABRIR' É ___.", options: ["FECHAR", "CORRER", "PULAR"], answer: "FECHAR", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "A ___ é azul.", text2: "🌊", options: ["ÁGUA", "BOLA", "CASA"], answer: "ÁGUA", status: 'unanswered', attempts: 0, questionType: 'fill_in_the_blank' },
    { text: "QUAL ANIMAL FAZ 'MIAU'?", options: ["CACHORRO", "GATO", "PÁSSARO"], answer: "GATO", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "A COR DO SOL É ___.", options: ["AZUL", "VERDE", "AMARELO"], answer: "AMARELO", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "O QUE USAMOS PARA ESCREVER?", options: ["LÁPIS", "GARFO", "CAMA"], answer: "LÁPIS", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "A PRIMEIRA LETRA DO ALFABETO É ___.", options: ["B", "C", "A"], answer: "A", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "O PLURAL DE 'CÃO' É ___.", options: ["CÃOS", "CÃES", "CÃS"], answer: "CÃES", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "QUAL O FEMININO DE 'PAI'?", options: ["TIA", "MÃE", "AVÓ"], answer: "MÃE", status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
];


const testDriveTaskBase = {
  id: 'test-drive',
  teacherId: 'test-teacher',
  studentId: 'test-user',
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

  const [task, setTask] = useState<Task | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'showingAnswer' | 'finished'>('loading');
  
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showEndConfetti, setShowEndConfetti] = useState(false);
  const [showCorrectAnswerModal, setShowCorrectAnswerModal] = useState(false);


  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const taskStartTime = useMemo(() => Date.now(), []);


  const taskId = searchParams.get('taskId');
  const studentId = searchParams.get('studentId'); 
  
  useEffect(() => {
    const isTestDrive = taskId === 'test-drive';
    const isTestMode = isTestDrive || searchParams.get('mode') === 'test';
    const taskSource = searchParams.get('source') || 'student';
    const collectionPath = taskSource === 'teacher' ? 'teachers' : 'students';

    // 1. Wait for auth to be ready
    if (isAuthLoading) {
      setGameState('loading');
      return;
    }

    // 2. Handle Test Drive mode separately
    if (isTestDrive) {
      setGameState('loading');
      const questionsForTest = subject === 'math' ? testDriveMathQuestions : testDrivePortugueseQuestions;
      const mockTask: Task = { ...testDriveTaskBase, questions: questionsForTest, subject };
      setTask(mockTask);
      setQuestions(mockTask.questions.map(q => ({...q, status: 'unanswered', attempts: 0 })));
      setGameState('playing');
      return;
    }

    // 3. From this point, a real user is required
    if (!user) {
      // This case should ideally not be hit if navigation is protected, but as a safeguard.
      toast({ variant: "destructive", title: "Acesso Negado", description: "Você precisa estar logado."});
      router.push('/login');
      return;
    }

    // 4. Validate required URL parameters
    if (!studentId || !taskId) {
      toast({ variant: "destructive", title: "Tarefa não encontrada", description: "O link da tarefa parece estar incompleto."});
      setGameState('finished'); // Go to a safe final state
      return;
    }

    // 5. Fetch the task
    setGameState('loading');
    const taskDocRef = doc(firestore, collectionPath, studentId, 'tasks', taskId);
    
    getDoc(taskDocRef).then(docSnap => {
      if (docSnap.exists()) {
        const taskData = docSnap.data() as Task;
        
        // Prevent re-doing a completed task unless in test mode
        if (taskData.isCompleted && !isTestMode) {
          toast({ title: 'Tarefa já concluída', description: 'Você já finalizou esta atividade.' });
          router.push('/tarefas'); // Navigate away
          return;
        }

        setTask(taskData);
        // Initialize question state with status and attempts
        const initialQuestions = taskData.questions.map(q => ({...q, status: q.status || 'unanswered', attempts: q.attempts || 0 }));
        setQuestions(initialQuestions);
        
        // Find where the user left off
        const lastUnansweredIndex = initialQuestions.findIndex(q => q.status !== 'correct');
        setCurrentQuestionIndex(lastUnansweredIndex >= 0 ? lastUnansweredIndex : 0);

        setGameState('playing');
      } else {
        toast({ variant: "destructive", title: "Tarefa não encontrada"});
        setGameState('finished');
      }
    }).catch(e => {
      console.error("Error loading task:", e);
      toast({ variant: "destructive", title: "Erro ao carregar tarefa" });
      setGameState('finished');
    });

  }, [isAuthLoading, user, taskId, studentId, subject, firestore, router, toast]);


  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);
  
  const completeTask = useCallback((finalQuestions: Question[]) => {
    const isTestDrive = taskId === 'test-drive';
    const isTestMode = isTestDrive || searchParams.get('mode') === 'test';
    
    // If it's a test drive or test mode by a teacher, don't save performance data.
    if (isTestMode) return;

    if (!firestore || !user || !task?.teacherId || !task.id || !task.studentId) {
        console.error("Aborting task completion: missing critical data.", { task, user: !!user });
        return;
    }
        
      const totalTime = Math.round((Date.now() - taskStartTime) / 1000);
      const performanceData = {
        isCompleted: true,
        completedAt: new Date().toISOString(),
        totalTime: totalTime,
        questions: finalQuestions,
      };
      
      // Always use the studentId from the task data itself for reliability
      const studentTaskRef = doc(firestore, 'students', task.studentId, 'tasks', task.id);
      updateDoc(studentTaskRef, performanceData).catch(e => {
        console.error("Erro ao finalizar tarefa (aluno): ", e);
      });
      
      const teacherTaskRef = doc(firestore, 'teachers', task.teacherId, 'tasks', task.id);
      updateDoc(teacherTaskRef, performanceData).catch(e => {
          console.error("Erro ao finalizar tarefa (professor): ", e);
          toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível sincronizar o resultado da tarefa com o professor.' });
      });
  }, [firestore, user, task, taskStartTime, toast, taskId, searchParams]);

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

    const isTestMode = taskId === 'test-drive' || searchParams.get('mode') === 'test';
    const taskSource = searchParams.get('source') || 'student';
    const collectionPath = taskSource === 'teacher' ? 'teachers' : 'students';
    const timeTaken = Date.now() - questionStartTime;
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    const isAnswerCorrect = option.toUpperCase() === currentQuestion.answer.toUpperCase();
    
    setGameState('showingAnswer'); 
    setSelectedAnswer(option);
    setIsCorrect(isAnswerCorrect);
    
    const updatedQuestions = questions.map((q, index) => {
        if (index === currentQuestionIndex) {
            const newAttempts = (q.attempts || 0) + 1;
            
            // The status for scoring is only set on the first attempt.
            const newStatus = (q.status === 'unanswered') 
                ? (isAnswerCorrect ? 'correct' : 'incorrect')
                : q.status;

            return {
                ...q,
                studentAnswer: option,
                attempts: newAttempts,
                status: newStatus,
                timeTaken: (q.timeTaken || 0) + timeTaken,
            };
        }
        return q;
    });
    setQuestions(updatedQuestions);

    if (!isTestMode && firestore && user && studentId && taskId) {
        const taskDocRef = doc(firestore, collectionPath, studentId, 'tasks', taskId);
        updateDoc(taskDocRef, { questions: updatedQuestions }).catch(e => {
            console.error("Failed to update question performance", e)
        });
    }

    if (isAnswerCorrect) {
      setShowConfetti(true);
      setTimeout(() => {
          setShowCorrectAnswerModal(true);
      }, 800);
      setTimeout(() => {
        setShowCorrectAnswerModal(false);
        setShowConfetti(false);
        handleNextQuestion(updatedQuestions);
      }, 2500);
    } else {
      setTimeout(() => {
        setGameState('playing');
        setSelectedAnswer(null);
        setIsCorrect(null);
      }, 2500);
    }
  }, [gameState, questionStartTime, questions, currentQuestionIndex, handleNextQuestion, firestore, user, studentId, taskId, searchParams]);

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

  if (gameState === 'loading' || isAuthLoading) {
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
  
  if (gameState === 'finished') {
    const studentName = task?.studentName || 'Visitante';
    return (
      <>
        {showEndConfetti && width > 0 && height > 0 && <Confetti width={width} height={height} recycle={false} numberOfPieces={800} gravity={0.08} />}
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
              <button onClick={() => {
                  setIsGiftOpened(true);
                  setTimeout(() => setShowEndConfetti(true), 100);
                }} className="animate-gift-bounce focus:outline-none relative z-10">
                <Gift className="w-40 h-40 text-primary" />
                <span className="mt-4 block text-lg font-semibold">CLIQUE NO SEU PRÊMIO!</span>
              </button>
            </>
          ) : (
            <>
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
      </>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  
  if (!currentQuestion) {
     return (
        <div className="space-y-8">
             <p className="text-center text-destructive">Não foi possível carregar a pergunta. Tente recarregar a página.</p>
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-3 gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    );
  }
  
  const questionText = currentQuestion.text;
  const questionType = currentQuestion.questionType || 'multiple_choice';

  const renderQuestion = () => {
    if (questionType === 'fill_in_the_blank') {
      const parts = questionText.split('___');
      const dropZoneColor = isCorrect === true ? 'bg-success/20 text-success' : isCorrect === false ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground';
      return (
        <div className="font-bold text-center">
            <div className={`${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'} flex items-center justify-center flex-wrap gap-2`}>
                <span>{parts[0]}</span>
                <span className={cn(
                    'inline-block rounded-md min-w-32 text-center mx-2 px-4 py-2 border-2 border-dashed transition-colors',
                    dropZoneColor,
                    selectedAnswer && 'border-solid'
                )}>
                  {selectedAnswer || '...'}
                </span>
                <span>{parts[1]}</span>
            </div>
            {currentQuestion.text2 && <p className={`mt-4 ${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'}`}>{currentQuestion.text2}</p>}
        </div>
      )
    }

    // Default to multiple choice
    return (
      <div className="font-bold text-center">
        {questionText && <p className={`${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'}`}>{questionText}</p>}
        {currentQuestion.text2 && <p className={`mt-4 ${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'}`}>{currentQuestion.text2}</p>}
      </div>
    )
  }

  return (
    <>
      {showConfetti && width > 0 && height > 0 && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.1}
          />
      )}
      
      <Dialog open={showCorrectAnswerModal} onOpenChange={setShowCorrectAnswerModal}>
        <DialogContent className="max-w-md text-center bg-transparent border-none shadow-none" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle className="text-5xl font-bold font-headline mx-auto text-success">
                    MUITO BEM!
                </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center p-6 -mt-4">
                <CheckCircle className="w-32 h-32 text-success" />
            </div>
        </DialogContent>
      </Dialog>
      
      <div className="space-y-8">
        <div className="relative p-8 border-4 border-dashed rounded-lg border-accent min-h-48 flex items-center justify-center">
            {renderQuestion()}
            <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => {
                const fullText = `${currentQuestion.text} ${currentQuestion.text2 || ''}`;
                const utterance = new SpeechSynthesisUtterance(fullText.replace('___', 'espaço'));
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
              )}
              disabled={gameState !== 'playing'}
            >
              <span className="absolute top-2 left-3 text-lg font-mono bg-background/50 text-foreground rounded-full h-8 w-8 flex items-center justify-center border-2">{index + 1}</span>
              {option}
            </Button>
          ))}
        </div>
        {gameState === 'showingAnswer' && isCorrect === false && (
          <div className="flex items-center justify-center text-4xl font-bold text-destructive mt-6">
              <XCircle className="w-16 h-16 text-destructive mr-4"/>
              TENTE DE NOVO!
          </div>
        )}
      </div>
    </>
  );
}
