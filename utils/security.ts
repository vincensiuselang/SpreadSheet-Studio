
/**
 * Security Utility Functions
 * Designed to prevent XSS, CSV Injection, and ensure data integrity.
 */

// Basic HTML entity escaping to prevent XSS in exported HTML
export const escapeHtml = (unsafe: string | number | boolean | null | undefined): string => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// SQL escaping (Basic) - For client-side SQL generation
export const escapeSql = (unsafe: string | number | boolean | null | undefined): string => {
    if (unsafe === null || unsafe === undefined) return 'NULL';
    if (typeof unsafe === 'boolean') return unsafe ? 'TRUE' : 'FALSE';
    if (typeof unsafe === 'number') return String(unsafe);
    // Replace single quote with two single quotes
    return `'${String(unsafe).replace(/'/g, "''")}'`;
};

// Sanitize inputs from Spreadsheets to prevent storing XSS payloads
export const sanitizeInput = (input: any): any => {
    if (typeof input === 'string') {
        // Remove script tags and potentially dangerous attributes
        return input
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/on\w+="[^"]*"/g, "") // remove onEvent handlers
            .replace(/javascript:/gi, "") // remove javascript: protocol
            .trim();
    }
    return input;
};

// Prevent Formula Injection (CSV Injection)
// If a field starts with =, +, -, or @, Excel might execute it.
// We prepend a single quote to force it as text.
export const preventFormulaInjection = (input: any): any => {
    if (typeof input === 'string') {
        const dangerousPrefixes = ['=', '+', '-', '@'];
        if (dangerousPrefixes.some(prefix => input.startsWith(prefix))) {
            return "'" + input;
        }
    }
    return input;
};
