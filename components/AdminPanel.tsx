import React, { useState, useEffect } from 'react';
import { AccessCode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Trash2, Copy, Power, Plus, ShieldCheck } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [duration, setDuration] = useState(30);
  const [note, setNote] = useState('');

  // Load codes on mount
  useEffect(() => {
    const savedCodes = localStorage.getItem('vintec_codes');
    if (savedCodes) {
      setCodes(JSON.parse(savedCodes));
    }
  }, []);

  // Save codes when updated
  useEffect(() => {
    localStorage.setItem('vintec_codes', JSON.stringify(codes));
  }, [codes]);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    result += '-';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const handleCreate = () => {
    const newCode: AccessCode = {
      code: generateRandomCode(),
      createdAt: Date.now(),
      durationDays: duration,
      expiresAt: Date.now() + (duration * 24 * 60 * 60 * 1000),
      isActive: true,
      note: note
    };
    setCodes([newCode, ...codes]);
    setNote('');
    alert(t('generated_success') + `: ${newCode.code}`);
  };

  const handleDelete = (codeToDelete: string) => {
    if (window.confirm('Are you sure you want to delete this code?')) {
      setCodes(codes.filter(c => c.code !== codeToDelete));
    }
  };

  const toggleStatus = (codeToToggle: string) => {
    setCodes(codes.map(c => 
      c.code === codeToToggle ? { ...c, isActive: !c.isActive } : c
    ));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary w-8 h-8" />
            <h2 className="text-2xl font-bold text-white">{t('admin_title')}</h2>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          
          {/* Create Section */}
          <div className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Plus size={18} /> {t('generate_new')}
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-500 mb-1">{t('duration_days')}</label>
                <input 
                  type="number" 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-500 mb-1">{t('note_optional')}</label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Client X Project"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <button 
                onClick={handleCreate}
                className="w-full md:w-auto px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {t('create_code')}
              </button>
            </div>
          </div>

          {/* List Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {t('code_list')}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-slate-900/80">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('expires')}</th>
                    <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {codes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                        {t('no_codes')}
                      </td>
                    </tr>
                  ) : (
                    codes.map((item) => {
                      const isExpired = Date.now() > item.expiresAt;
                      return (
                        <tr key={item.code} className="bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-primary">{item.code}</td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{item.note || '-'}</td>
                          <td className="p-4">
                            <span className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${!item.isActive 
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
                                : isExpired 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}
                            `}>
                              {!item.isActive ? t('inactive') : isExpired ? t('expired') : t('active')}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(item.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 flex justify-end gap-2">
                             <button 
                                onClick={() => copyToClipboard(item.code)}
                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                title={t('copy')}
                             >
                                <Copy size={16} />
                             </button>
                             <button 
                                onClick={() => toggleStatus(item.code)}
                                className={`p-2 rounded-lg ${item.isActive ? 'text-green-500 hover:text-orange-500 hover:bg-orange-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                                title={item.isActive ? 'Disable' : 'Enable'}
                             >
                                <Power size={16} />
                             </button>
                             <button 
                                onClick={() => handleDelete(item.code)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                title={t('delete')}
                             >
                                <Trash2 size={16} />
                             </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};