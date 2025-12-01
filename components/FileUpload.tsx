
import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileType, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { sanitizeInput } from '../utils/security';

interface FileUploadProps {
  onDataParsed: (name: string, data: any[]) => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const FileUpload: React.FC<FileUploadProps> = ({ onDataParsed, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const processFile = (file: File) => {
    setError(null);
    
    // 1. Security: Check File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File too large. Maximum limit is ${MAX_FILE_SIZE_MB}MB to ensure browser performance.`);
        return;
    }

    // 2. Validation: File Extension
    const validExtensions = ['xlsx', 'xls', 'csv'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !validExtensions.includes(extension)) {
      setError(t('error_file_type'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (data) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          
          if (!sheetName) {
             setError(t('error_empty'));
             return;
          }

          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          
          if (!jsonData || jsonData.length === 0) {
            setError(t('error_empty'));
            return;
          }

          // 3. Security: Sanitize Data
          // Convert weird keys, handle nulls, and strip XSS from strings
          const sanitizedData = jsonData.map((row: any) => {
            const newRow: any = {};
            Object.keys(row).forEach(key => {
              const cleanKey = sanitizeInput(key.trim());
              if (cleanKey) { // Only keep valid columns
                // Recursively sanitize value
                newRow[cleanKey] = sanitizeInput(row[key]);
              }
            });
            return newRow;
          });

          // Check if we actually have columns
          if (Object.keys(sanitizedData[0] || {}).length === 0) {
             setError(t('error_no_columns'));
             return;
          }

          // Sanitize Filename
          const safeName = file.name.split('.')[0].replace(/[^a-zA-Z0-9 _-]/g, '');
          onDataParsed(safeName, sanitizedData);
        }
      } catch (err) {
        console.error("Parsing error:", err);
        setError(t('error_parsing'));
      }
    };

    reader.onerror = () => {
      setError(t('error_parsing'));
    };

    try {
      reader.readAsBinaryString(file);
    } catch (err) {
      setError(t('error_parsing'));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
    // Reset input value so the same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div 
      className={`
        w-full max-w-2xl mx-auto p-12 border-2 border-dashed rounded-2xl transition-all duration-300
        flex flex-col items-center justify-center text-center cursor-pointer relative
        ${isDragging 
          ? 'border-primary bg-primary/10 scale-105' 
          : error 
             ? 'border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
             : 'border-gray-300 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-dark-card'}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        accept=".csv, .xlsx, .xls" 
        className="hidden" 
        id="file-upload"
        onChange={handleChange}
        disabled={isLoading}
      />
      
      <label htmlFor="file-upload" className="w-full h-full flex flex-col items-center cursor-pointer z-10">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
            <p className="text-xl font-medium text-gray-700 dark:text-gray-200">{t('upload_processing')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('upload_analyzing')}</p>
          </div>
        ) : (
          <>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors ${error ? 'bg-red-100 text-red-500' : 'bg-primary/10 text-primary'}`}>
              {error ? <ShieldAlert className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
            </div>
            
            {error ? (
              <div className="mb-6 animate-pulse">
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                  Validation Failed
                </h3>
                <p className="text-red-500 dark:text-red-300 max-w-sm">
                  {error}
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {t('upload_box_title')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                  {t('upload_box_desc')}
                </p>
                <p className="text-xs text-gray-400 mb-2">Max Size: {MAX_FILE_SIZE_MB}MB (Secure Mode)</p>
              </>
            )}

            <div className="flex gap-3 text-xs text-gray-400 font-medium uppercase tracking-wider">
              <span className="flex items-center gap-1"><FileType size={14} /> .XLSX</span>
              <span className="flex items-center gap-1"><FileType size={14} /> .CSV</span>
            </div>
          </>
        )}
      </label>
    </div>
  );
};
