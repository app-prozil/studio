'use client';

import { useEffect, useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function PWAInstallPrompt() {
  const { canInstall, isStandalone, triggerInstall } = usePWAInstall();
  const { toast, dismiss } = useToast();
  const isMobile = useIsMobile();
  const toastId = 'pwa-install-toast';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isMobile && canInstall && !isStandalone) {
      toast({
        id: toastId,
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
  }, [mounted, canInstall, isStandalone, isMobile, triggerInstall, toast, dismiss]);

  // This component renders nothing itself, it just triggers a toast.
  return null;
}
