import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Eye, EyeOff, LogOut, Lock } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useLoginMutation, useLogoutMutation } from '../hooks/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SecretKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onLoginSuccess?: (appData?: { id: string; key: string }) => void;
  onLogoutSuccess?: () => void;
}

export const SecretKeyModal: React.FC<SecretKeyModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onLoginSuccess,
  onLogoutSuccess,
}) => {
  const { t } = useI18n();
  const [secretInput, setSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const loading = loginMutation.isPending || logoutMutation.isPending;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretInput.trim()) return;

    setError(null);
    setSuccess(false);

    try {
      const data = await loginMutation.mutateAsync(secretInput.trim());
      if (data.authenticated) {
        setSuccess(true);
        setTimeout(() => {
          onLoginSuccess?.(data.app);
          setSecretInput('');
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || t.modal.invalidSecret);
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await logoutMutation.mutateAsync(undefined as any);
      onLogoutSuccess?.();
      setSecretInput('');
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Lock className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {t.modal.title}
              </DialogTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Sessão Segura com Cookie HttpOnly
                </p>
              </div>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {t.modal.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="secret-input" className="text-xs font-medium text-foreground">
              {t.modal.inputLabel}
            </Label>
            <div className="relative">
              <Input
                id="secret-input"
                type={showSecret ? 'text' : 'password'}
                value={secretInput}
                onChange={(e) => {
                  setSecretInput(e.target.value);
                  setError(null);
                }}
                placeholder={t.modal.inputPlaceholder}
                className="pr-10 font-mono text-sm"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 bg-secondary/50 p-2.5 rounded-lg border border-border/80 flex items-start gap-2">
              <ShieldAlert className="size-3.5 text-primary shrink-0 mt-0.5" />
              <span>{t.modal.savedNote}</span>
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <Alert variant="destructive" className="flex items-start gap-2 p-3 text-xs">
              <ShieldAlert className="size-4 mt-0.5 shrink-0" />
              <AlertDescription className="font-medium text-inherit">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="flex items-center gap-2 p-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              <AlertDescription className="font-medium text-inherit">
                {t.modal.success}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons via DialogFooter */}
          <DialogFooter className="flex flex-row items-center justify-between gap-2 mt-2">
            {isAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={loading}
                className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
              >
                <LogOut className="size-4" />
                <span>{t.modal.disconnect}</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !secretInput.trim()}
              >
                {loading ? t.modal.verifying : t.modal.verifyButton}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
