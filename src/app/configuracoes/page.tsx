'use client';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Moon, Sun, Monitor, TestTube } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState('16px');

  useEffect(() => {
    const savedFontSize = localStorage.getItem('app-font-size') || '16px';
    setFontSize(savedFontSize);
    document.documentElement.style.fontSize = savedFontSize;
  }, []);
  
  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem('app-font-size', size);
    document.documentElement.style.fontSize = size;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold font-headline">Configurações</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>Personalize a aparência do aplicativo para suas necessidades.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-lg">Esquema de Cores</Label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="h-20 flex flex-col gap-2 text-lg">
                <Sun className="w-8 h-8"/>
                Claro
              </Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="h-20 flex flex-col gap-2 text-lg">
                <Moon className="w-8 h-8"/>
                Escuro
              </Button>
              <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')} className="h-20 flex flex-col gap-2 text-lg">
                <Monitor className="w-8 h-8"/>
                Sistema
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="font-size" className="text-lg">Tamanho da Fonte</Label>
            <RadioGroup
              value={fontSize}
              onValueChange={handleFontSizeChange}
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="14px" id="sm" />
                <Label htmlFor="sm" className="text-lg">Pequeno</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="16px" id="md" />
                <Label htmlFor="md" className="text-lg">Médio</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="18px" id="lg" />
                <Label htmlFor="lg" className="text-lg">Grande</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="20px" id="xl" />
                <Label htmlFor="xl" className="text-lg">Extra Grande</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testar Funcionalidades</CardTitle>
          <CardDescription>Use esta tarefa de demonstração para testar as novas animações e efeitos do jogo interativo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/matematica?taskId=test-drive&studentId=test-user">
              <TestTube className="mr-2" />
              Testar Animações da Tarefa
            </Link>
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
