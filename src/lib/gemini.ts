import { GeminiExtractionResult, BillCategoryCode } from '../types';

const STORAGE_KEY = 'housesplits_gemini_key';

export function getStoredGeminiKey(): string {
  return localStorage.getItem(STORAGE_KEY) || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
}

export function setStoredGeminiKey(key: string): void {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Converts a browser File object to a base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Prompt instruction for Gemini multi-modal OCR
 */
const SYSTEM_PROMPT = `You are a financial document analyzer specialized in residential utility bills, rent receipts, and household invoices.
Analyze the provided document (bill image or PDF) and extract the invoice details.

Strictly output a single JSON object with these keys:
{
  "providerName": "Name of the utility provider, landlord, or service (e.g. EDP Comercial, Vodafone, Iberdrola, Landlord)",
  "categorySuggestion": "One of: 'rent', 'electricity', 'water', 'internet', 'gas', 'other'",
  "invoiceNumber": "Invoice or reference number, or null if not found",
  "totalAmount": 0.00 (Exact decimal number for final total amount due/payable. Do not include currency symbols),
  "currency": "EUR" (or USD, GBP, etc.),
  "issueDate": "YYYY-MM-DD" or null,
  "dueDate": "YYYY-MM-DD" (Payment deadline date. If absent, estimate 14 days from issueDate or today),
  "periodStart": "YYYY-MM-DD" or null,
  "periodEnd": "YYYY-MM-DD" or null,
  "confidenceScore": 0.95 (number between 0 and 1),
  "notes": "Short helpful note on meter reading or period summary"
}
Output valid JSON only. No markdown formatting, no backticks.`;

/**
 * Scan a bill using Google Gemini API
 */
export async function scanBillWithGemini(file: File): Promise<GeminiExtractionResult> {
  const apiKey = getStoredGeminiKey();

  // If no API key is provided, return an intelligent realistic simulation for testing
  if (!apiKey) {
    return generateDemoExtraction(file.name);
  }

  const base64Data = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SYSTEM_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status} from ${model}`);
      }

      const data = await response.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsed = JSON.parse(textOutput) as GeminiExtractionResult;
      // Sanitize fields
      return {
        providerName: parsed.providerName || 'Utility Provider',
        categorySuggestion: sanitizeCategory(parsed.categorySuggestion),
        invoiceNumber: parsed.invoiceNumber || undefined,
        totalAmount: Number(parsed.totalAmount) || 0,
        currency: parsed.currency || 'EUR',
        issueDate: parsed.issueDate || undefined,
        dueDate: parsed.dueDate || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        periodStart: parsed.periodStart || undefined,
        periodEnd: parsed.periodEnd || undefined,
        confidenceScore: parsed.confidenceScore || 0.9,
        notes: parsed.notes || undefined,
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`Failed with model ${model}, trying next...`, err);
    }
  }

  throw new Error(`Gemini Scan Failed: ${lastError?.message || 'Unknown error'}`);
}

function sanitizeCategory(cat: string): BillCategoryCode {
  const valid: BillCategoryCode[] = ['rent', 'electricity', 'water', 'internet', 'gas', 'other'];
  const lower = (cat || '').toLowerCase().trim();
  if (valid.includes(lower as BillCategoryCode)) {
    return lower as BillCategoryCode;
  }
  if (lower.includes('power') || lower.includes('electric') || lower.includes('luz')) return 'electricity';
  if (lower.includes('water') || lower.includes('agua')) return 'water';
  if (lower.includes('net') || lower.includes('wifi') || lower.includes('telecom')) return 'internet';
  if (lower.includes('rent') || lower.includes('aluguel') || lower.includes('lease')) return 'rent';
  if (lower.includes('gas')) return 'gas';
  return 'other';
}

/**
 * Intelligent demo extraction generator when running without an API key
 */
export function generateDemoExtraction(filename: string): Promise<GeminiExtractionResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = filename.toLowerCase();
      let category: BillCategoryCode = 'electricity';
      let provider = 'EDP Electricity';
      let amount = 114.50;

      if (lower.includes('water') || lower.includes('agua')) {
        category = 'water';
        provider = 'City Water Supply';
        amount = 48.20;
      } else if (lower.includes('net') || lower.includes('wifi') || lower.includes('vodafone')) {
        category = 'internet';
        provider = 'Vodafone Fiber 1Gbps';
        amount = 39.99;
      } else if (lower.includes('rent') || lower.includes('house')) {
        category = 'rent';
        provider = 'Landlord Monthly Rent';
        amount = 1450.00;
      }

      const today = new Date();
      const dueDate = new Date(today.getTime() + 12 * 86400000).toISOString().split('T')[0];
      const issueDate = today.toISOString().split('T')[0];

      resolve({
        providerName: provider,
        categorySuggestion: category,
        invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        totalAmount: amount,
        currency: 'EUR',
        issueDate,
        dueDate,
        confidenceScore: 0.98,
        notes: 'Simulated AI scan (add your Gemini key in Settings for real documents)',
      });
    }, 1200);
  });
}
