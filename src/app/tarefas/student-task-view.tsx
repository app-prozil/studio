'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import Link from 'next/link';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, BookOpen, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function StudentTaskView({ studentId }: { studentId: string }) {
  const firestore = useFirestore();
  const tasksQuery = useMemoFirebase(
    () => (studentId ? collection(firestore, 'students', studentId, 'tasks') : null),
    [firestore, studentId]
  );
  const { data: tasks, isLoading, error } = useCollection(tasksQuery);

  const handleTaskCompletion = async (taskId: string, isCompleted: boolean) => {
    if (!studentId) return;
    const taskRef = doc(firestore, 'students', studentId, 'tasks', taskId);
    try {
      await updateDoc(taskRef, { isCompleted: isCompleted });
    } catch (e) {
      console.error("Erro ao atualizar tarefa: ", e);
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
            {tasks && tasks.length > 0 ? (
                 <ul className="space-y-4">
                    {tasks.sort((a,b) => a.isCompleted - b.isCompleted).map(task => (
                        <li key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-card gap-4">
                           <div className="grid gap-1.5 flex-1">
                               <p className={`font-bold text-lg ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                 {task.title}
                               </p>
                               <p className="text-muted-foreground text-sm">{task.description}</p>
                               <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                   <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3"/> {task.subject === 'matematica' ? 'Matemática' : 'Português'}
                                   </span>
                                   <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3"/> {task.questions?.length || 0} questões
                                   </span>
                               </div>
                           </div>
                           <div className="flex flex-col items-end justify-between gap-2 self-stretch shrink-0">
                             <div className="text-right">
                                <Badge variant={task.isCompleted ? 'secondary' : 'default'}>{task.isCompleted ? 'Concluída' : 'Pendente'}</Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Entregar até {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                             </div>

                            {!task.isCompleted && task.taskType === 'jogo_interativo' && (
                                <Button asChild size="sm">
                                    <Link href={`/${task.subject}?taskId=${task.id}&studentId=${studentId}`}>
                                        Iniciar Atividade <ArrowRight className="ml-2 h-4 w-4"/>
                                    </Link>
                                </Button>
                            )}

                             {!task.isCompleted && task.taskType === 'folha_imprimivel' && (
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`task-${task.id}`}
                                        checked={task.isCompleted}
                                        onCheckedChange={(checked) => handleTaskCompletion(task.id, !!checked)}
                                        className="h-5 w-5"
                                    />
                                    <label htmlFor={`task-${task.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Marcar como concluída
                                    </label>
                                </div>
                             )}

                           </div>
                        </li>
                    ))}
                 </ul>
            ) : (
                !isLoading && <p className="text-center text-muted-foreground py-8">Você não tem nenhuma tarefa pendente. Parabéns!</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
