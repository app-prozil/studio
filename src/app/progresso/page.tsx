'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

const chartData = [
  { month: 'Jan', matematica: 85, portugues: 78 },
  { month: 'Fev', matematica: 88, portugues: 82 },
  { month: 'Mar', matematica: 90, portugues: 85 },
  { month: 'Abr', matematica: 92, portugues: 90 },
  { month: 'Mai', matematica: 95, portugues: 93 },
  { month: 'Jun', matematica: 93, portugues: 91 },
];

const chartConfig = {
  matematica: {
    label: 'Matemática',
    color: 'hsl(var(--accent))',
  },
  portugues: {
    label: 'Português',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold font-headline">Seu Progresso</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Pontuação Média</CardTitle>
                <CardDescription>Sua pontuação média nas últimas atividades.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-center p-6 text-6xl font-bold">
                91<span className="text-2xl font-normal text-muted-foreground">%</span>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Atividades Concluídas</CardTitle>
                <CardDescription>Total de atividades que você completou este mês.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline justify-center p-6 text-6xl font-bold">
                23
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho ao Longo do Tempo</CardTitle>
          <CardDescription>Janeiro - Junho 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  stroke="hsl(var(--foreground))"
                />
                <YAxis stroke="hsl(var(--foreground))" />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="matematica" fill="var(--color-matematica)" radius={4} />
                <Bar dataKey="portugues" fill="var(--color-portugues)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
