import React, { useState, useEffect } from 'react';
import { Lock, MessageCircle, ChevronRight, Unlock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LimitModalProps {
  isOpen: boolean;
  onAttemptUnlock: (code: string) => boolean;
  isLimitReached?: boolean;
}

export const LimitModal: React.FC<LimitModalProps> = ({ isOpen, onAttemptUnlock, isLimitReached = true }) => {
  const { t } = useLanguage();
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAdminInput(!isLimitReached);
      setCode('');
      setError(false);
    }
  }, [isOpen, isLimitReached]);

  if (!isOpen) return null;

  const handleUnlock = () => {
    const success = onAttemptUnlock(code);
    if (!success) {
      setError(true);
    } else {
      setError(false);
      setCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        
        {/* Decorative Header */}
        <div className="h-24 bg-gradient-to-r from-red-500 to-pink-600 flex items-center justify-center">
          <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
            <Lock className="text-white w-10 h-10" />
          </div>
        </div>

        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
            {isLimitReached ? t('limit_title') : t('admin_access')}
          </h2>
          
          {isLimitReached ? (
            <>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                {t('limit_desc')}
              </p>

              <a 
                href="https://wa.link/7cz885" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 mb-6"
              >
                <MessageCircle size={20} />
                {t('contact_vintec')}
              </a>
            </>
          ) : (
             <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                {t('enter_code')}
             </p>
          )}

          {!showAdminInput ? (
            <button 
              onClick={() => setShowAdminInput(true)}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              {t('admin_access')} <ChevronRight size={14} />
            </button>
          ) : (
            <div className={`animate-fade-in-up ${isLimitReached ? 'mt-6 pt-6 border-t border-gray-100 dark:border-gray-800' : ''}`}>
              {isLimitReached && (
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-left">
                    {t('admin_access')}
                </label>
              )}
              <div className="flex gap-2">
                <input 
                  type="password"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  placeholder={t('enter_code')}
                  className={`flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm`}
                  autoFocus
                />
                <button 
                  onClick={handleUnlock}
                  className="bg-gray-800 hover:bg-gray-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 rounded-lg transition-colors"
                >
                  <Unlock size={18} />
                </button>
              </div>
              {error && <p className="text-red-500 text-xs mt-2 text-left">{t('code_invalid')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};