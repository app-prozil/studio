'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Volume2, ArrowRight, Gift, RotateCcw, Bot, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

type Question = {
  text: string;
  text2?: string;
  options: string[];
  answer: string;
  questionType?: 'multiple_choice' | 'fill_in_the_blank' | 'organize_syllables' | 'memory_game' | 'guess_the_word' | 'organize_categories' | 'organize_sentence' | 'match_the_pairs';
  categories?: string[];
  categoryItems?: { item: string, category: string }[];
  subject: 'matematica' | 'portugues' | 'memoria';
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
    subject: 'matematica' | 'portugues' | 'memoria';
    studentName?: string;
    isCompleted?: boolean;
    // Performance fields
    completedAt?: string;
    totalTime?: number;
}

const testDriveMathQuestions: Question[] = [
    { text: 'QUANTO É 5 + 3?', options: ['7', '8', '9'], answer: '8', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: "ENCONTRE OS PARES: SOMA E RESULTADO", questionType: 'memory_game', options: ["2+2", "4", "5+3", "8", "1+1", "2"], answer: "N/A", status: 'unanswered', attempts: 0, subject: 'matematica' },
    { text: 'QUAL NÚMERO VEM DEPOIS DE 9?', options: ['8', '10', '11'], answer: '10', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: 'CONTE OS EMOJIS:', text2: '👍👍👍👍👍', options: ['4', '5', '6'], answer: '5', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: 'QUANTO É 4 - 2?', options: ['1', '2', '3'], answer: '2', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: '2 + 2 = ___', options: ['4', '3', '5'], answer: '4', status: 'unanswered', attempts: 0, questionType: 'fill_in_the_blank', subject: 'matematica' },
    { text: 'QUAL NÚMERO VEM ANTES DE 7?', options: ['5', '6', '8'], answer: '6', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: 'QUANTO É 10 + 0?', options: ['0', '1', '10'], answer: '10', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: 'CONTE OS EMOJIS:', text2: '🚗🚗🚗', options: ['2', '3', '4'], answer: '3', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: 'QUAL FORMA TEM 4 LADOS IGUAIS?', options: ['CÍRCULO', 'TRIÂNGULO', 'QUADRADO'], answer: 'QUADRADO', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: 'QUANTO É 3 + 3?', options: ['5', '6', '7'], answer: '6', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
    { text: 'QUAL NÚMERO É MAIOR: 8 OU 6?', options: ['8', '6', 'IGUAIS'], answer: '8', status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'matematica' },
];

const testDrivePortugueseQuestions: Question[] = [
    { text: "QUAL O SINÔNIMO DE 'BONITO'?", options: ["FEIO", "BELO", "GRANDE"], answer: "BELO", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "ENCONTRE OS PARES: ANIMAL E SOM", questionType: 'memory_game', options: ["GATO", "MIAU", "CÃO", "AU AU", "VACA", "MUUU"], answer: "N/A", status: 'unanswered', attempts: 0, subject: 'portugues' },
    { text: "COMPLETE COM O VERBO CORRETO: EU ___ PÃO.", options: ["COMO", "COME", "COMEMOS"], answer: "COMO", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "O PLURAL DE 'MENINO' É ___.", options: ["MENINA", "MENINOS", "MENINAS"], answer: "MENINOS", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "O CONTRÁRIO DE 'ABRIR' É ___.", options: ["FECHAR", "CORRER", "PULAR"], answer: "FECHAR", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "A ___ é azul.", text2: "🌊", options: ["ÁGUA", "BOLA", "CASA"], answer: "ÁGUA", status: 'unanswered', attempts: 0, questionType: 'fill_in_the_blank', subject: 'portugues' },
    { text: "QUAL ANIMAL FAZ 'MIAU'?", options: ["CACHORRO", "GATO", "PÁSSARO"], answer: "GATO", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "A COR DO SOL É ___.", options: ["AZUL", "VERDE", "AMARELO"], answer: "AMARELO", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "O QUE USAMOS PARA ESCREVER?", options: ["LÁPIS", "GARFO", "CAMA"], answer: "LÁPIS", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "A PRIMEIRA LETRA DO ALFABETO É ___.", options: ["B", "C", "A"], answer: "A", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "O PLURAL DE 'CÃO' É ___.", options: ["CÃOS", "CÃES", "CÃS"], answer: "CÃES", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
    { text: "QUAL O FEMININO DE 'PAI'?", options: ["TIA", "MÃE", "AVÓ"], answer: "MÃE", status: 'unanswered', attempts: 0, questionType: 'multiple_choice', subject: 'portugues' },
];

const testDriveMemoryQuestions: Question[] = [
    { text: "ENCONTRE OS PARES: ANIMAL E SOM", questionType: 'memory_game', options: ["GATO", "MIAU", "CÃO", "AU AU", "VACA", "MUUU"], answer: "N/A", status: 'unanswered', attempts: 0, subject: 'memoria' },
    { text: "ENCONTRE OS PARES: SOMA E RESULTADO", questionType: 'memory_game', options: ["2+2", "4", "5+3", "8", "1+1", "2"], answer: "N/A", status: 'unanswered', attempts: 0, subject: 'memoria' },
];

const testDriveTaskBase = {
  id: 'test-drive',
  teacherId: 'test-teacher',
  studentId: 'test-user',
  studentName: 'Visitante',
  isCompleted: false,
};


type InteractiveGameProps = {
  subject: 'matematica' | 'portugues' | 'memoria';
};

interface SentenceWord {
  word: string;
  id: number;
}


export default function InteractiveGame({ subject }: InteractiveGameProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const [task, setTask] = useState<Task | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'showingAnswer' | 'finished'>('loading');
  
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showCorrectAnswerModal, setShowCorrectAnswerModal] = useState(false);
  const [mistakeMade, setMistakeMade] = useState(false);

  // State for organize_syllables game
  const [constructedSyllables, setConstructedSyllables] = useState<string[]>([]);
  const [availableSyllables, setAvailableSyllables] = useState<string[]>([]);
  
  // State for memory_game
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // State for guess_the_word
  const [guessedLetters, setGuessedLetters] = useState<Record<string, 'correct' | 'incorrect'>>({});
  const [chancesLeft, setChancesLeft] = useState(6);
  const [isWrongGuessShake, setIsWrongGuessShake] = useState(false);
  const [animatingHeartIndex, setAnimatingHeartIndex] = useState<number | null>(null);

  // State for organize_categories
  const [organizeCategoryState, setOrganizeCategoryState] = useState<{
    unplacedItems: { item: string; category: string }[];
    placedItems: Record<string, string[]>;
    selectedItem: { item: string; category: string } | null;
    incorrectCategory: string | null;
  }>({ unplacedItems: [], placedItems: {}, selectedItem: null, incorrectCategory: null });

  // State for organize_sentence
  const [constructedSentence, setConstructedSentence] = useState<SentenceWord[]>([]);
  const [availableSentenceWords, setAvailableSentenceWords] = useState<SentenceWord[]>([]);
  const [isWrongSentenceShake, setIsWrongSentenceShake] = useState(false);

  // State for match_the_pairs
  const [matchPairsColumns, setMatchPairsColumns] = useState<{ left: string[], right: string[] }>({ left: [], right: [] });
  const [matchPairsSelectedItem, setMatchPairsSelectedItem] = useState<{ side: 'left' | 'right', index: number, value: string } | null>(null);
  const [matchPairsMatched, setMatchPairsMatched] = useState<[string, string][]>([]);
  const [matchPairsLines, setMatchPairsLines] = useState<{ start: string, end: string, correct: boolean }[]>([]);
  const matchPairsItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const taskStartTime = useMemo(() => Date.now(), []);


  const taskId = searchParams.get('taskId');
  const studentId = searchParams.get('studentId');
  const mode = searchParams.get('mode');
  const exerciseId = searchParams.get('exerciseId');
  const teacherIdForTest = searchParams.get('teacherId');
  
  const currentQuestion = questions[currentQuestionIndex];
  const questionType = currentQuestion?.questionType || 'multiple_choice';

  const triggerConfettiExplosion = () => {
    let params = {
      particleCount: 500,
      spread: 90,
      startVelocity: 70,
      origin: { x: 0, y: 0.5 },
      angle: 45
    };
    // From left
    confetti(params);
    // From right
    params.origin.x = 1;
    params.angle = 135;
    confetti(params);
  };
  
  useEffect(() => {
    const isTestDrive = taskId === 'test-drive';
    const isTaskTestMode = isTestDrive || mode === 'test';
    const isExerciseTestMode = mode === 'test_exercise' && exerciseId && teacherIdForTest;

    const taskSource = searchParams.get('source') || 'student';
    const collectionPath = taskSource === 'teacher' ? 'teachers' : 'students';

    if (isAuthLoading) {
      setGameState('loading');
      return;
    }

    if (isExerciseTestMode) {
        setGameState('loading');
        const exerciseDocRef = doc(firestore, 'teachers', teacherIdForTest, 'exercises', exerciseId);
        getDoc(exerciseDocRef).then(docSnap => {
            if (docSnap.exists()) {
                const exerciseData = docSnap.data() as Question; // An Exercise is basically a Question
                const mockTask: Task = {
                    id: `test-exercise-${exerciseId}`,
                    teacherId: teacherIdForTest,
                    studentId: user?.uid || 'test-user',
                    studentName: 'Professor (Modo Teste)',
                    subject: exerciseData.subject,
                    isCompleted: false,
                    questions: [{ ...exerciseData, status: 'unanswered', attempts: 0 }],
                };
                setTask(mockTask);
                setQuestions(mockTask.questions);
                setGameState('playing');
            } else {
                toast({ variant: 'destructive', title: 'Exercício não encontrado' });
                setGameState('finished');
            }
        }).catch(e => {
            console.error("Error loading exercise for test:", e);
            toast({ variant: 'destructive', title: 'Erro ao carregar exercício' });
            setGameState('finished');
        });
        return; // End execution here for this mode
    }

    if (isTestDrive) {
      setGameState('loading');
      const questionsForTest = 
        subject === 'matematica' ? testDriveMathQuestions 
        : subject === 'portugues' ? testDrivePortugueseQuestions
        : testDriveMemoryQuestions;
      const mockTask: Task = { ...testDriveTaskBase, questions: questionsForTest, subject };
      setTask(mockTask);
      setQuestions(mockTask.questions.map(q => ({...q, status: 'unanswered', attempts: 0 })));
      setGameState('playing');
      return;
    }

    if (!user) {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Você precisa estar logado."});
      router.push('/login');
      return;
    }

    if (!studentId || !taskId) {
      toast({ variant: "destructive", title: "Tarefa não encontrada", description: "O link da tarefa parece estar incompleto."});
      setGameState('finished');
      return;
    }

    setGameState('loading');
    const taskDocRef = doc(firestore, collectionPath, studentId, 'tasks', taskId);
    
    getDoc(taskDocRef).then(docSnap => {
      if (docSnap.exists()) {
        const taskData = docSnap.data() as Task;
        
        if (taskData.isCompleted && !isTaskTestMode) {
          toast({ title: 'Tarefa já concluída', description: 'Você já finalizou esta atividade.' });
          router.push('/tarefas');
          return;
        }

        setTask(taskData);
        const initialQuestions = taskData.questions.map(q => ({...q, status: q.status || 'unanswered', attempts: q.attempts || 0 }));
        setQuestions(initialQuestions);
        
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

  }, [isAuthLoading, user, taskId, studentId, subject, firestore, router, toast, searchParams, mode, exerciseId, teacherIdForTest]);


  useEffect(() => {
    setQuestionStartTime(Date.now());
    setMistakeMade(false);
    // Reset game-specific state when question changes
    setFlippedCards([]);
    setMatchedPairs([]);
    setIsChecking(false);
    setConstructedSyllables([]);
    setGuessedLetters({});
    setChancesLeft(6);
    setAnimatingHeartIndex(null);
    setConstructedSentence([]);
    setAvailableSentenceWords([]);
    setIsWrongSentenceShake(false);
    setMatchPairsLines([]);
    setMatchPairsSelectedItem(null);
    setMatchPairsMatched([]);
    if (currentQuestion?.questionType === 'organize_categories') {
      const items = [...(currentQuestion.categoryItems || [])].sort(() => Math.random() - 0.5);
      const initialPlaced = currentQuestion.categories?.reduce((acc, cat) => ({...acc, [cat]: []}), {}) || {};
      setOrganizeCategoryState({
        unplacedItems: items,
        placedItems: initialPlaced,
        selectedItem: null,
        incorrectCategory: null,
      });
    }
  }, [currentQuestionIndex, currentQuestion]);
  
  // This useEffect handles shuffling options for all game types
  useEffect(() => {
    if (gameState === 'playing' && questions[currentQuestionIndex]) {
      const currentQ = questions[currentQuestionIndex];
      let options = [...(currentQ.options || [])];
      
      if (currentQ.questionType === 'match_the_pairs') {
          const leftCol: string[] = [];
          const rightCol: string[] = [];
          for (let i = 0; i < currentQ.options.length; i += 2) {
              leftCol.push(currentQ.options[i]);
              rightCol.push(currentQ.options[i+1]);
          }
          setMatchPairsColumns({
              left: leftCol.sort(() => Math.random() - 0.5),
              right: rightCol.sort(() => Math.random() - 0.5),
          });
      } else {
        // Fisher-Yates shuffle for other types
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        if (currentQ.questionType === 'organize_syllables') {
            setAvailableSyllables(options);
            setConstructedSyllables([]);
        } else if (currentQ.questionType === 'organize_sentence') {
            setAvailableSentenceWords(options.map((word, index) => ({ word, id: index })));
            setConstructedSentence([]);
        } else {
            setShuffledOptions(options);
        }
      }
    }
  }, [currentQuestionIndex, questions, gameState]);

  const completeTask = useCallback((finalQuestions: Question[]) => {
    const isTestDrive = taskId === 'test-drive';
    const isTaskTestMode = isTestDrive || mode === 'test';
    const isExerciseTestMode = mode === 'test_exercise';
    
    if (isTaskTestMode || isExerciseTestMode) return;

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
      
      const studentTaskRef = doc(firestore, 'students', task.studentId, 'tasks', task.id);
      updateDoc(studentTaskRef, performanceData).catch(e => {
        console.error("Erro ao finalizar tarefa (aluno): ", e);
      });
      
      const teacherTaskRef = doc(firestore, 'teachers', task.teacherId, 'tasks', task.id);
      updateDoc(teacherTaskRef, performanceData).catch(e => {
          console.error("Erro ao finalizar tarefa (professor): ", e);
          toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível sincronizar o resultado da tarefa com o professor.' });
      });
  }, [firestore, user, task, taskStartTime, toast, taskId, mode]);

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

  const handleAnswer = useCallback((answer: string) => {
    if (gameState !== 'playing' && gameState !== 'showingAnswer') return;
  
    const isTestDrive = taskId === 'test-drive';
    const isTaskTestMode = isTestDrive || mode === 'test';
    const isExerciseTestMode = mode === 'test_exercise';
    const isTestMode = isTestDrive || isTaskTestMode || isExerciseTestMode;
  
    const taskSource = searchParams.get('source') || 'student';
    const collectionPath = taskSource === 'teacher' ? 'teachers' : 'students';
    
    if (!currentQuestion) return;

    // This variable determines if the game should advance.
    // For puzzles, solving it is always a "correct" action to advance.
    // For MCQs, it's about picking the right option.
    const isActionCorrectForAdvancement = (
      questionType === 'multiple_choice' || questionType === 'fill_in_the_blank'
    ) ? (answer.toUpperCase() === currentQuestion.answer.toUpperCase())
      : true; // For all puzzle types, solving it means we should advance.

    // This variable determines the score. It's based on the FIRST real attempt.
    const isAttemptCorrectForScoring = (
      questionType === 'multiple_choice' || questionType === 'fill_in_the_blank'
    ) 
      // For MCQs, it's correct if this is the first try AND the answer is right.
      ? (currentQuestion.status === 'unanswered' && answer.toUpperCase() === currentQuestion.answer.toUpperCase())
      // For puzzles, it's correct if no mistake was made during the whole process.
      : !mistakeMade;

    if (gameState === 'playing') {
      setGameState('showingAnswer');
    }

    setSelectedAnswer(answer);
    setIsCorrect(isActionCorrectForAdvancement); // Visual feedback is based on the action to advance.
    
    const timeTaken = Date.now() - questionStartTime;
    const updatedQuestions = questions.map((q, index) => {
      if (index === currentQuestionIndex) {
        const newAttempts = (q.attempts || 0) + 1;
  
        // Only set the score status on the first attempt.
        if (q.status === 'unanswered') {
          return {
            ...q,
            studentAnswer: answer,
            attempts: newAttempts,
            status: isAttemptCorrectForScoring ? 'correct' : 'incorrect',
            timeTaken: (q.timeTaken || 0) + timeTaken,
          };
        }
        // If already answered, just update other stats but preserve the original status.
        return {
          ...q,
          studentAnswer: answer, // update answer in case it's a puzzle
          attempts: newAttempts,
          timeTaken: (q.timeTaken || 0) + timeTaken,
        };
      }
      return q;
    });
    setQuestions(updatedQuestions);
  
    if (!isTestMode && firestore && user && studentId && taskId) {
      const taskDocRef = doc(firestore, collectionPath, studentId, 'tasks', taskId);
      updateDoc(taskDocRef, { questions: updatedQuestions }).catch(e => {
        console.error("Failed to update question performance", e);
      });
    }
  
    if (isActionCorrectForAdvancement) {
      triggerConfettiExplosion();
      const delay = questionType === 'fill_in_the_blank' ? 800 : 100;
      setTimeout(() => {
        setShowCorrectAnswerModal(true);
      }, delay);
      setTimeout(() => {
        setShowCorrectAnswerModal(false);
        handleNextQuestion(updatedQuestions);
      }, delay + 1700);
    } else {
      // This block now only runs for incorrect MCQ/fill-in-the-blank answers
      setMistakeMade(true);
      setTimeout(() => {
        setGameState('playing');
        setSelectedAnswer(null);
        setIsCorrect(null);
        // No need to reset puzzle states here as this path is not for puzzles
      }, 2500);
    }
  }, [
    gameState,
    questionStartTime,
    questions,
    currentQuestion,
    handleNextQuestion,
    firestore,
    user,
    studentId,
    taskId,
    searchParams,
    questionType,
    mode,
    mistakeMade,
  ]);
  
  const handleMatchItemClick = (side: 'left' | 'right', index: number, value: string) => {
    if (gameState !== 'playing' || !currentQuestion) return;

    if (!matchPairsSelectedItem) {
      setMatchPairsSelectedItem({ side, index, value });
    } else {
      if (matchPairsSelectedItem.side === side) {
        setMatchPairsSelectedItem({ side, index, value });
        return;
      }

      const originalOptions = currentQuestion.options;
      let isCorrectMatch = false;
      for (let i = 0; i < originalOptions.length; i += 2) {
        if (
          (originalOptions[i] === matchPairsSelectedItem.value && originalOptions[i + 1] === value) ||
          (originalOptions[i] === value && originalOptions[i + 1] === matchPairsSelectedItem.value)
        ) {
          isCorrectMatch = true;
          break;
        }
      }

      const newLine = { start: matchPairsSelectedItem.value, end: value, correct: isCorrectMatch };
      setMatchPairsLines(prev => [...prev, newLine]);
      setMatchPairsSelectedItem(null);

      if (isCorrectMatch) {
        triggerConfettiExplosion();
        const newMatched = [...matchPairsMatched, [matchPairsSelectedItem.value, value]] as [string, string][];
        setMatchPairsMatched(newMatched);

        if (newMatched.length === currentQuestion.options.length / 2) {
          setTimeout(() => {
            handleAnswer("N/A"); // Mark question as complete
          }, 1000);
        }
      } else {
        setMistakeMade(true);
        toast({
          variant: 'destructive',
          title: 'Não corresponde!',
          description: 'Tente outro par.',
          duration: 2000,
        });
        setTimeout(() => {
          setMatchPairsLines(prev => prev.filter(l => l !== newLine));
        }, 1000);
      }
    }
  };

  useEffect(() => {
    if (questionType === 'organize_syllables' && availableSyllables.length === 0 && constructedSyllables.length > 0) {
        const finalAnswer = constructedSyllables.join('');
        if (finalAnswer.toUpperCase() !== currentQuestion.answer.toUpperCase()) {
            setMistakeMade(true);
        }
        handleAnswer(finalAnswer);
    }
  }, [availableSyllables, constructedSyllables, questionType, handleAnswer, currentQuestion]);

  // Memory Game: check for matches
  useEffect(() => {
    if (questionType !== 'memory_game' || flippedCards.length !== 2) return;

    setIsChecking(true);
    const [firstIndex, secondIndex] = flippedCards;
    const firstCardValue = shuffledOptions[firstIndex];
    const secondCardValue = shuffledOptions[secondIndex];

    const originalOptions = currentQuestion.options;
    let isMatch = false;
    for (let i = 0; i < originalOptions.length; i += 2) {
        const pair1 = originalOptions[i];
        const pair2 = originalOptions[i + 1];
        if ((firstCardValue === pair1 && secondCardValue === pair2) || (firstCardValue === pair2 && secondCardValue === pair1)) {
            isMatch = true;
            break;
        }
    }

    if (isMatch) {
        triggerConfettiExplosion();
        
        const newMatchedPairs = [...matchedPairs, firstCardValue, secondCardValue];
        setMatchedPairs(newMatchedPairs);
        setFlippedCards([]);
        setIsChecking(false);

        if (newMatchedPairs.length === originalOptions.length) {
            setTimeout(() => {
                handleAnswer(currentQuestion.answer); // "N/A"
            }, 500);
        }
    } else {
        setMistakeMade(true);
        setTimeout(() => {
            setFlippedCards([]);
            setIsChecking(false);
        }, 1200);
    }
  }, [flippedCards, currentQuestion, matchedPairs, shuffledOptions, handleAnswer, questionType]);

  const handleCardClick = (index: number) => {
    if (isChecking || flippedCards.length >= 2 || flippedCards.includes(index) || matchedPairs.includes(shuffledOptions[index])) {
      return;
    }
    setFlippedCards(prev => [...prev, index]);
  };
  
  const handleLetterGuess = (letter: string) => {
    if (chancesLeft <= 0 || guessedLetters[letter] || gameState !== 'playing') return;

    const secretWord = currentQuestion.answer.toUpperCase();
    const isCorrectGuess = secretWord.includes(letter);

    if (isCorrectGuess) {
        setGuessedLetters(prev => ({ ...prev, [letter]: 'correct' }));
    } else {
        setMistakeMade(true);
        setAnimatingHeartIndex(chancesLeft - 1);
        toast({
            variant: 'destructive',
            title: 'Letra Incorreta!',
            description: 'Você perdeu uma chance.',
            duration: 2000,
        });
        setGuessedLetters(prev => ({ ...prev, [letter]: 'incorrect' }));
        setChancesLeft(prev => prev - 1);
        setIsWrongGuessShake(true);
        setTimeout(() => setIsWrongGuessShake(false), 500);
    }
  };

  useEffect(() => {
    if (questionType !== 'guess_the_word' || gameState !== 'playing') return;

    const secretWord = (currentQuestion?.answer || '').toUpperCase();
    if (!secretWord) return;

    // Check for win
    const uniqueLetters = [...new Set(secretWord.split(''))];
    const allLettersGuessed = uniqueLetters.every(letter => guessedLetters[letter] === 'correct');
    if (allLettersGuessed) {
      setGameState('showingAnswer'); // Prevent further guesses
      setTimeout(() => handleAnswer(secretWord), 500); // Trigger correct answer flow
      return; // Stop further checks
    }

    // Check for loss
    if (chancesLeft <= 0) {
      setGameState('showingAnswer'); // Prevent further guesses
      setIsCorrect(false);

      const timeTaken = Date.now() - questionStartTime;
      const updatedQuestions = questions.map((q, index) =>
        index === currentQuestionIndex
          ? {
              ...q,
              studentAnswer: Object.keys(guessedLetters).filter(k => guessedLetters[k] === 'correct').join(''),
              attempts: 1, // The whole game is one attempt
              status: 'incorrect',
              timeTaken,
            }
          : q
      );
      setQuestions(updatedQuestions);

      // Show a "You Lost" message and then move on
      toast({
        variant: 'destructive',
        title: 'Fim de Jogo!',
        description: `A palavra era: ${secretWord}`,
        duration: 3000,
      });
      setTimeout(() => {
        handleNextQuestion(updatedQuestions);
      }, 3500);
    }
  }, [guessedLetters, chancesLeft, questionType, currentQuestion, gameState, handleAnswer, questionStartTime, questions, handleNextQuestion, toast]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (questionType === 'multiple_choice' && gameState === 'playing' && shuffledOptions.length > 0) {
        if (event.key === '1' && shuffledOptions[0]) handleAnswer(shuffledOptions[0]);
        else if (event.key === '2' && shuffledOptions[1]) handleAnswer(shuffledOptions[1]);
        else if (event.key === '3' && shuffledOptions[2]) handleAnswer(shuffledOptions[2]);
      } else if (questionType === 'guess_the_word' && gameState === 'playing') {
        const key = event.key.toUpperCase();
        if (key.length === 1 && key >= 'A' && key <= 'Z') {
          handleLetterGuess(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState, handleAnswer, shuffledOptions, questionType, handleLetterGuess]);

  // Handler for "Organize Categories" game
  const handleOrganizeItemSelect = (item: { item: string; category: string }) => {
    if (gameState !== 'playing') return;
    setOrganizeCategoryState(prev => ({
      ...prev,
      selectedItem: prev.selectedItem?.item === item.item ? null : item,
    }));
  };

  const handleOrganizeCategoryClick = (category: string) => {
    const { selectedItem, unplacedItems, placedItems } = organizeCategoryState;

    if (gameState !== 'playing' || !selectedItem) return;

    if (selectedItem.category === category) {
      triggerConfettiExplosion();
      
      const newUnplaced = unplacedItems.filter(i => i.item !== selectedItem.item);
      const newPlaced = { ...placedItems, [category]: [...placedItems[category], selectedItem.item] };

      setOrganizeCategoryState({
        unplacedItems: newUnplaced,
        placedItems: newPlaced,
        selectedItem: null,
        incorrectCategory: null,
      });

      if (newUnplaced.length === 0) {
        setTimeout(() => handleAnswer(currentQuestion.answer), 500);
      }
    } else {
      setMistakeMade(true);
      toast({
        variant: 'destructive',
        title: 'Categoria Incorreta!',
        description: 'Tente colocar este item em outra categoria.',
        duration: 2000,
      });
      setOrganizeCategoryState(prev => ({
        ...prev,
        incorrectCategory: category,
        selectedItem: null,
      }));
      setTimeout(() => {
        setOrganizeCategoryState(prev => ({ ...prev, incorrectCategory: null }));
      }, 500);
    }
  };

  // Handlers for "Organize Sentence" game
  const handleSelectSentenceWord = (word: SentenceWord) => {
    if (gameState !== 'playing') return;
    setConstructedSentence(prev => [...prev, word]);
    setAvailableSentenceWords(prev => prev.filter(w => w.id !== word.id));
  };

  const handleDeselectSentenceWord = (wordToRemove: SentenceWord) => {
    if (gameState !== 'playing') return;
    setAvailableSentenceWords(prev => [...prev, wordToRemove].sort((a,b) => a.id - b.id));
    setConstructedSentence(prev => prev.filter(w => w.id !== wordToRemove.id));
  };

  const handleClearSentence = () => {
    if (gameState !== 'playing') return;
    setAvailableSentenceWords(prev => [...prev, ...constructedSentence].sort((a,b) => a.id - b.id));
    setConstructedSentence([]);
  };

  const handleCheckSentence = () => {
    if (gameState !== 'playing' || constructedSentence.length === 0) return;
    
    const userAnswer = constructedSentence.map(sw => sw.word).join(' ');
    const isAnswerCorrect = userAnswer.toUpperCase() === currentQuestion.answer.toUpperCase();

    if (!isAnswerCorrect) {
      setMistakeMade(true);
      setIsWrongSentenceShake(true);
      setTimeout(() => setIsWrongSentenceShake(false), 600);
      toast({
        variant: 'destructive',
        title: 'Quase lá!',
        description: 'A ordem das palavras não parece correta. Tente de novo!',
        duration: 2500,
      });
    } else {
        try {
            const utterance = new SpeechSynthesisUtterance(currentQuestion.answer);
            utterance.lang = 'pt-BR';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Speech synthesis failed.", e);
        }
    }
    handleAnswer(userAnswer);
  };


  if (gameState === 'loading' || isAuthLoading || !currentQuestion) {
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
                  setTimeout(() => {
                    confetti({
                        particleCount: 800,
                        spread: 120,
                        gravity: 0.08,
                    });
                  }, 100);
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

  const DropZone = ({ text }: { text: string }) => (
    <span className={cn(
        'inline-block rounded-md min-w-32 text-center mx-2 px-4 py-2 border-2 border-dashed transition-colors',
        isCorrect === true ? 'bg-success/20 text-success' : isCorrect === false ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground',
        text && 'border-solid'
    )}>
      {text || '...'}
    </span>
  );

  const renderQuestion = () => {
    const renderTextWithBlank = (text: string | undefined, blankContent: string) => {
      if (!text || !text.includes('___')) {
        return <span>{text}</span>;
      }
      const parts = text.split('___');
      return (
        <>
          <span>{parts[0]}</span>
          <DropZone text={blankContent} />
          <span>{parts.slice(1).join('___')}</span>
        </>
      );
    };

    return (
      <div className="font-bold text-center flex flex-col items-center justify-center gap-4">
        {questionType === 'fill_in_the_blank' ? (
            <>
                <p className={`${subject === 'matematica' ? 'text-4xl sm:text-6xl font-mono tracking-widest' : 'text-3xl sm:text-5xl'} flex items-center justify-center flex-wrap gap-2`}>
                    {renderTextWithBlank(currentQuestion.text, selectedAnswer || '')}
                </p>
                {currentQuestion.text2 && <p className={`${subject === 'matematica' ? 'text-4xl sm:text-6xl font-mono tracking-widest' : 'text-3xl sm:text-5xl'} flex items-center justify-center flex-wrap gap-2`}>
                    {renderTextWithBlank(currentQuestion.text2, selectedAnswer || '')}
                </p>}
            </>
        ) : (
             <>
                {currentQuestion.text && <p className={`${subject === 'matematica' ? 'text-4xl sm:text-6xl font-mono tracking-widest' : 'text-4xl sm:text-5xl'}`}>{currentQuestion.text}</p>}
                {currentQuestion.text2 && <p className={`${subject === 'matematica' ? 'text-4xl sm:text-6xl font-mono tracking-widest' : 'text-4xl sm:text-5xl'} mt-4`}>{currentQuestion.text2}</p>}
            </>
        )}
      </div>
    );
  }

  const handleSyllableClick = (syllable: string, index: number) => {
    if (gameState !== 'playing') return;
    setConstructedSyllables(prev => [...prev, syllable]);
    setAvailableSyllables(prev => prev.filter((_, i) => i !== index));
  }

  const handleClearSyllables = () => {
    if (gameState !== 'playing') return;
    setAvailableSyllables(prev => [...prev, ...constructedSyllables].sort(() => Math.random() - 0.5));
    setConstructedSyllables([]);
  }

  return (
    <>
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
                const fullText = `${currentQuestion.text || ''} ${currentQuestion.text2 || ''}`;
                const utterance = new SpeechSynthesisUtterance(fullText.replace('___', 'espaço'));
                utterance.lang = 'pt-BR';
                window.speechSynthesis.speak(utterance);
            }}>
                <Volume2 className="w-8 h-8" />
                <span className="sr-only">Ler em voz alta</span>
            </Button>
        </div>
        
        {questionType === 'organize_syllables' && (
            <div className="space-y-6">
                <div className="relative p-8 border-4 rounded-lg bg-muted min-h-32 flex items-center justify-center gap-2">
                    <p className="text-5xl font-bold font-mono tracking-widest">{constructedSyllables.join('')}</p>
                    {constructedSyllables.length > 0 && gameState === 'playing' && (
                         <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleClearSyllables}>
                            <RotateCcw className="w-6 h-6" />
                         </Button>
                    )}
                </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {availableSyllables.map((syllable, index) => (
                        <Button key={index} onClick={() => handleSyllableClick(syllable, index)} className="h-24 text-4xl font-bold" disabled={gameState !== 'playing'}>
                            {syllable}
                        </Button>
                    ))}
                 </div>
            </div>
        )}
        
        {questionType === 'memory_game' && (
            <div className={cn(
                "grid gap-2 sm:gap-4",
                shuffledOptions.length > 8 ? "grid-cols-4" : "grid-cols-3"
            )}>
                {shuffledOptions.map((option, index) => {
                    const isFlipped = flippedCards.includes(index) || matchedPairs.includes(option);
                    const isMatched = matchedPairs.includes(option);
                    
                    return (
                        <button
                            key={index}
                            onClick={() => handleCardClick(index)}
                            disabled={isChecking || isFlipped}
                            className={cn(
                                "flip-card h-24 sm:h-32 rounded-lg text-2xl sm:text-3xl font-bold",
                                isFlipped && "flipped"
                            )}
                        >
                            <div className="flip-card-inner">
                                <div className={cn(
                                    "flip-card-front",
                                    "bg-primary text-primary-foreground",
                                    "focus:ring-4 focus:ring-ring focus:ring-offset-2 focus:outline-none",
                                    "hover:bg-primary/90"
                                )}>
                                    <Bot className="w-12 h-12 sm:w-16 sm:h-16 text-primary-foreground/70" />
                                </div>
                                <div className={cn(
                                    "flip-card-back",
                                    "bg-secondary text-secondary-foreground",
                                    isMatched && "border-4 border-success !bg-success/20"
                                )}>
                                    {option}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}

        {questionType === 'match_the_pairs' && (() => {
            const getLineCoords = (startValue: string, endValue: string) => {
                const startEl = matchPairsItemRefs.current[startValue];
                const endEl = matchPairsItemRefs.current[endValue];
                const container = startEl?.closest('[data-id="match-container"]');

                if (!startEl || !endEl || !container) return null;

                const containerRect = container.getBoundingClientRect();
                
                const startIsLeftColumn = matchPairsColumns.left.includes(startValue);
                
                const leftItemRect = startIsLeftColumn ? startEl.getBoundingClientRect() : endEl.getBoundingClientRect();
                const rightItemRect = startIsLeftColumn ? endEl.getBoundingClientRect() : startEl.getBoundingClientRect();
            
                const x1 = leftItemRect.right - containerRect.left;
                const y1 = leftItemRect.top + leftItemRect.height / 2 - containerRect.top;
                
                const x2 = rightItemRect.left - containerRect.left;
                const y2 = rightItemRect.top + rightItemRect.height / 2 - containerRect.top;

                return { x1, y1, x2, y2 };
            };

            return (
                <div data-id="match-container" className="relative grid grid-cols-2 gap-x-8 sm:gap-x-16 gap-y-4 items-center justify-center">
                    {/* Left Column */}
                    <div className="flex flex-col gap-4">
                        {matchPairsColumns.left.map((item, index) => {
                            const isMatched = matchPairsMatched.some(p => p.includes(item));
                            const isSelected = matchPairsSelectedItem?.side === 'left' && matchPairsSelectedItem?.index === index;
                            return (
                                <Button
                                    key={`left-${index}`}
                                    ref={el => matchPairsItemRefs.current[item] = el}
                                    variant={isSelected ? 'default' : isMatched ? 'success' : 'secondary'}
                                    className="w-full h-20 text-xl sm:text-2xl font-bold justify-center"
                                    onClick={() => handleMatchItemClick('left', index, item)}
                                    disabled={isMatched}
                                >
                                    {item}
                                </Button>
                            );
                        })}
                    </div>
                    {/* Right Column */}
                    <div className="flex flex-col gap-4">
                        {matchPairsColumns.right.map((item, index) => {
                            const isMatched = matchPairsMatched.some(p => p.includes(item));
                            const isSelected = matchPairsSelectedItem?.side === 'right' && matchPairsSelectedItem?.index === index;
                            return (
                                <Button
                                    key={`right-${index}`}
                                    ref={el => matchPairsItemRefs.current[item] = el}
                                    variant={isSelected ? 'default' : isMatched ? 'success' : 'secondary'}
                                    className="w-full h-20 text-xl sm:text-2xl font-bold justify-center"
                                    onClick={() => handleMatchItemClick('right', index, item)}
                                    disabled={isMatched}
                                >
                                    {item}
                                </Button>
                            );
                        })}
                    </div>
                    {/* SVG for lines */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        {matchPairsLines.map((line, i) => {
                            const coords = getLineCoords(line.start, line.end);
                            if (!coords) return null;
                            return (
                                <line
                                    key={i}
                                    x1={coords.x1}
                                    y1={coords.y1}
                                    x2={coords.x2}
                                    y2={coords.y2}
                                    stroke={line.correct ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    className="transition-all"
                                />
                            );
                        })}
                    </svg>
                </div>
            );
        })()}

        {(questionType === 'multiple_choice' || questionType === 'fill_in_the_blank') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {shuffledOptions.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  variant={selectedAnswer === option ? (isCorrect ? 'success' : 'destructive') : 'default'}
                  className={cn(
                      'h-28 text-3xl sm:h-32 sm:text-4xl font-bold relative',
                      selectedAnswer === option && 'animate-option-click',
                  )}
                  disabled={gameState !== 'playing'}
                >
                  <span className="absolute top-2 left-3 text-lg font-mono bg-background/50 text-foreground rounded-full h-8 w-8 flex items-center justify-center border-2">{index + 1}</span>
                  {option}
                </Button>
              ))}
            </div>
        )}

        {questionType === 'guess_the_word' && (() => {
            const secretWord = (currentQuestion.answer || '').toUpperCase();
            const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

            return (
                <div className={cn("space-y-8", isWrongGuessShake && "animate-shake")}>
                {/* Chances */}
                <div className="flex justify-center gap-2">
                    {Array.from({ length: 6 }).map((_, i) => {
                        const isAnimatingNow = i === animatingHeartIndex;
                        const isActive = i < chancesLeft;
                        const isLastChance = isActive && i === chancesLeft - 1;
                        return (
                            <div key={`heart-container-${i}`} className="relative flex items-center justify-center">
                                <Heart
                                    className={cn(
                                        "w-10 h-10 transition-colors duration-300",
                                        isActive ? "text-red-500 fill-red-500" : "text-muted-foreground/50",
                                        isActive && !isLastChance && !isAnimatingNow && "animate-heart-beat",
                                        isLastChance && !isAnimatingNow && "animate-heart-beat-intense",
                                        isAnimatingNow && "animate-heart-lost"
                                    )}
                                />
                                <div className={cn(
                                    "particle-burst heart-burst",
                                    isAnimatingNow && "is-active"
                                )}>
                                    {Array.from({ length: 20 }).map((_, particleIndex) => (
                                        <div key={particleIndex} className="particle" style={{'--i': particleIndex} as React.CSSProperties} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Word Display */}
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                  {secretWord.split('').map((letter, index) => (
                    <div key={`${letter}-${index}`} className="flip-card h-16 w-12 sm:h-20 sm:w-16">
                      <div
                        className={cn(
                          'flip-card-inner',
                          guessedLetters[letter] === 'correct' && 'flipped'
                        )}
                      >
                        <div className="flip-card-front bg-muted rounded-lg" />
                        <div className="flip-card-back bg-card rounded-lg flex items-center justify-center text-3xl sm:text-4xl font-bold uppercase text-primary">
                          {letter}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Keyboard */}
                <div className="flex flex-col items-center gap-2 pt-6">
                    {keyboardRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex justify-center gap-2 flex-wrap">
                        {row.split('').map((key) => {
                        const guessStatus = guessedLetters[key];
                        return (
                            <Button
                            key={key}
                            variant={
                                guessStatus === 'correct'
                                ? 'success'
                                : guessStatus === 'incorrect'
                                ? 'destructive'
                                : 'outline'
                            }
                            size="icon"
                            className="h-12 w-12 text-xl font-bold sm:h-14 sm:w-14"
                            onClick={() => handleLetterGuess(key)}
                            disabled={!!guessStatus || gameState !== 'playing'}
                            >
                            {key}
                            </Button>
                        );
                        })}
                    </div>
                    ))}
                </div>
                </div>
            );
        })()}

        {questionType === 'organize_categories' && (() => {
          const categories = currentQuestion.categories || [];
          return (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-center gap-4 p-4 border rounded-lg min-h-[10rem] bg-muted/50">
                {organizeCategoryState.unplacedItems.map((item) => (
                  <Button
                    key={item.item}
                    variant={organizeCategoryState.selectedItem?.item === item.item ? 'default' : 'secondary'}
                    className="h-auto p-3 sm:p-4 text-4xl sm:text-5xl font-bold shadow-lg"
                    onClick={() => handleOrganizeItemSelect(item)}
                    disabled={gameState !== 'playing'}
                  >
                    {item.item}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((category) => (
                  <div
                    key={category}
                    onClick={() => handleOrganizeCategoryClick(category)}
                    className={cn(
                      "p-4 border-4 border-dashed rounded-xl min-h-[15rem] transition-colors flex flex-col items-center",
                      organizeCategoryState.selectedItem ? 'cursor-pointer hover:border-primary hover:bg-primary/5' : 'cursor-default',
                      organizeCategoryState.incorrectCategory === category && 'animate-shake border-destructive'
                    )}
                  >
                    <h3 className="text-2xl font-bold text-center mb-4">{category}</h3>
                    <div className="flex flex-wrap justify-center gap-3">
                      {organizeCategoryState.placedItems[category]?.map(placedItem => (
                        <span
                          key={placedItem}
                          className="bg-success/20 text-success-foreground p-2 sm:p-3 rounded-lg text-4xl sm:text-5xl font-bold animate-item-pop-in"
                        >
                          {placedItem}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {questionType === 'organize_sentence' && (() => {
            return (
                <div className="space-y-6">
                    <div className={cn("relative p-4 sm:p-6 border-4 rounded-lg bg-muted min-h-40 flex items-center justify-center flex-wrap gap-3", isWrongSentenceShake && "animate-shake")}>
                        {constructedSentence.length === 0 && (
                            <p className="text-muted-foreground text-center">Clique nas palavras abaixo para montar a frase aqui.</p>
                        )}
                        {constructedSentence.map((sentenceWord, index) => (
                            <Button
                                key={sentenceWord.id}
                                variant="secondary"
                                className="h-auto p-3 sm:p-4 text-3xl sm:text-4xl font-bold shadow-lg animate-item-pop-in cursor-pointer"
                                style={{'--animation-delay': `${index * 50}ms`} as React.CSSProperties}
                                onClick={() => handleDeselectSentenceWord(sentenceWord)}
                            >
                                {sentenceWord.word}
                            </Button>
                        ))}
                        {constructedSentence.length > 0 && gameState === 'playing' && (
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleClearSentence}>
                                <RotateCcw className="w-6 h-6" />
                            </Button>
                        )}
                    </div>
                    <div className="p-4 border rounded-lg min-h-40 bg-muted/50 flex flex-wrap items-center justify-center gap-3">
                        {availableSentenceWords.map((sentenceWord) => (
                            <Button
                                key={sentenceWord.id}
                                variant="default"
                                className="h-auto p-3 sm:p-4 text-3xl sm:text-4xl font-bold shadow-md hover:scale-105 transition-transform"
                                onClick={() => handleSelectSentenceWord(sentenceWord)}
                                disabled={gameState !== 'playing'}
                            >
                                {sentenceWord.word}
                            </Button>
                        ))}
                    </div>
                    <div className="flex justify-center">
                        <Button
                            size="lg"
                            className="text-2xl h-14"
                            onClick={handleCheckSentence}
                            disabled={gameState !== 'playing' || constructedSentence.length === 0}
                        >
                            <CheckCircle className="mr-3" /> Verificar Frase
                        </Button>
                    </div>
                </div>
            );
        })()}

        {gameState === 'showingAnswer' && isCorrect === false && questionType !== 'guess_the_word' && (
          <div className="flex items-center justify-center text-4xl font-bold text-destructive mt-6">
              <XCircle className="w-16 h-16 text-destructive mr-4"/>
              TENTE DE NOVO!
          </div>
        )}
      </div>
    </>
  );
}
