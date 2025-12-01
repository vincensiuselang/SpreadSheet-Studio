import React, { useState, useEffect } from 'react';
import { WidgetConfig, WidgetType } from '../types';
import { X, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface EditWidgetModalProps {
  widget: WidgetConfig;
  columns: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedWidget: WidgetConfig) => void;
  title?: string;
}

export const EditWidgetModal: React.FC<EditWidgetModalProps> = ({
  widget,
  columns,
  isOpen,
  onClose,
  onSave,
  title
}) => {
  const [editedWidget, setEditedWidget] = useState<WidgetConfig>(widget);
  const { t } = useLanguage();

  useEffect(() => {
    setEditedWidget(widget);
  }, [widget]);

  if (!isOpen) return null;

  const handleChange = (field: keyof WidgetConfig, value: any) => {
    setEditedWidget((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {title || t('modal_edit_title')}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('label_title')}</label>
            <input
              type="text"
              value={editedWidget.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
              placeholder="e.g. Sales by Region"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('label_type')}</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t('type_bar'), value: WidgetType.BAR },
                { label: t('type_line'), value: WidgetType.LINE },
                { label: t('type_pie'), value: WidgetType.PIE },
                { label: t('type_stat'), value: WidgetType.STAT },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleChange('type', type.value)}
                  className={`
                    py-2.5 px-4 rounded-xl text-sm font-medium border transition-all
                    ${editedWidget.type === type.value 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'}
                  `}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data Key (X-Axis/Category) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {editedWidget.type === WidgetType.STAT ? t('label_group') : t('label_datakey')}
            </label>
            <select
              value={editedWidget.dataKey}
              onChange={(e) => handleChange('dataKey', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none text-sm"
            >
              {columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Value Key (Y-Axis/Value) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t('label_valuekey')}
            </label>
            <select
              value={editedWidget.valueKey || ''}
              onChange={(e) => handleChange('valueKey', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none text-sm"
            >
               <option value="">{t('label_none_count')}</option>
              {columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500">{t('help_valuekey')}</p>
          </div>

          {/* Aggregation */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t('label_aggregation')}</label>
            <select
              value={editedWidget.aggregation || 'count'}
              onChange={(e) => handleChange('aggregation', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none text-sm"
            >
              <option value="count">{t('agg_count')}</option>
              <option value="sum">{t('agg_sum')}</option>
              <option value="avg">{t('agg_avg')}</option>
              <option value="max">{t('agg_max')}</option>
              <option value="min">{t('agg_min')}</option>
            </select>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-slate-800/30 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            {t('btn_cancel')}
          </button>
          <button
            onClick={() => onSave(editedWidget)}
            className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 transition-all transform active:scale-95 flex items-center gap-2"
          >
            <Check size={16} />
            {t('btn_save')}
          </button>
        </div>
      </div>
    </div>
  );
};
