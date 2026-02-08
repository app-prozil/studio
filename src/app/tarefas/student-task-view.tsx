'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import Link from 'next/link';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, FileText, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type PerformanceQuestion = {
  text: string;
  options: string[];
  answer: string;
  studentAnswer?: string;
  attempts?: number;
  status?: 'correct' | 'incorrect' | 'unanswered';
  timeTaken?: number;
};

type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  teacherId: string;
  studentId: string;
  studentProzilId: string;
  studentName?: string;
  teacherName?: string;
  subject: 'matematica' | 'portugues' | 'memoria';
  taskType: 'jogo_interativo' | 'folha_imprimivel';
  isCompleted: boolean;
  completedAt?: string;
  totalTime?: number;
  questions: PerformanceQuestion[];
};

export default function StudentTaskView({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tasksQuery = useMemoFirebase(
    () => (studentId ? collection(firestore, 'students', studentId, 'tasks') : null),
    [firestore, studentId]
  );
  const { data: tasks, isLoading, error } = useCollection<Task>(tasksQuery);
  
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    // Create a copy before sorting to avoid state mutation
    const tasksCopy = [...tasks];
    return tasksCopy.sort((a, b) => {
      // 1. Incomplete tasks come before completed tasks
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // If both are incomplete, sort by due date ASCENDING (earliest due first)
      if (!a.isCompleted) {
        const aDueDate = new Date(a.dueDate).getTime();
        const bDueDate = new Date(b.dueDate).getTime();
        return aDueDate - bDueDate;
      }

      // If both are completed, sort by completion date DESCENDING
      const aCompletedAt = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bCompletedAt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      if (aCompletedAt && bCompletedAt) {
          return bCompletedAt - aCompletedAt;
      }

      // Fallback to due date for completed tasks without completion date
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });
  }, [tasks]);

  const handleTaskCompletion = async (task: Task, isCompleted: boolean) => {
    if (!studentId || !task.teacherId || !task.id) return;

    const { id: taskId, teacherId } = task;

    const studentTaskRef = doc(firestore, 'students', studentId, 'tasks', taskId);
    const teacherTaskRef = doc(firestore, 'teachers', teacherId, 'tasks', taskId);

    try {
      const batch = writeBatch(firestore);
      const updateData = { isCompleted: isCompleted };
      
      batch.update(studentTaskRef, updateData);
      batch.update(teacherTaskRef, updateData);

      await batch.commit();
      toast({ title: `Tarefa ${isCompleted ? 'marcada como concluída' : 'marcada como pendente'}.` });
    } catch (e) {
      console.error("Erro ao atualizar tarefa: ", e);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status da tarefa.' });
    }
  };

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-4xl font-bold font-headline">Minhas Tarefas</h1>
        <p className="text-muted-foreground">Aqui estão as atividades que seu professor enviou.</p>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Lista de Atividades</CardTitle>
            <CardDescription>Acesse suas atividades ou marque-as como concluídas.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading && <p>Carregando suas tarefas...</p>}
            {error && <p className="text-destructive">Ocorreu um erro ao buscar suas tarefas.</p>}
            {tasks && sortedTasks.length > 0 ? (
                 <ul className="space-y-4">
                    {sortedTasks.map(task => {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const isExpired = !task.isCompleted && new Date(task.dueDate) < today;

                        return (
                        <li key={task.id} className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4", isExpired ? "bg-destructive/5 border-destructive/20" : "bg-card")}>
                           <div className="grid gap-1.5 flex-1">
                               <p className={`font-bold text-lg ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                 {task.title}
                               </p>
                               <p className="text-muted-foreground text-sm">{task.description}</p>
                               <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mt-2">
                                   {task.teacherName && (
                                     <span className="flex items-center gap-1"><User className="w-3 h-3"/> {task.teacherName}</span>
                                   )}
                                   {task.createdAt && (
                                     <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> Enviada em {format(new Date(task.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                                   )}
                                   <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3"/> {task.subject === 'matematica' ? 'Matemática' : task.subject === 'portugues' ? 'Português' : 'Memória'}
                                   </span>
                                   <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3"/> {task.questions?.length || 0} questões
                                   </span>
                               </div>
                           </div>
                           <div className="flex flex-col items-end justify-between gap-2 self-stretch shrink-0">
                             <div className="text-right">
                                <div className="flex justify-end gap-2">
                                    {isExpired && <Badge variant="destructive">VENCIDA</Badge>}
                                    <Badge variant={task.isCompleted ? 'secondary' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge>
                                </div>
                                <p className={cn("text-xs mt-1", isExpired ? "text-destructive font-semibold" : "text-muted-foreground")}>
                                    Entrega: {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                             </div>

                            {!task.isCompleted && task.taskType === 'jogo_interativo' && (
                                <Button asChild size="sm">
                                    <Link href={`/${task.subject}?taskId=${task.id}&studentId=${studentId}`}>
                                        {isExpired ? 'Fazer mesmo assim' : 'Iniciar Atividade'} <ArrowRight className="ml-2 h-4 w-4"/>
                                    </Link>
                                </Button>
                            )}

                             {!task.isCompleted && task.taskType === 'folha_imprimivel' && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`task-${task.id}`}
                                        checked={task.isCompleted}
                                        onCheckedChange={(checked) => handleTaskCompletion(task, !!checked)}
                                        className="h-5 w-5"
                                    />
                                    <label htmlFor={`task-${task.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Marcar como concluída
                                    </label>
                                </div>
                             )}

                           </div>
                        </li>
                        )
                    })}
                 </ul>
            ) : (
                !isLoading && <p className="text-center text-muted-foreground py-8">Você não tem nenhuma tarefa pendente. Parabéns!</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
