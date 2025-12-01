import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Header
    app_title: "SpreadSheet Studio",
    export: "Export",
    theme_toggle: "Toggle Theme",
    admin_panel: "Admin Panel",
    dashboard: "Dashboard",
    logout: "Exit Admin",
    logout_confirm: "Are you sure you want to exit Admin mode? You will return to the limited free version.",
    live_session: "Live Session",
    tabs_active: "tab(s) active",
    
    // Hero / Upload
    hero_title_1: "Visualize Your Data",
    hero_title_2: "Instantly",
    hero_desc: "Upload any CSV or Excel file. Our AI analyzes your data structure and automatically builds a real-time, interactive dashboard for you.",
    upload_processing: "Processing Data...",
    upload_analyzing: "Analyzing structure and generating dashboard...",
    upload_box_title: "Upload Spreadsheet",
    upload_box_desc: "Drag & drop your CSV or Excel file here, or click to browse.",
    
    // Upload Errors
    error_file_type: "Invalid file type. Please upload .CSV or .XLSX files only.",
    error_parsing: "Failed to parse file. The file might be corrupted or in an unsupported format.",
    error_empty: "The uploaded file appears to be empty.",
    error_no_columns: "Could not detect valid columns in the spreadsheet.",
    
    // Dashboard Controls
    rows: "rows",
    add_widget: "Add Widget",
    upload_new: "Upload New",
    edit_widget: "Edit Widget",
    delete_widget: "Delete Widget",
    delete_widget_confirm: "Are you sure you want to delete this widget?",
    undo: "Undo",
    redo: "Redo",
    
    // Export Menu
    export_pdf: "PDF (.pdf)",
    export_xlsx: "Excel (.xlsx)",
    export_csv: "CSV (.csv)",
    export_html: "HTML (.html)",
    export_xml: "XML (.xml)",
    export_sql: "SQL (.sql)",
    export_json: "JSON Config",
    
    // Chart Widget
    of_rows: "of Rows",
    
    // Edit Modal
    modal_add_title: "Add New Widget",
    modal_edit_title: "Edit Widget",
    label_title: "Widget Title",
    label_type: "Chart Type",
    label_datakey: "Category / X-Axis",
    label_group: "Group By (Optional)",
    label_valuekey: "Value Column / Y-Axis",
    label_none_count: "(None - Count Rows)",
    help_valuekey: "Leave empty to count rows instead of summing values.",
    label_aggregation: "Aggregation Method",
    btn_cancel: "Cancel",
    btn_save: "Save Changes",
    
    // Types & Aggregations
    type_bar: "Bar Chart",
    type_line: "Line Chart",
    type_pie: "Pie Chart",
    type_stat: "Statistic",
    agg_count: "Count (Frequency)",
    agg_sum: "Sum (Total)",
    agg_avg: "Average (Mean)",
    agg_max: "Maximum",
    agg_min: "Minimum",

    // Limit Modal
    limit_title: "Usage Limit Reached",
    limit_desc: "You have used the free version 2 times. To continue using SpreadSheet Studio without limits, please upgrade your membership.",
    contact_vintec: "Contact Vintec via WhatsApp",
    admin_access: "Admin / Premium Access",
    enter_code: "Enter Access Code",
    unlock: "Unlock",
    code_invalid: "Invalid or Expired Code",
    unlimited_access: "Unlimited Access Unlocked",

    // Admin Panel
    admin_title: "Access Code Management",
    generate_new: "Generate New Code",
    duration_days: "Duration (Days)",
    note_optional: "Note (Optional)",
    create_code: "Create Code",
    code_list: "Active Codes",
    status: "Status",
    expires: "Expires",
    actions: "Actions",
    active: "Active",
    inactive: "Inactive",
    expired: "Expired",
    delete: "Delete",
    copy: "Copy",
    no_codes: "No codes generated yet.",
    generated_success: "Code Generated Successfully",

    // ChatBot
    chat_title: "AI Data Assistant",
    chat_placeholder: "Ask about your data...",
    chat_welcome: "Hi! I've analyzed your spreadsheet. Ask me anything about the trends, stats, or specific rows!",
    chat_thinking: "Thinking...",
  },
  id: {
    // Header
    app_title: "SpreadSheet Studio",
    export: "Ekspor",
    theme_toggle: "Ubah Tema",
    admin_panel: "Panel Admin",
    dashboard: "Dashboard",
    logout: "Keluar Admin",
    logout_confirm: "Apakah Anda yakin ingin keluar dari mode Admin? Anda akan kembali ke versi gratis terbatas.",
    live_session: "Sesi Langsung",
    tabs_active: "tab aktif",
    
    // Hero / Upload
    hero_title_1: "Visualisasi Data",
    hero_title_2: "Secara Instan",
    hero_desc: "Unggah file CSV atau Excel. AI kami akan menganalisis struktur data Anda dan membuat dashboard interaktif secara otomatis.",
    upload_processing: "Memproses Data...",
    upload_analyzing: "Menganalisis struktur dan membuat dashboard...",
    upload_box_title: "Unggah Spreadsheet",
    upload_box_desc: "Geser & lepas file CSV atau Excel di sini, atau klik untuk menjelajah.",
    
    // Upload Errors
    error_file_type: "Tipe file tidak valid. Harap unggah file .CSV atau .XLSX saja.",
    error_parsing: "Gagal memproses file. File mungkin rusak atau format tidak didukung.",
    error_empty: "File yang diunggah terlihat kosong.",
    error_no_columns: "Tidak dapat mendeteksi kolom yang valid dalam spreadsheet.",
    
    // Dashboard Controls
    rows: "baris",
    add_widget: "Tambah Widget",
    upload_new: "Unggah Baru",
    edit_widget: "Ubah Widget",
    delete_widget: "Hapus Widget",
    delete_widget_confirm: "Apakah Anda yakin ingin menghapus widget ini?",
    undo: "Urungkan",
    redo: "Ulangi",
    
    // Export Menu
    export_pdf: "PDF (.pdf)",
    export_xlsx: "Excel (.xlsx)",
    export_csv: "CSV (.csv)",
    export_html: "HTML (.html)",
    export_xml: "XML (.xml)",
    export_sql: "SQL (.sql)",
    export_json: "Konfigurasi JSON",
    
    // Chart Widget
    of_rows: "dari Baris",
    
    // Edit Modal
    modal_add_title: "Tambah Widget Baru",
    modal_edit_title: "Ubah Widget",
    label_title: "Judul Widget",
    label_type: "Tipe Grafik",
    label_datakey: "Kategori / Sumbu X",
    label_group: "Kelompokkan Berdasarkan (Opsional)",
    label_valuekey: "Kolom Nilai / Sumbu Y",
    label_none_count: "(Kosong - Hitung Baris)",
    help_valuekey: "Biarkan kosong untuk menghitung jumlah baris.",
    label_aggregation: "Metode Agregasi",
    btn_cancel: "Batal",
    btn_save: "Simpan Perubahan",
    
    // Types & Aggregations
    type_bar: "Grafik Batang",
    type_line: "Grafik Garis",
    type_pie: "Grafik Pie",
    type_stat: "Statistik",
    agg_count: "Jumlah (Frekuensi)",
    agg_sum: "Total (Sum)",
    agg_avg: "Rata-rata (Mean)",
    agg_max: "Maksimum",
    agg_min: "Minimum",

    // Limit Modal
    limit_title: "Batas Penggunaan Tercapai",
    limit_desc: "Nih, udah pake versi gratis 2 kali. Kalo mau lanjut pake SpreadSheet Studio tanpa batas, yuk upgrade membershipnya! Gaskeun!",
    contact_vintec: "Hubungi Vintec via WhatsApp",
    admin_access: "Akses Admin / Premium",
    enter_code: "Masukin Kode Akses",
    unlock: "Buka Kunci",
    code_invalid: "Kode Salah atau Udah Expired Nih",
    unlimited_access: "Akses Tanpa Batas Terbuka",

    // Admin Panel
    admin_title: "Manajemen Kode Akses",
    generate_new: "Buat Kode Baru",
    duration_days: "Durasi (Hari)",
    note_optional: "Catatan (Opsional)",
    create_code: "Buat Kode",
    code_list: "Daftar Kode",
    status: "Status",
    expires: "Kedaluwarsa",
    actions: "Aksi",
    active: "Aktif",
    inactive: "Nonaktif",
    expired: "Kedaluwarsa",
    delete: "Hapus",
    copy: "Salin",
    no_codes: "Belum ada kode yang dibuat.",
    generated_success: "Kode Berhasil Dibuat",

    // ChatBot
    chat_title: "Asisten Data AI",
    chat_placeholder: "Tanya tentang data lo...",
    chat_welcome: "Halo! Gue udah analisis spreadsheet lo nih. Tanya apa aja soal tren, statistik, atau baris tertentu! Santuy aja.",
    chat_thinking: "Bentar ya, mikir dulu...",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'id')) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};