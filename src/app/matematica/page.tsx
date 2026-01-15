'use client'

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, CheckCircle, XCircle } from 'lucide-react';

type Question = {
  text: string;
  options: number[];
  answer: number;
};

const easyQuestions: Question[] = [
  { text: '2 + 3 = ?', options: [4, 5, 6], answer: 5 },
  { text: '5 - 1 = ?', options: [3, 4, 2], answer: 4 },
  { text: '4 + 4 = ?', options: [8, 7, 9], answer: 8 },
];

export default function MathGamesPage() {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSelectDifficulty = (level: 'easy' | 'medium' | 'hard') => {
    setDifficulty(level);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
  };
  
  const handleAnswer = (option: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(option);
    const correct = option === easyQuestions[currentQuestionIndex].answer;
    setIsCorrect(correct);
    
    setTimeout(() => {
        setSelectedAnswer(null);
        setIsCorrect(null);
        if (correct) {
            setCurrentQuestionIndex((prev) => (prev + 1) % easyQuestions.length);
        }
    }, 2000);
  };

  const currentQuestion = easyQuestions[currentQuestionIndex];

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="w-full max-w-3xl text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-headline">Jogos de Matemática</CardTitle>
          <CardDescription className="text-lg">
            Selecione a dificuldade para começar a jogar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!difficulty ? (
            <div className="flex justify-center gap-4">
              <Button onClick={() => handleSelectDifficulty('easy')} className="h-24 w-40 text-2xl">Fácil</Button>
              <Button onClick={() => handleSelectDifficulty('medium')} className="h-24 w-40 text-2xl" disabled>Médio</Button>
              <Button onClick={() => handleSelectDifficulty('hard')} className="h-24 w-40 text-2xl" disabled>Difícil</Button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="relative p-8 border-4 border-dashed rounded-lg border-accent">
                <p className="text-6xl font-bold font-mono tracking-widest">{currentQuestion.text}</p>
                <Button variant="ghost" size="icon" className="absolute top-4 right-4">
                  <Volume2 className="w-8 h-8" />
                  <span className="sr-only">Ler em voz alta</span>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    variant={selectedAnswer === option ? (isCorrect ? 'success' : 'destructive') : 'default'}
                    className='h-32 text-5xl font-bold'
                    disabled={selectedAnswer !== null}
                  >
                    {option}
                  </Button>
                ))}
              </div>
              {isCorrect !== null && (
                <div className={`flex items-center justify-center text-4xl font-bold ${isCorrect ? 'text-success-foreground' : 'text-destructive-foreground'}`}>
                    {isCorrect ? <CheckCircle className="w-16 h-16 text-success mr-4"/> : <XCircle className="w-16 h-16 text-destructive mr-4"/>}
                    {isCorrect ? 'Correto!' : 'Tente novamente!'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
