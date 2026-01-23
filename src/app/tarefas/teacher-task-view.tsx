
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, writeBatch, getDoc, getDocs, query, where } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Send, Edit, BookCopy, Search, X, Save, Eye, User, FileText, Calendar, Clock, Target, Check, Circle, TestTube, Award, Download, WandSparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import seedData from '@/lib/seed-exercises.json';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';


// Schemas
const performanceQuestionSchema = z.object({
  text: z.string(),
  text2: z.string().optional(),
  options: z.array(z.string()),
  answer: z.string(),
  questionType: z.enum(['multiple_choice', 'fill_in_the_blank', 'organize_syllables']).optional(),
  studentAnswer: z.string().optional(),
  attempts: z.number().optional(),
  status: z.enum(['correct', 'incorrect', 'unanswered']).optional(),
  timeTaken: z.number().optional(),
});

const taskSchema = z.object({
  title: z.string().min(3, { message: "O título deve ter pelo menos 3 caracteres." }),
  studentProzilId: z.string().min(1, { message: "É obrigatório selecionar um aluno." }),
  description: z.string().optional(),
  dueDate: z.string().min(1, { message: "A data de entrega é obrigatória." }),
  subject: z.enum(['matematica', 'portugues']),
  taskType: z.enum(['jogo_interativo', 'folha_imprimivel']),
  questions: z.array(performanceQuestionSchema).min(1, { message: "A tarefa deve ter pelo menos um exercício." }),
  isCompleted: z.boolean(),
  id: z.string().optional(),
  createdAt: z.string().optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  teacherName: z.string().optional(),
  completedAt: z.string().optional(),
  totalTime: z.number().optional(),
});

