import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, X, Eye, EyeOff, LogOut, Lock } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useLoginMutation, useLogoutMutation } from '../hooks/api';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t.modal.title}
            </h3>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <p className="text-[11px] font-semibold text-emerald-400">
                Sessão Segura com Cookie HttpOnly
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {t.modal.description}
        </p>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              {t.modal.inputLabel}
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretInput}
                onChange={(e) => {
                  setSecretInput(e.target.value);
                  setError(null);
                }}
                placeholder={t.modal.inputPlaceholder}
                className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-500 pr-10 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 bg-secondary/50 p-2.5 rounded-lg border border-border/80 flex items-start space-x-2">
              <span className="text-sky-400 font-bold shrink-0">🛡️</span>
              <span>{t.modal.savedNote}</span>
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="flex items-start space-x-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.modal.success}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.modal.disconnect}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={loading || !secretInput.trim()}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow-sm shadow-sky-500/20"
              >
                {loading ? t.modal.verifying : t.modal.verifyButton}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
