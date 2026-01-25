'use client';

import { useEffect } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function PWAInstallPrompt() {
  const { canInstall, isStandalone, triggerInstall } = usePWAInstall();
  const { toast, dismiss } = useToast();
  const toastId = 'pwa-install-toast';

  useEffect(() => {
    const hasBeenShown = sessionStorage.getItem('pwaInstallPromptShown');

    if (canInstall && !isStandalone && !hasBeenShown) {
      sessionStorage.setItem('pwaInstallPromptShown', 'true');
      toast({
        id: toastId,
        duration: 300000, // 5 minutes
        title: "Instale o ProZil em seu dispositivo",
        description: "Tenha acesso rápido e uma experiência otimizada adicionando à sua tela inicial.",
        action: (
          <Button onClick={() => {
            triggerInstall();
            dismiss(toastId);
          }}
          size="lg"
          >
            <Download className="mr-2" /> Instalar
          </Button>
        ),
      });
    }
  }, [canInstall, isStandalone, triggerInstall, toast, dismiss]);

  // This component renders nothing itself, it just triggers a toast.
  return null;
}
