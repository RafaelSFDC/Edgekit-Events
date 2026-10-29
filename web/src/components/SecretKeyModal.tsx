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
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {t.modal.title}
              </DialogTitle>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-[11px] font-semibold text-emerald-400">
                  Sessão Segura com Cookie HttpOnly
                </p>
              </div>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {t.modal.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 mt-2">
          <div className="space-y-1.5">
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
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 bg-secondary/50 p-2.5 rounded-lg border border-border/80 flex items-start space-x-2">
              <span className="text-sky-400 font-bold shrink-0">🛡️</span>
              <span>{t.modal.savedNote}</span>
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <Alert variant="destructive" className="flex items-start space-x-2 p-3 text-xs">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <AlertDescription className="font-medium text-inherit">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="flex items-center space-x-2 p-3 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <AlertDescription className="font-medium text-inherit">
                {t.modal.success}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {isAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={loading}
                className="text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                <span>{t.modal.disconnect}</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
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
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
              >
                {loading ? t.modal.verifying : t.modal.verifyButton}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
