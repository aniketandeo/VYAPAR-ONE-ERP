import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LogIn,
  Key,
  ShieldCheck,
  X,
  Lock,
  User,
  AlertCircle,
  Building2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, loginWithGoogle, allUsers, firebaseUser } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const success = login(username, password);
    if (success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg('Invalid username or password. Please check your credentials.');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      setIsGoogleLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
    }
  };

  const handleQuickFill = (user: string, pass: string = 'password123') => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg(null);
    const success = login(user, pass);
    if (success) {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center font-black text-sm text-indigo-300">
              YO
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                VYAPAR ONE ERP Portal
              </h3>
              <p className="text-xs text-indigo-200">
                Authorized Staff & Management Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Option 1: Google Cloud Login (Admin) */}
          <div className="space-y-2">
            <label className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
              1. Direct Google Cloud Login (Owner / Admin)
            </label>
            <button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-2.5 shadow-2xs transition-all active:scale-98"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Signing in with Google...' : 'Sign in with Google (Admin)'}</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center">
              Configured Administrator: <span className="font-semibold text-slate-700">aniket.andeo35@gmail.com</span>
            </p>
          </div>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400 absolute">
              OR STAFF CREDENTIALS
            </span>
          </div>

          {/* Option 2: Employee Username / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Username:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or accounts"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password:
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Login to ERP Software</span>
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="flex items-center gap-1 text-indigo-700">
                <Sparkles className="w-3.5 h-3.5" />
                Quick 1-Click Role Login:
              </span>
              <span className="text-[10px] text-slate-400">Pass: password123</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold shadow-2xs hover:border-indigo-300 transition-colors"
              >
                👑 Managing Director (admin)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('accounts')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold shadow-2xs hover:border-indigo-300 transition-colors"
              >
                💼 Accounts (accounts)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('sitemanager')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold shadow-2xs hover:border-indigo-300 transition-colors"
              >
                🏗️ Site Manager (sitemanager)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('operator')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-800 rounded-lg text-[10px] font-bold shadow-2xs hover:border-indigo-300 transition-colors"
              >
                📝 Data Entry (operator)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Google Cloud Firebase Protected</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
