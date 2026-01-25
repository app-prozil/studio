'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  questionType?: 'multiple_choice' | 'fill_in_the_blank' | 'organize_syllables' | 'memory_game' | 'guess_the_word' | 'organize_categories';
  categories?: string[];
  categoryItems?: { item: string, category: string }[];
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
    subject: 'math' | 'portuguese' | 'memoria';
    studentName?: string;
    isCompleted?: boolean;
    // Performance fields
    completedAt?: string;
    totalTime?: number;
}

const testDriveMathQuestions: Question[] = [
    { text: 'QUANTO É 5 + 3?', options: ['7', '8', '9'], answer: '8', status: 'unanswered', attempts: 0, questionType: 'multiple_choice' },
    { text: "ENCONTRE OS PARES: SOMA E RESULTADO", questionType: 'memory_game', options: ["2+2", "4", "5+3", "8", "1+1", "2"], answer: "N/A", status: 'unanswered', attempts: 0 },
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
    { text: "ENCONTRE OS PARES: ANIMAL E SOM", questionType: 'memory_game', options: ["GATO", "MIAU", "CÃO", "AU AU", "VACA", "MUUU"], answer: "N/A", status: 'unanswered', attempts: 0 },
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

const testDriveMemoryQuestions: Question[] = [
    { text: "ENCONTRE OS PARES: ANIMAL E SOM", questionType: 'memory_game', options: ["GATO", "MIAU", "CÃO", "AU AU", "VACA", "MUUU"], answer: "N/A", status: 'unanswered', attempts: 0 },
    { text: "ENCONTRE OS PARES: SOMA E RESULTADO", questionType: 'memory_game', options: ["2+2", "4", "5+3", "8", "1+1", "2"], answer: "N/A", status: 'unanswered', attempts: 0 },
];

const testDriveTaskBase = {
  id: 'test-drive',
  teacherId: 'test-teacher',
  studentId: 'test-user',
  studentName: 'Visitante',
  isCompleted: false,
};


type InteractiveGameProps = {
  subject: 'math' | 'portuguese' | 'memoria';
};


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

  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const taskStartTime = useMemo(() => Date.now(), []);


  const taskId = searchParams.get('taskId');
  const studentId = searchParams.get('studentId'); 
  
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
    const isTestMode = isTestDrive || searchParams.get('mode') === 'test';
    const taskSource = searchParams.get('source') || 'student';
    const collectionPath = taskSource === 'teacher' ? 'teachers' : 'students';

    if (isAuthLoading) {
      setGameState('loading');
      return;
    }

    if (isTestDrive) {
      setGameState('loading');
      const questionsForTest = 
        subject === 'math' ? testDriveMathQuestions 
        : subject === 'portuguese' ? testDrivePortugueseQuestions
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
        
        if (taskData.isCompleted && !isTestMode) {
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

  }, [isAuthLoading, user, taskId, studentId, subject, firestore, router, toast, searchParams]);


  useEffect(() => {
    setQuestionStartTime(Date.now());
    // Reset game-specific state when question changes
    setFlippedCards([]);
    setMatchedPairs([]);
    setIsChecking(false);
    setConstructedSyllables([]);
    setGuessedLetters({});
    setChancesLeft(6);
    setAnimatingHeartIndex(null);
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
      const options = [...(currentQ.options || [])];
      // Fisher-Yates shuffle
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      
      if (currentQ.questionType === 'organize_syllables') {
          setAvailableSyllables(options);
          setConstructedSyllables([]);
      } else {
          setShuffledOptions(options);
      }
    }
  }, [currentQuestionIndex, questions, gameState]);
  
  const completeTask = useCallback((finalQuestions: Question[]) => {
    const isTestDrive = taskId === 'test-drive';
    const isTestMode = isTestDrive || searchParams.get('mode') === 'test';
    
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

  const handleAnswer = useCallback((answer: string) => {
    if (gameState !== 'playing') return;

    const isTestDrive = taskId === 'test-drive';
    const isTestMode = isTestDrive || searchParams.get('mode') === 'test';
    const taskSource = searchParams.get('source') || 'student';
    const collectionPath = taskSource === 'teacher' ? 'teachers' : 'students';
    const timeTaken = Date.now() - questionStartTime;
    
    if (!currentQuestion) return;
    const isAnswerCorrect = answer.toUpperCase() === currentQuestion.answer.toUpperCase();
    
    setGameState('showingAnswer'); 
    setSelectedAnswer(answer);
    setIsCorrect(isAnswerCorrect);
    
    const updatedQuestions = questions.map((q, index) => {
        if (index === currentQuestionIndex) {
            const newAttempts = (q.attempts || 0) + 1;
            
            const newStatus = (q.status === 'unanswered') 
                ? (isAnswerCorrect ? 'correct' : 'incorrect')
                : q.status;

            return {
                ...q,
                studentAnswer: answer,
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
      setTimeout(() => {
        setGameState('playing');
        setSelectedAnswer(null);
        setIsCorrect(null);
         if (questionType === 'organize_syllables') {
            setAvailableSyllables([...constructedSyllables, ...availableSyllables]);
            setConstructedSyllables([]);
        }
      }, 2500);
    }
  }, [gameState, questionStartTime, questions, currentQuestion, handleNextQuestion, firestore, user, studentId, taskId, searchParams, questionType, constructedSyllables, availableSyllables]);
  
  useEffect(() => {
    if (questionType === 'organize_syllables' && availableSyllables.length === 0 && constructedSyllables.length > 0) {
        handleAnswer(constructedSyllables.join(''));
    }
  }, [availableSyllables, constructedSyllables, questionType, handleAnswer]);

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
      setIsCorrect(false); // To show general failure feedback if needed

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
                <p className={`${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'} flex items-center justify-center flex-wrap gap-2`}>
                    {renderTextWithBlank(currentQuestion.text, selectedAnswer || '')}
                </p>
                {currentQuestion.text2 && <p className={`${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'} flex items-center justify-center flex-wrap gap-2`}>
                    {renderTextWithBlank(currentQuestion.text2, selectedAnswer || '')}
                </p>}
            </>
        ) : (
             <>
                {currentQuestion.text && <p className={`${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'}`}>{currentQuestion.text}</p>}
                {currentQuestion.text2 && <p className={`${subject === 'math' ? 'text-6xl font-mono tracking-widest' : 'text-5xl'} mt-4`}>{currentQuestion.text2}</p>}
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
                "grid gap-4",
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
                                "flip-card h-32 rounded-lg text-3xl font-bold",
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
                                    <Bot className="w-16 h-16 text-primary-foreground/70" />
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

        {(questionType === 'multiple_choice' || questionType === 'fill_in_the_blank') && (
            <div className="grid grid-cols-3 gap-6">
              {shuffledOptions.map((option, index) => (
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
                    <div key={`${letter}-${index}`} className="flip-card h-20 w-16">
                      <div
                        className={cn(
                          'flip-card-inner',
                          guessedLetters[letter] === 'correct' && 'flipped'
                        )}
                      >
                        <div className="flip-card-front bg-muted rounded-lg" />
                        <div className="flip-card-back bg-card rounded-lg flex items-center justify-center text-4xl font-bold uppercase text-primary">
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
                    className="h-auto p-4 text-5xl font-bold shadow-lg"
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
                          className="bg-success/20 text-success-foreground p-3 rounded-lg text-5xl font-bold animate-item-pop-in"
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
