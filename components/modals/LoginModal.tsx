
import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '../Modal';
import { cn } from '../../utils';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(passwordInput)) {
        setPasswordInput('');
        setLoginError('');
        onClose();
    } else {
        setLoginError('密码错误');
    }
  };

  if (!isOpen) return null;

  return (
      <Modal title="管理员登录" onClose={onClose} icon={<Lock className="text-cyan-400"/>}>
          <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
              <div className="text-center">
                  <div className="w-16 h-16 bg-cyan-900/30 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-cyan-500/20">
                      <Lock size={32}/>
                  </div>
                  <h3 className="text-xl font-bold text-white">验证身份</h3>
              </div>
              <div className="space-y-2">
                  <input 
                      type="password" 
                      autoFocus 
                      value={passwordInput} 
                      onChange={(e) => setPasswordInput(e.target.value)} 
                      placeholder="管理员密码" 
                      className={cn("w-full p-4 rounded-xl bg-slate-950 border outline-none transition-all text-center text-lg tracking-widest text-white placeholder:text-slate-600", loginError ? "border-red-500/50 bg-red-900/10" : "border-slate-800 focus:border-cyan-500")}
                  />
                  {loginError && <p className="text-red-400 text-xs text-center font-bold animate-shake">{loginError}</p>}
              </div>
              <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-transform active:scale-95">解锁后台</button>
          </form>
      </Modal>
  );
};
