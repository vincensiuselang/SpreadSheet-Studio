import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Minimize2, Maximize2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { DataRow, DashboardConfig } from '../types';
import { getChatResponse } from '../services/gemini';

interface ChatBotProps {
  datasetName: string;
  data: DataRow[];
  dashboardConfig: DashboardConfig | null;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export const ChatBot: React.FC<ChatBotProps> = ({ datasetName, data, dashboardConfig }) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: t('chat_welcome'),
      timestamp: Date.now()
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Effect to update welcome message when language changes
  useEffect(() => {
    setMessages(prev => {
      // Only update if the chat consists only of the welcome message (user hasn't started chatting)
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [{
          ...prev[0],
          text: t('chat_welcome')
        }];
      }
      return prev;
    });
  }, [language, t]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await getChatResponse(
        userMsg.text,
        datasetName,
        data,
        dashboardConfig,
        history,
        language // Pass current language
      );

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: language === 'id' ? "Maaf, terjadi kesalahan. Silakan coba lagi." : "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([{
      id: 'welcome',
      role: 'model',
      text: t('chat_welcome'),
      timestamp: Date.now()
    }]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-colors duration-300 flex items-center justify-center
          ${isOpen ? 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300 scale-0 opacity-0 pointer-events-none' : 'bg-primary text-white'}
        `}
      >
        <Bot size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '500px'
            }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-48px)] bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between cursor-pointer" onClick={() => !isMinimized && setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-2 text-white">
                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                  <Bot size={16} />
                </div>
                <h3 className="font-bold text-sm tracking-wide">{t('chat_title')}</h3>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="p-1 hover:bg-white/20 rounded-md transition-colors"
                  title="Reset Chat"
                >
                  <RefreshCw size={14} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                  className="p-1 hover:bg-white/20 rounded-md transition-colors"
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="p-1 hover:bg-white/20 rounded-md transition-colors hover:text-red-200"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content (Hidden if minimized) */}
            {!isMinimized && (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900/50 custom-scrollbar">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`
                          max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                          ${msg.role === 'user' 
                            ? 'bg-primary text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-700'}
                        `}
                      >
                         <p className="whitespace-pre-wrap">{msg.text}</p>
                         <span className={`text-[10px] block mt-1 opacity-70 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                           {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </span>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-gray-700">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={t('chat_placeholder')}
                      className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-slate-900 border-none rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm dark:text-white"
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-[10px] text-gray-400">Powered by Gemini 3.0 Pro</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};