const exerciseObjectSchema = z.object({
  id: z.string().optional(),
  teacherId: z.string(),
  questionType: z.enum(['multiple_choice', 'fill_in_the_blank', 'organize_syllables']),
  text: z.string().min(3, 'A pergunta deve ter pelo menos 3 caracteres.'),
  text2: z.string().optional(),
  options: z.array(z.string()).min(2, "Deve haver pelo menos 2 itens.").max(6, "Máximo de 6 itens."),
  answer: z.string().min(1, 'A resposta correta é obrigatória.'),
  subject: z.enum(['matematica', 'portugues']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const exerciseSchema = exerciseObjectSchema.refine(data => {
    if (data.questionType === 'multiple_choice' || data.questionType === 'fill_in_the_blank') {
        if (data.options.length !== 3) return false;
        if (data.options.some(o => o.trim() === '')) return false;
        return data.options.map(o => o.toUpperCase()).includes(data.answer.toUpperCase());
    }
    return true;
}, {
    message: "Para Múltipla Escolha/Completar Lacuna, deve haver 3 opções não vazias e a resposta deve ser uma delas.",
    path: ['options'],
});


type Exercise = z.infer<typeof exerciseSchema>;

type PerformanceQuestion = {
  text: string;
  text2?: string;
  options: string[];
  answer: string;
  questionType?: 'multiple_choice' | 'fill_in_the_blank' | 'organize_syllables';
  studentAnswer?: string;
  attempts?: number;
  status?: 'correct' | 'incorrect' | 'unanswered';
  timeTaken?: number; // in ms
};

type Task = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  dueDate: string;
  teacherId: string;
  studentId: string;
  studentProzilId: string;
  studentName?: string;
  teacherName?: string;
  subject: 'matematica' | 'portugues';
  taskType: 'jogo_interativo' | 'folha_imprimivel';
  isCompleted: boolean;
  completedAt?: string;
  totalTime?: number; // in seconds
  questions: PerformanceQuestion[];
};

type Student = {
  id: string;
  name: string;
  prozilId: string;
};


function ExerciseBank({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<'all' | 'matematica' | 'portugues'>('all');
  const [questionTypeFilter, setQuestionTypeFilter] = useState<'all' | 'multiple_choice' | 'fill_in_the_blank' | 'organize_syllables'>('all');

  const specialCharsCategories = {
    'Símbolos e Setas': ['★', '☆', '✔', '✖', '●', '■', '▲', '♦', '♥', '♠', '♣', '→', '←', '↑', '↓', '↔', '↩', '↪'],
    'Pessoas e Profissões': ['😀', '😁', '😂', '😊', '😍', '🤔', '👍', '👎', '👏', '🙏', '💪', '👨‍🏫', '👩‍🏫', '👨‍🎓', '👩‍🎓', '👨‍⚕️', '👩‍⚕️', '👨‍⚖️', '👩‍⚖️', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀', '👨‍🚒', '👩‍🚒', '👮', '👮‍♀️', '🕵️', '🕵️‍♀️', '💂', '💂‍♀️', '👷', '👷‍♀️'],
    'Animais': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🐿️'],
    'Natureza e Clima': ['💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌍', '🌕', '🌙', '☀️', '⭐', '☁️', '⛅', '⛈️', '🌧️', '🌨️', '🌩️', '🌪️', '🔥', '🌊'],
    'Comida e Bebida': ['🍇', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍓', '🥝', '🍅', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🍞', '🥐', '🥖', '🥨', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍣', '🍦', '🥧', '🧁', '🍰', '🎂', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕', '🍷', '🍸', '🍹', '🍺'],
    'Atividades e Esportes': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '⛳', '🏹', '🎣', '🥊', '🥋', '🛹', '🎿', '⛷️', '🏂', '🏋️‍♀️', '🤸‍♂️', '⛹️‍♀️', '🧗‍♂️', '🧘‍♀️', '🏄‍♂️', '🏊‍♀️', '🏇', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎲', '🎯', '🎳', '🎮'],
    'Viagem e Lugares': ['🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '✈️', '🚀', '🚁', '⛵', '⚓', '⛽', '🚦', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🏠', '🏡', '🏢', '🏥', '🏦', '🏫', '🏛️', '⛪', '🕌', '🇧🇷', '🇺🇸', '🇨🇦', '🇯🇵', '🇩🇪', '🇫🇷', '🇬🇧', '🇮🇹', '🇪🇸', '🇨🇳'],
    'Objetos e Ferramentas': ['📱', '💻', '⌨️', '🖨️', '📷', '📺', '⏰', '💡', '🔦', '💵', '💰', '💳', '💎', '⚖️', '🔧', '🔨', '🔩', '⚙️', '🧱', '🔫', '💣', '🔪', '🛡️', '🔬', '💊', '💉', '🌡️', '🧹', '🔑', '🛋️', '🛌', '🚪', '🧸', '🎁', '🎈', '🎉', '✉️', '📦', '🗑️', '✂️', '📌', '🚩', '🔐', '🔒', '🔓', '✏️', '📚', '📖', '🔖'],
    'Números': ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
  };

  const exercisesQuery = useMemoFirebase(() => collection(firestore, 'teachers', teacherId, 'exercises'), [firestore, teacherId]);
  const { data: exercises, isLoading } = useCollection<Exercise>(exercisesQuery);
  
  const form = useForm<Exercise>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: { text: '', text2: '', options: ['', '', ''], answer: '', subject: 'matematica', difficulty: 'easy', teacherId: teacherId, questionType: 'multiple_choice' },
  });
  
  const { watch, setValue, control } = form;
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "options"
  });
  const questionType = watch('questionType');

  const getOptionLabel = (index: number) => {
    if (questionType === 'fill_in_the_blank') {
        return 'Opção Correta';
    }
    if (questionType === 'organize_syllables') {
        return `Sílaba ${index + 1}`;
    }
    return `Opção ${index + 1}`;
  };

  const getOptionPlaceholder = (index: number): string => {
    if (questionType === 'organize_syllables') {
      const osPlaceholders = ['Ex: BOR', 'Ex: BO', 'Ex: LE', 'Ex: TA'];
      return osPlaceholders[index] || 'Sílaba';
    }
    if (questionType === 'fill_in_the_blank') {
       if (index === 0) {
        return 'Ex: AMARELO (será a resposta)';
      }
      const defaultPlaceholders = ['Ex: AZUL', 'Ex: VERDE'];
      return defaultPlaceholders[index - 1] || 'Opção';
    }
    // For multiple_choice
    return `Ex: Opção ${index + 1}`;
  };

  const firstOption = watch('options.0');
  
  const resetForm = useCallback(() => {
    form.reset({ text: '', text2: '', options: ['', '', ''], answer: '', subject: 'matematica', difficulty: 'easy', teacherId: teacherId, id: '', questionType: 'multiple_choice' });
  }, [form, teacherId]);

  useEffect(() => {
    if (questionType === 'fill_in_the_blank') {
      setValue('answer', firstOption || '', { shouldValidate: true });
    }
  }, [firstOption, questionType, setValue]);


  const filteredExercises = useMemo(() => {
    if (isLoading || !exercises) {
      return [];
    }
    return exercises.filter(ex => {
        const subjectMatch = subjectFilter === 'all' || ex.subject === subjectFilter;
        const effectiveQuestionType = ex.questionType || 'multiple_choice';
        const typeMatch = questionTypeFilter === 'all' || effectiveQuestionType === questionTypeFilter;
        return subjectMatch && typeMatch;
    });
  }, [exercises, subjectFilter, questionTypeFilter, isLoading]);

  const handleSeedExercises = async () => {
    if (!teacherId) {
        toast({ variant: 'destructive', title: 'Ocorreu um erro.', description: 'ID do professor não encontrado.' });
        return;
    }
    setIsSeeding(true);
    const exercisesCollectionRef = collection(firestore, 'teachers', teacherId, 'exercises');

    try {
        const batch = writeBatch(firestore);
        (seedData.exercises as any[]).forEach(exercise => {
            const newExerciseRef = doc(exercisesCollectionRef);
            const exerciseWithId = { ...exercise, id: newExerciseRef.id, teacherId: teacherId };
            batch.set(newExerciseRef, exerciseWithId);
        });
        await batch.commit();
        toast({ title: 'Sucesso!', description: `${seedData.exercises.length} exercícios de exemplo foram adicionados ao seu banco.` });
    } catch (e) {
        console.error("Error seeding exercises: ", e);
        toast({ variant: 'destructive', title: 'Erro ao popular o banco', description: 'Verifique o console para mais detalhes.' });
    } finally {
        setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (editingExercise) {
      form.reset(editingExercise);
      replace(editingExercise.options.map(o => o));
    } else {
      resetForm();
    }
  }, [editingExercise, form, resetForm, replace]);
  
  useEffect(() => {
    if (questionType === 'multiple_choice' || questionType === 'fill_in_the_blank') {
        if (fields.length !== 3) {
            replace(['', '', '']);
        }
    } else if (questionType === 'organize_syllables') {
        if (fields.length < 2) {
            replace(['', '']);
        }
    }
  }, [questionType, fields.length, replace]);

  const onSubmit = (values: Exercise) => {
    setIsSubmitting(true);
    
    let finalValues: Exercise = {
        ...values,
        text: values.text.toUpperCase(),
        text2: values.text2 ? values.text2.toUpperCase() : '',
        options: values.options.filter(o => o.trim() !== '').map(o => o.toUpperCase()),
        answer: values.answer.toUpperCase(),
    };

    if (finalValues.questionType === 'organize_syllables') {
        finalValues.answer = finalValues.options.join('');
    }

    if (finalValues.questionType === 'fill_in_the_blank') {
      finalValues.answer = finalValues.options[0];
    }
    
    if (editingExercise?.id) {
      const exerciseRef = doc(firestore, 'teachers', teacherId, 'exercises', editingExercise.id);
      updateDoc(exerciseRef, finalValues).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: exerciseRef.path,
          operation: 'update',
          requestResourceData: finalValues,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao atualizar exercício' });
      }).finally(() => {
        toast({ title: 'Exercício atualizado!' });
        setEditingExercise(null);
        resetForm();
        setIsSubmitting(false);
      });
    } else {
      const newExerciseRef = doc(collection(firestore, 'teachers', teacherId, 'exercises'));
      const newExercise = { ...finalValues, id: newExerciseRef.id, teacherId };
      setDoc(newExerciseRef, newExercise).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: newExerciseRef.path,
          operation: 'create',
          requestResourceData: newExercise,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao salvar exercício' });
      }).finally(() => {
        toast({ title: 'Exercício salvo no banco!' });
        resetForm();
        setIsSubmitting(false);
      });
    }
  };

  const handleDelete = () => {
    if (!deletingExercise?.id) return;
    setIsSubmitting(true);
    const exerciseRef = doc(firestore, 'teachers', teacherId, 'exercises', deletingExercise.id);
    deleteDoc(exerciseRef).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: exerciseRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({ variant: 'destructive', title: 'Erro ao excluir' });
    }).finally(() => {
        toast({ title: 'Exercício excluído!' });
        setDeletingExercise(null);
        setIsSubmitting(false);
    });
  };
  
  return (
     <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>{editingExercise ? 'Editar Exercício' : 'Criar Novo Exercício'}</CardTitle>
          <CardDescription>Adicione uma nova pergunta ao seu banco de exercícios reutilizáveis.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="questionType" render={({ field }) => (
                  <FormItem><FormLabel>Tipo de Atividade</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="multiple_choice">Múltipla Escolha</SelectItem><SelectItem value="fill_in_the_blank">Complete a Lacuna</SelectItem><SelectItem value="organize_syllables">Organizar Sílabas</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )}/>

              <FormField control={form.control} name="text" render={({ field }) => (
                <FormItem><FormLabel>Pergunta / Dica</FormLabel><FormControl><Textarea {...field} placeholder={
                    questionType === 'fill_in_the_blank' ? "Ex: A COR DO SOL É ___. (Use 3 underline ___ para a lacuna)" :
                    questionType === 'organize_syllables' ? "Ex: ORGANIZE AS SÍLABAS E FORME O NOME DO INSETO:" :
                    'Ex: QUAL É A COR DO SOL?'
                } /></FormControl><FormMessage /></FormItem>
              )}/>

              <FormField control={form.control} name="text2" render={({ field }) => (
                <FormItem><FormLabel>Imagem / Complemento (Opcional)</FormLabel><FormControl><Textarea {...field} placeholder={
                    questionType === 'organize_syllables' ? 'Ex: 🦋' : 'Ex: ☀️'
                } /></FormControl><FormMessage /></FormItem>
              )}/>

              <div className="space-y-3 rounded-lg border p-4">
                <Label className="font-medium">Inserir Símbolo</Label>
                <div className="max-h-40 overflow-y-auto space-y-3 pr-2">
                  {Object.entries(specialCharsCategories).map(([category, chars]) => (
                    <div key={category}>
                      <Label className="text-xs text-muted-foreground">{category}</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chars.map(char => (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            key={char}
                            className="h-9 w-9 text-lg"
                            onClick={() => {
                              const currentText = form.getValues('text2') || '';
                              form.setValue('text2', currentText + char, { shouldValidate: true });
                            }}
                          >
                            {char}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Matéria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="matematica">Matemática</SelectItem><SelectItem value="portugues">Português</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem><FormLabel>Dificuldade</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="easy">Fácil</SelectItem><SelectItem value="medium">Médio</SelectItem><SelectItem value="hard">Difícil</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )}/>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                    <FormField key={field.id} control={form.control} name={`options.${index}`} render={({ field }) => (
                        <FormItem>
                            <FormLabel>{getOptionLabel(index)}</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl><Input {...field} placeholder={getOptionPlaceholder(index)} /></FormControl>
                                {questionType === 'organize_syllables' && fields.length > 2 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                )}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}/>
                ))}
                 {questionType === 'organize_syllables' && fields.length < 6 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append('')}><PlusCircle className="mr-2" /> Adicionar Sílaba</Button>
                )}
              </div>
              
              {questionType === 'multiple_choice' && (
                  <FormField control={form.control} name="answer" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Resposta Correta</FormLabel>
                        <FormControl><Input {...field} placeholder='Ex: AMARELO'/></FormControl>
                        <FormDescription>
                            O texto deve corresponder exatamente a uma das opções.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                  )}/>
              )}
               {questionType === 'organize_syllables' && (
                  <FormField control={form.control} name="answer" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Resposta Correta (Palavra Completa)</FormLabel>
                        <FormControl><Input {...field} placeholder='Ex: BORBOLETA' disabled /></FormControl>
                        <FormDescription>
                            Será preenchida automaticamente com a junção das sílabas.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                  )}/>
              )}
              {questionType === 'fill_in_the_blank' && (
                <FormField control={form.control} name="answer" render={({ field }) => (
                  <FormItem className="hidden">
                      <FormLabel>Resposta Correta (automática)</FormLabel>
                      <FormControl><Input {...field} readOnly /></FormControl>
                  </FormItem>
                )}/>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                  {editingExercise ? 'Salvar Alterações' : 'Salvar Exercício'}
                </Button>
                {editingExercise && <Button variant="ghost" onClick={() => setEditingExercise(null)}>Cancelar Edição</Button>}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <CardTitle>Seu Banco de Exercícios</CardTitle>
            <CardDescription>Visualize, gerencie e adicione exercícios de exemplo.</CardDescription>
            <div className="space-y-4 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium pr-2">Matéria:</span>
                  <Button variant={subjectFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSubjectFilter('all')}>
                      Todos ({exercises?.length || 0})
                  </Button>
                  <Button variant={subjectFilter === 'matematica' ? 'default' : 'outline'} size="sm" onClick={() => setSubjectFilter('matematica')}>
                      Matemática ({exercises?.filter(e => e.subject === 'matematica').length || 0})
                  </Button>
                  <Button variant={subjectFilter === 'portugues' ? 'default' : 'outline'} size="sm" onClick={() => setSubjectFilter('portugues')}>
                      Português ({exercises?.filter(e => e.subject === 'portugues').length || 0})
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium pr-2">Tipo de Jogo:</span>
                    <Button variant={questionTypeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setQuestionTypeFilter('all')}>Todos</Button>
                    <Button variant={questionTypeFilter === 'multiple_choice' ? 'default' : 'outline'} size="sm" onClick={() => setQuestionTypeFilter('multiple_choice')}>M. Escolha</Button>
                    <Button variant={questionTypeFilter === 'fill_in_the_blank' ? 'default' : 'outline'} size="sm" onClick={() => setQuestionTypeFilter('fill_in_the_blank')}>Completar</Button>
                    <Button variant={questionTypeFilter === 'organize_syllables' ? 'default' : 'outline'} size="sm" onClick={() => setQuestionTypeFilter('organize_syllables')}>Organizar</Button>
                </div>
            </div>
            <div className="pt-4">
               <Button 
                    onClick={handleSeedExercises} 
                    disabled={isLoading || isSeeding || (exercises && exercises.length > 0)}
                    size="sm"
                    variant="secondary"
                >
                    {isSeeding ? <Loader2 className="animate-spin mr-2"/> : <PlusCircle className="mr-2"/>}
                    Popular com Exemplos
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex h-full items-center justify-center pt-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <ul className="space-y-2 h-[480px] overflow-y-auto pr-2">
            {filteredExercises.length > 0 ? filteredExercises.map(ex => (
              <li key={ex.id} className="p-3 border rounded-lg flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{ex.text}{ex.text2 && ` ${ex.text2}`}</p>
                  <p className="text-sm text-muted-foreground">Resposta: {ex.answer}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">{ex.subject === 'matematica' ? 'Matemática' : 'Português'}</Badge>
                    <Badge variant="outline">{ex.difficulty}</Badge>
                    <Badge variant={
                        (ex.questionType || 'multiple_choice') === 'fill_in_the_blank' ? 'default'
                        : (ex.questionType === 'organize_syllables' ? 'success' : 'secondary')
                    }>
                        {(ex.questionType === 'fill_in_the_blank') ? 'Completar' 
                        : (ex.questionType === 'organize_syllables' ? 'Organizar' : 'M. Escolha')}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                   <Button variant="ghost" size="icon" onClick={() => setEditingExercise(ex)}><Edit className="w-4 h-4" /></Button>
                   <Button variant="ghost" size="icon" onClick={() => setDeletingExercise(ex)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </li>
            )) : (
              <div className="text-center text-muted-foreground py-8">
                 {subjectFilter === 'all' && questionTypeFilter === 'all' ? (
                  <>
                    <p className="font-semibold">Seu banco de exercícios está vazio.</p>
                    <p className="text-sm mt-2">Use o botão "Popular com Exemplos" para adicionar exercícios e começar.</p>
                  </>
                ) : (
                  <p>Nenhum exercício encontrado para este filtro.</p>
                )}
              </div>
            )}
          </ul>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={!!deletingExercise} onOpenChange={open => !open && setDeletingExercise(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Exercício?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente e removerá o exercício do seu banco.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TaskManager({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [bankSubjectFilter, setBankSubjectFilter] = useState<'all' | 'matematica' | 'portugues'>('all');
  const [bankQuestionTypeFilter, setBankQuestionTypeFilter] = useState<'all' | 'multiple_choice' | 'fill_in_the_blank' | 'organize_syllables'>('all');
  const [isStudentSelectorOpen, setIsStudentSelectorOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectableStudents, setSelectableStudents] = useState<Student[]>([]);
  const [areStudentsLoading, setAreStudentsLoading] = useState(false);

  const exercisesQuery = useMemoFirebase(() => collection(firestore, 'teachers', teacherId, 'exercises'), [firestore, teacherId]);
  const { data: exercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesQuery);
  const tasksQuery = useMemoFirebase(() => collection(firestore, 'teachers', teacherId, 'tasks'), [firestore, teacherId]);
  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);

  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    // Create a copy before sorting to avoid state mutation
    const tasksCopy = [...tasks];
    return tasksCopy.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });
  }, [tasks]);

  const filteredBankExercises = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter(ex => {
      const subjectMatch = bankSubjectFilter === 'all' || ex.subject === bankSubjectFilter;
      const effectiveQuestionType = ex.questionType || 'multiple_choice';
      const typeMatch = bankQuestionTypeFilter === 'all' || effectiveQuestionType === bankQuestionTypeFilter;
      return subjectMatch && typeMatch;
    });
  }, [exercises, bankSubjectFilter, bankQuestionTypeFilter]);
  
  const filteredStudents = useMemo(() => {
    if (!selectableStudents) return [];
    return selectableStudents.filter(s =>
      (s.name && s.name.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.prozilId && s.prozilId.toLowerCase().includes(studentSearch.toLowerCase()))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectableStudents, studentSearch]);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', studentProzilId: '', description: '', dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], subject: 'matematica', taskType: 'jogo_interativo', questions: [], isCompleted: false },
  });

  useEffect(() => {
    if (editingTask) {
        form.reset({
            ...editingTask,
            studentProzilId: editingTask.studentProzilId,
            dueDate: editingTask.dueDate ? format(new Date(editingTask.dueDate), 'yyyy-MM-dd') : '',
        });
        setSelectedExercises((editingTask.questions || []).map((q, i) => ({...q, id: `${editingTask.id}-q-${i}`, subject: editingTask.subject, difficulty: 'easy', teacherId })));
    } else {
        form.reset({ title: '', studentProzilId: '', description: '', dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], subject: 'matematica', taskType: 'jogo_interativo', questions: [], isCompleted: false });
        setSelectedExercises([]);
    }
  }, [editingTask, form, teacherId]);


  useEffect(() => {
    form.setValue('questions', selectedExercises.map(e => ({text: e.text, text2: e.text2, options: e.options, answer: e.answer, questionType: e.questionType})));
  }, [selectedExercises, form]);

  const handleReuse = (taskToReuse: Task) => {
    setEditingTask(null); 
    form.reset({
      ...taskToReuse,
      title: `${taskToReuse.title} (Cópia)`,
      id: undefined,
      studentProzilId: '', 
      isCompleted: false,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
    });
    
    const reusedExercises: Exercise[] = (taskToReuse.questions || []).map((q, i) => ({
      ...q,
      id: `reused-${taskToReuse.id}-q-${i}-${Date.now()}`,
      teacherId: teacherId,
      subject: taskToReuse.subject,
      difficulty: 'easy', 
    }));
    
    setSelectedExercises(reusedExercises);
    toast({ title: 'Tarefa Pronta para Reutilizar', description: 'Atribua a um novo aluno e salve.' });
  };
  
  const handleOpenStudentSelector = async () => {
    if (!teacherId) return;
    setIsStudentSelectorOpen(true);
    if (selectableStudents.length > 0) return; // Do not re-fetch if already loaded

    setAreStudentsLoading(true);
    const studentsColRef = collection(firestore, 'students');
    const q = query(studentsColRef, where('teacherIds', 'array-contains', teacherId));
    try {
        const querySnapshot = await getDocs(q);
        const students = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
        setSelectableStudents(students);
    } catch (e) {
        console.error("Error fetching students: ", e);
        toast({ variant: "destructive", title: "Erro ao buscar alunos." });
    } finally {
        setAreStudentsLoading(false);
    }
  };


  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    setIsSubmitting(true);

    let studentUid, studentName, teacherName;
    try {
        const studentsRef = collection(firestore, 'students');
        const q = query(studentsRef, where("prozilId", "==", values.studentProzilId));
        const studentSnap = await getDocs(q);
        
        if (studentSnap.empty) {
            form.setError('studentProzilId', { message: 'ID ProZil do aluno não encontrado.' });
            setIsSubmitting(false);
            return;
        }
        const studentDoc = studentSnap.docs[0];
        studentUid = studentDoc.id;
        studentName = studentDoc.data().name;

        const teacherRef = doc(firestore, 'teachers', teacherId);
        const teacherSnap = await getDoc(teacherRef);
        teacherName = teacherSnap.exists() ? teacherSnap.data().name : 'Professor';
    } catch (e) {
        console.error("Error fetching user data:", e);
        toast({ variant: 'destructive', title: 'Erro ao buscar dados', description: 'Não foi possível encontrar o aluno ou professor.' });
        setIsSubmitting(false);
        return;
    }

    const batch = writeBatch(firestore);
    
    const questionsForDb = values.questions.map(q => ({
        ...q,
        text2: q.text2 || '',
    }));

    if (editingTask?.id) {
        const taskData = { ...values, questions: questionsForDb, teacherId, dueDate: new Date(values.dueDate).toISOString(), studentName, teacherName, studentId: editingTask.studentId };
        const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', editingTask.id);
        const studentTaskRef = doc(firestore, 'students', editingTask.studentId, 'tasks', editingTask.id);
        
        batch.update(teacherTaskRef, taskData);
        batch.update(studentTaskRef, taskData);
    } else {
        const newTaskId = doc(collection(firestore, 'teachers')).id;
        const taskData = { ...values, questions: questionsForDb, id: newTaskId, teacherId, isCompleted: false, createdAt: new Date().toISOString(), dueDate: new Date(values.dueDate).toISOString(), studentId: studentUid, studentName, teacherName };

        const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', newTaskId);
        const studentTaskRef = doc(firestore, 'students', studentUid, 'tasks', newTaskId);
        
        batch.set(teacherTaskRef, taskData);
        batch.set(studentTaskRef, taskData);
    }
    
    batch.commit().then(() => {
        toast({ title: editingTask ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!' });
        setEditingTask(null);
        form.reset();
        setSelectedExercises([]);
    }).catch((serverError) => {
        const path = editingTask ? `teachers/${teacherId}/tasks/${editingTask.id}` : `teachers/${teacherId}/tasks`;
        const permissionError = new FirestorePermissionError({ path, operation: 'write', requestResourceData: values });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao salvar tarefa' });
    }).finally(() => {
        setIsSubmitting(false);
    });
  };

  const handleDelete = () => {
    if (!deletingTask) return;
    const { id, studentId } = deletingTask;
    setIsSubmitting(true);
    
    const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', id as string);
    const studentTaskRef = doc(firestore, 'students', studentId, 'tasks', id as string);

    const batch = writeBatch(firestore);
    batch.delete(teacherTaskRef);
    batch.delete(studentTaskRef);

    batch.commit().catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: teacherTaskRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao excluir tarefa' });
    }).finally(() => {
      toast({ title: 'Tarefa excluída!' });
      setDeletingTask(null);
      setIsSubmitting(false);
    });
  }

  return (
     <>
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
            <CardTitle>{editingTask ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</CardTitle>
            <CardDescription>{editingTask ? 'Modifique os detalhes da tarefa' : 'Preencha os detalhes e adicione exercícios do seu banco'}</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título da Tarefa</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                
                <FormField
                  control={form.control}
                  name="studentProzilId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID ProZil do Aluno</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input {...field} disabled={!!editingTask} placeholder="Selecione um aluno..."/>
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleOpenStudentSelector}
                          disabled={!!editingTask}
                          aria-label="Buscar Aluno"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Matéria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="matematica">Matemática</SelectItem><SelectItem value="portugues">Português</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="taskType" render={({ field }) => (<FormItem><FormLabel>Tipo de Tarefa</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="jogo_interativo">Jogo Interativo</SelectItem><SelectItem value="folha_imprimivel">Folha Imprimível</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem><FormLabel>Data de Entrega</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                     {editingTask && (
                        <FormField
                            control={form.control}
                            name="isCompleted"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-4 md:mt-0">
                                <div className="space-y-0.5">
                                    <FormLabel>Tarefa Concluída</FormLabel>
                                </div>
                                <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    )}
                 </div>

                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>Exercícios da Tarefa ({selectedExercises.length})</CardTitle>
                            <CardDescription>Adicione perguntas do seu banco de exercícios.</CardDescription>
                        </div>
                        <Button type="button" onClick={() => setIsBankOpen(true)}><PlusCircle className="mr-2"/> Adicionar</Button>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedExercises.map((ex, index) => (
                            <li key={ex.id || index} className="flex items-center justify-between p-2 border rounded-md">
                                <span className="truncate">{ex.text}{ex.text2 && ` ${ex.text2}`}</span>
                                <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedExercises(prev => prev.filter(p => p.id !== ex.id))}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                            </li> 
                            ))}
                        </ul>
                        <FormMessage>{form.formState.errors.questions?.message}</FormMessage>
                    </CardContent>
                </Card>

                <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} 
                        {editingTask ? 'Atualizar Tarefa' : 'Atribuir Tarefa'}
                    </Button>
                    {editingTask && <Button type="button" variant="ghost" onClick={() => setEditingTask(null)}>Cancelar</Button>}
                </div>
                </form>
            </Form>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Tarefas Criadas</CardTitle>
                <CardDescription>Visualize e gerencie as tarefas que você atribuiu.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingTasks ? <p>Carregando tarefas...</p> : (
                  <ul className="space-y-2 h-[500px] overflow-y-auto">
                      {sortedTasks.map(task => (
                          <li key={task.id} className="p-3 border rounded-lg flex justify-between items-start">
                              <div className="flex-1 space-y-1">
                                  <p className="font-semibold">{task.title}</p>
                                  <p className="text-sm text-muted-foreground">Para: {task.studentName || task.studentId}</p>
                                  <div><Badge variant={task.isCompleted ? 'secondary' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge></div>
                              </div>
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">...</Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                      <DropdownMenuItem asChild className="cursor-pointer">
                                          <Link href={`/${task.subject}?taskId=${task.id}&studentId=${task.studentId}`}>
                                              <Eye className="mr-2 h-4 w-4"/> Visualizar Jogo
                                          </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem asChild className="cursor-pointer">
                                          <Link href={`/${task.subject}?taskId=${task.id}&studentId=${teacherId}&source=teacher&mode=test`}>
                                              <TestTube className="mr-2 h-4 w-4"/> Testar Tarefa
                                          </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setEditingTask(task as Task)} className="cursor-pointer">
                                          <Edit className="mr-2 h-4 w-4"/> Editar
                                      </DropdownMenuItem>
                                       <DropdownMenuItem onClick={() => handleReuse(task as Task)} className="cursor-pointer">
                                          <BookCopy className="mr-2 h-4 w-4"/> Reutilizar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setDeletingTask(task as Task)} className="cursor-pointer text-destructive focus:text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4"/> Excluir
                                      </DropdownMenuItem>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </li>
                      ))}
                  </ul>
                )}
            </CardContent>
        </Card>
      </div>
      
      <Dialog open={isStudentSelectorOpen} onOpenChange={setIsStudentSelectorOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
            <DialogTitle>Selecionar Aluno</DialogTitle>
            <DialogDescription>
                Selecione um dos seus alunos para atribuir esta tarefa.
            </DialogDescription>
            </DialogHeader>
            <div className="py-2">
            <Input 
                placeholder="Buscar por nome ou ID ProZil..." 
                value={studentSearch} 
                onChange={(e) => setStudentSearch(e.target.value)} 
            />
            </div>
            <div className="space-y-2 h-64 overflow-y-auto pr-2">
              {areStudentsLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                    <div 
                    key={student.id} 
                    className="p-3 border rounded-md cursor-pointer hover:bg-muted"
                    onClick={() => {
                        if (student.prozilId) {
                          form.setValue('studentProzilId', student.prozilId);
                          setIsStudentSelectorOpen(false);
                          setStudentSearch('');
                        }
                    }}
                    >
                    <p className="font-semibold">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.prozilId}</p>
                    </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground pt-10">
                    Nenhum aluno encontrado. Você já cadastrou algum aluno?
                </div>
              )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsStudentSelectorOpen(false)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
              <DialogHeader><DialogTitle>Adicionar Exercícios do Banco</DialogTitle><DialogDescription>Selecione os exercícios que você quer adicionar a esta tarefa.</DialogDescription></DialogHeader>
               <div className="space-y-4 pt-2 border-y pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium pr-4">Filtrar por Matéria:</span>
                    <Button variant={bankSubjectFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('all')}>Todos</Button>
                    <Button variant={bankSubjectFilter === 'matematica' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('matematica')}>Matemática</Button>
                    <Button variant={bankSubjectFilter === 'portugues' ? 'default' : 'outline'} size="sm" onClick={() => setBankSubjectFilter('portugues')}>Português</Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium pr-4">Filtrar por Jogo:</span>
                    <Button variant={bankQuestionTypeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setBankQuestionTypeFilter('all')}>Todos</Button>
                    <Button variant={bankQuestionTypeFilter === 'multiple_choice' ? 'default' : 'outline'} size="sm" onClick={() => setBankQuestionTypeFilter('multiple_choice')}>M. Escolha</Button>
                    <Button variant={bankQuestionTypeFilter === 'fill_in_the_blank' ? 'default' : 'outline'} size="sm" onClick={() => setBankQuestionTypeFilter('fill_in_the_blank')}>Completar</Button>
                    <Button variant={bankQuestionTypeFilter === 'organize_syllables' ? 'default' : 'outline'} size="sm" onClick={() => setBankQuestionTypeFilter('organize_syllables')}>Organizar</Button>
                  </div>
               </div>
              <div className="flex-1 overflow-y-auto pr-4">
                  {isLoadingExercises ? (
                    <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : filteredBankExercises.length > 0 ? (
                    filteredBankExercises.map(ex => (
                      <div key={ex.id} className="flex items-center gap-4 p-2 border-b">
                          <Checkbox 
                              id={`bank-${ex.id}`} 
                              checked={selectedExercises.some(s => s.id === ex.id)}
                              onCheckedChange={(checked) => {
                                  if (checked) {
                                      setSelectedExercises(prev => [...prev, ex]);
                                  } else {
                                      setSelectedExercises(prev => prev.filter(p => p.id !== ex.id));
                                  }
                              }}
                          />
                          <label htmlFor={`bank-${ex.id}`} className="flex-1 cursor-pointer">
                              <p className="font-semibold">{ex.text}{ex.text2 && ` ${ex.text2}`}</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                  <Badge variant="secondary">{ex.subject === 'matematica' ? 'Matemática' : 'Português'}</Badge>
                                  <Badge variant="outline">{ex.difficulty}</Badge>
                                   <Badge variant={
                                        (ex.questionType || 'multiple_choice') === 'fill_in_the_blank' ? 'default'
                                        : (ex.questionType === 'organize_syllables' ? 'success' : 'secondary')
                                    }>
                                        {(ex.questionType === 'fill_in_the_blank') ? 'Completar' 
                                        : (ex.questionType === 'organize_syllables' ? 'Organizar' : 'M. Escolha')}
                                    </Badge>
                              </div>
                          </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum exercício encontrado. Crie alguns no Banco de Exercícios.
                    </div>
                  )}
              </div>
              <DialogFooter>
                  <Button onClick={() => setIsBankOpen(false)}>
                    Adicionar {selectedExercises.length > 0 ? `(${selectedExercises.length})` : ''} Exercícios
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingTask} onOpenChange={open => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Tarefa?</AlertDialogTitle><AlertDialogDescription>Esta ação é permanente. A tarefa será removida para o professor e para o aluno.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
     </> 
  );
}

function TaskReportDialog({ task, isOpen, onOpenChange }: { task: Task | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const formatTime = (seconds: number | undefined) => {
    if (seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatMs = (ms: number | undefined) => {
    if (ms === undefined) return 'N/A';
    return `${(ms / 1000).toFixed(1)}s`;
  }
  
  const questions = task?.questions || [];
  const correctAnswers = questions.filter(q => q.status === 'correct').length;
  const totalQuestions = questions.length;
  const accuracyPercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const handleGeneratePdf = async () => {
    if (!task) return;
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;
      
      const addPageNumbers = () => {
        const pageCount = pdf.internal.pages.length - 1;
        for(let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(9);
            pdf.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }
      };

      // Header Programmatic
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text(task.title, pageWidth / 2, y, { align: 'center' });
      y += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.text(`Relatório de Desempenho`, pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Summary Table Programmatic
      (pdf as any).autoTable({
          startY: y,
          theme: 'grid',
          head: [['Aluno', 'Professor', 'Status', 'Data', 'Tempo', 'Pontuação']],
          body: [[
              task.studentName || 'N/A',
              task.teacherName || 'N/A',
              task.isCompleted ? 'Concluída' : 'Pendente',
              task.completedAt ? format(new Date(task.completedAt), 'dd/MM/yy HH:mm', { locale: ptBR }) : 'N/A',
              formatTime(task.totalTime),
              `${accuracyPercentage}% (${correctAnswers}/${totalQuestions})`
          ]],
          styles: { fontSize: 10 },
          headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50] }
      });
      y = (pdf as any).lastAutoTable.finalY + 15;
      
      // Image-based table for questions
      const tableElement = document.getElementById('task-report-table');
      if (!tableElement) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível encontrar a tabela de detalhes.' });
        setIsGeneratingPdf(false);
        return;
      }
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detalhes das Questões', margin, y);
      y += 8;

      // Temporarily apply print styles for canvas rendering
      tableElement.classList.add('pdf-export-styles');

      const canvas = await html2canvas(tableElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
      });
      
      // Remove styles after capture
      tableElement.classList.remove('pdf-export-styles');

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (y + imgHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
      }

      pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);

      addPageNumbers();
      pdf.save(`relatorio_${task.studentName?.replace(/\s/g, '_')}_${task.title.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: 'destructive', title: 'Erro ao Gerar PDF', description: 'Ocorreu um problema ao criar o arquivo.' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
          <DialogDescription>Relatório de desempenho para {task.studentName || 'aluno desconhecido'}.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-4 my-4 border-y text-center">
            <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground justify-center flex items-center gap-1">Status</dt>
                <dd><Badge variant={task.isCompleted ? 'success' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge></dd>
            </div>
            <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Calendar className="w-4 h-4"/> Conclusão</dt>
                <dd className="font-semibold">{task.completedAt ? format(new Date(task.completedAt), 'dd/MM/yy HH:mm', {locale: ptBR}) : 'N/A'}</dd>
            </div>
            <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Clock className="w-4 h-4"/> Tempo Total</dt>
                <dd className="font-semibold">{formatTime(task.totalTime)}</dd>
            </div>
             <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Target className="w-4 h-4"/> Precisão</dt>
                <dd className="font-semibold">{correctAnswers} de {totalQuestions}</dd>
            </div>
             <div className="flex flex-col items-center gap-1">
                <dt className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-1"><Award className="w-4 h-4"/> Pontuação</dt>
                <dd className="font-bold text-lg text-primary">{accuracyPercentage}%</dd>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          <Table id="task-report-table">
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Pergunta</TableHead>
                      <TableHead>Resposta do Aluno</TableHead>
                      <TableHead>Resposta Correta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Tempo</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {questions.map((q, index) => (
                      <TableRow key={index} className={q.status === 'incorrect' ? 'bg-destructive/10' : ''}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium max-w-xs truncate">{q.text}{q.text2 ? ` ${q.text2}` : ''}</TableCell>
                          <TableCell>{q.studentAnswer || '-'}</TableCell>
                          <TableCell>{q.answer}</TableCell>
                          <TableCell>
                              {q.status === 'correct' && <Check className="w-5 h-5 text-success" />}
                              {q.status === 'incorrect' && <X className="w-5 h-5 text-destructive" />}
                              {(q.status === 'unanswered' || !q.status) && <Circle className="w-5 h-5 text-muted-foreground"/>}
                          </TableCell>
                          <TableCell>{q.attempts || '-'}</TableCell>
                          <TableCell>{formatMs(q.timeTaken)}</TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
        </div>
        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
          <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
              Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function StudentGeneralReportDialog({ studentName, tasks, isOpen, onOpenChange, teacherName }: { studentName: string; tasks: Task[]; isOpen: boolean; onOpenChange: (open: boolean) => void; teacherName?: string }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const stats = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { averageScore: 0, completedTasks: 0, totalTasks: 0, totalTime: 0 };
    }
    const completed = tasks.filter(t => t.isCompleted);
    const scores = completed.map(t => {
      const correct = t.questions.filter(q => q.status === 'correct').length;
      return t.questions.length > 0 ? (correct / t.questions.length) * 100 : 0;
    });
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const totalTime = completed.reduce((sum, task) => sum + (task.totalTime || 0), 0);

    return {
      averageScore,
      completedTasks: completed.length,
      totalTasks: tasks.length,
      totalTime: totalTime,
    };
  }, [tasks]);
  
  const formatTime = (seconds: number | undefined) => {
    if (seconds === undefined) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hours > 0 ? `${hours}h` : '', mins > 0 ? `${mins}m` : '', `${secs}s`].filter(Boolean).join(' ');
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;
        
        const addPageNumbers = () => {
            const pageCount = pdf.internal.pages.length - 1;
            for(let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(9);
                pdf.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
        };

        // Header
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.text('Relatório Geral de Desempenho', pageWidth / 2, y, { align: 'center' });
        y += 8;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.text(studentName, pageWidth / 2, y, { align: 'center' });
        y += 12;

        // Summary
        (pdf as any).autoTable({
            startY: y,
            theme: 'grid',
            body: [
                [{content: 'Resumo Geral', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240,240,240] }}],
                ['Professor', teacherName || 'N/A', 'Data do Relatório', format(new Date(), 'dd/MM/yyyy')],
                ['Tarefas Concluídas', `${stats.completedTasks} de ${stats.totalTasks}`, 'Tempo Total de Estudo', formatTime(stats.totalTime)],
                [{content: `Pontuação Média (em tarefas concluídas): ${stats.averageScore}%`, colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' }}]
            ],
            styles: { fontSize: 10 },
        });
        y = (pdf as any).lastAutoTable.finalY + 15;


        // Tasks Table
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Resumo das Tarefas', margin, y);
        y += 8;

        (pdf as any).autoTable({
            startY: y,
            theme: 'striped',
            head: [['Tarefa', 'Status', 'Data de Conclusão', 'Pontuação']],
            body: tasks.map(task => {
                const correct = task.isCompleted ? task.questions.filter(q => q.status === 'correct').length : 0;
                const total = task.questions.length;
                const score = total > 0 ? Math.round((correct / total) * 100) : 0;
                return [
                    task.title,
                    task.isCompleted ? 'Concluída' : 'Pendente',
                    task.completedAt ? format(new Date(task.completedAt), 'dd/MM/yyyy') : 'N/A',
                    task.isCompleted ? `${score}%` : 'N/A'
                ];
            }),
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [60, 60, 60] }
        });

        addPageNumbers();
        pdf.save(`relatorio_geral_${studentName.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({ variant: 'destructive', title: 'Erro ao Gerar PDF' });
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">Relatório Geral de Desempenho</DialogTitle>
          <DialogDescription>
            Resumo de todas as atividades de <span className="font-semibold">{studentName}</span>.
            {teacherName && ` (Professor: ${teacherName})`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4 my-4 border-y text-center">
          <div className="flex flex-col items-center gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Tarefas Concluídas</dt>
            <dd className="text-2xl font-bold">{stats.completedTasks} / {stats.totalTasks}</dd>
          </div>
          <div className="flex flex-col items-center gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Pontuação Média</dt>
            <dd className="text-2xl font-bold text-primary">{stats.averageScore}%</dd>
          </div>
          <div className="flex flex-col items-center gap-1">
            <dt className="text-sm font-medium text-muted-foreground">Data do Relatório</dt>
            <dd className="text-xl font-bold">{format(new Date(), 'dd/MM/yyyy')}</dd>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Detalhes das Tarefas</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Conclusão</TableHead>
                  <TableHead>Pontuação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(task => {
                  const correct = task.isCompleted ? task.questions.filter(q => q.status === 'correct').length : 0;
                  const total = task.questions.length;
                  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell><Badge variant={task.isCompleted ? 'success' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge></TableCell>
                      <TableCell>{task.completedAt ? format(new Date(task.completedAt), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                      <TableCell className="font-semibold">{task.isCompleted ? `${score}%` : 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </div>

        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
          <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
            Baixar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function TasksByStudentView({ teacherId }: { teacherId: string }) {
  const firestore = useFirestore();
  const tasksQuery = useMemoFirebase(
    () => collection(firestore, 'teachers', teacherId, 'tasks'),
    [firestore, teacherId]
  );
  const { data: tasks, isLoading } = useCollection<Task>(tasksQuery);
  const [viewingReport, setViewingReport] = useState<Task | null>(null);
  const [viewingGeneralReportFor, setViewingGeneralReportFor] = useState<{name: string, tasks: Task[], teacherName?: string} | null>(null);

  const tasksByStudent = useMemo(() => {
    if (!tasks) {
      return {};
    }
  
    const tasksCopy = JSON.parse(JSON.stringify(tasks));
  
    const grouped = tasksCopy.reduce((acc: Record<string, Task[]>, task: Task) => {
      const studentIdentifier = task.studentName || task.studentId;
      if (!acc[studentIdentifier]) {
        acc[studentIdentifier] = [];
      }
      acc[studentIdentifier].push(task);
      return acc;
    }, {});
  
    for (const studentIdentifier in grouped) {
      grouped[studentIdentifier].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
    }
  
    return grouped;
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral por Aluno</CardTitle>
        <CardDescription>Veja todas as tarefas que você atribuiu, agrupadas por aluno.</CardDescription>
      </CardHeader>
      <CardContent>
        {Object.keys(tasksByStudent).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhuma tarefa atribuída encontrada.</div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(tasksByStudent).map(([studentName, studentTasks]) => (
              <AccordionItem value={studentName} key={studentName}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    {studentName} 
                    <Badge variant="outline">{studentTasks.length} tarefas</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-end pb-2 -mt-2">
                      <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => setViewingGeneralReportFor({ 
                              name: studentName, 
                              tasks: studentTasks,
                              teacherName: studentTasks[0]?.teacherName
                          })}>
                          <Download className="mr-2 h-4 w-4"/>
                          Gerar Relatório Geral
                      </Button>
                  </div>
                  <ul className="space-y-3 pt-2">
                    {studentTasks.map(task => (
                       <li key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg bg-background/50 gap-4">
                           <div className="grid gap-1.5 flex-1">
                               <p className={`font-semibold ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                 {task.title}
                               </p>
                               <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mt-1">
                                   <Badge variant={task.isCompleted ? 'success' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge>
                                   <span>
                                    Data de Entrega: {format(new Date(task.dueDate), "dd/MM/yyyy")}
                                   </span>
                                   <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3"/> {task.questions?.length || 0} questões
                                   </span>
                               </div>
                           </div>
                           <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <Button variant="outline" size="sm" onClick={() => setViewingReport(task)}>
                                  <Eye className="mr-2 h-3 w-3"/> Ver Relatório
                              </Button>
                           </div>
                        </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
    <TaskReportDialog task={viewingReport} isOpen={!!viewingReport} onOpenChange={() => setViewingReport(null)} />
    {viewingGeneralReportFor && (
        <StudentGeneralReportDialog 
            studentName={viewingGeneralReportFor.name}
            tasks={viewingGeneralReportFor.tasks}
            teacherName={viewingGeneralReportFor.teacherName}
            isOpen={!!viewingGeneralReportFor} 
            onOpenChange={() => setViewingGeneralReportFor(null)} 
        />
    )}
    </>
  );
}


export default function TeacherTaskView({ teacherId }: { teacherId: string }) {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-4xl font-bold font-headline">Área do Professor</h1>
        <p className="text-muted-foreground">Crie e gerencie os exercícios e tarefas dos seus alunos.</p>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Gerenciar Tarefas</TabsTrigger>
          <TabsTrigger value="exercises">Banco de Exercícios</TabsTrigger>
          <TabsTrigger value="by-student">Tarefas por Aluno</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-6">
          <TaskManager teacherId={teacherId} />
        </TabsContent>
        <TabsContent value="exercises" className="mt-6">
          <ExerciseBank teacherId={teacherId} />
        </TabsContent>
        <TabsContent value="by-student" className="mt-6">
          <TasksByStudentView teacherId={teacherId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
