# 🏠 HouseSplits

A modern, responsive, mobile-first Web Application (PWA) designed for roommates sharing a house and utility bills.

HouseSplits uses **Google Gemini 2.5 Flash** multi-modal AI to scan utility bills and invoices (electricity, water, internet, gas, rent), extracts amounts, dates, and providers, and distributes the expenses using configurable split rules (e.g. 50/25/25 for Rent, 33.34/33.33/33.33 for Utilities).

---

## ✨ Features

- **⚡ Google Gemini AI Bill Scanning:**
  - Drag-and-drop or snap a picture of any utility bill (PDF, JPG, PNG).
  - Automatically extracts: Provider name, Invoice #, Total amount, Issue date, and Due date.
  - Interactive Review Modal to verify or tweak values before committing.
- **⚖️ Custom Split Rules Engine:**
  - Default percentage rules per category (e.g., Rent: 50% Admin, 25% Roommate A, 25% Roommate B; Utilities: 33.33% each).
  - Exact-cent remainder attribution ensuring the sum of all roommate shares always matches the total invoice down to the cent.
  - Live per-bill overrides.
- **💳 Centralized House Admin Settlement:**
  - The House Admin pays the utility companies and landlord directly.
  - Roommates view their exact outstanding share and pay the Admin via displayed bank transfer info (IBAN, Revolut, Bizum).
  - Roommates can mark their shares as "Paid to Admin", and the Admin can "Confirm Receipt" with one click.
- **🔔 Discord / Chat Webhooks:**
  - Automatically alerts the shared household chat when a new bill is ingested or when a payment is marked.
- **📱 Mobile-First PWA:**
  - Fully responsive with desktop navigation, mobile bottom action bar, and floating action button.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the local development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Configuration (Optional)

1. **Google Gemini API Key:**
   - In the app, click the **Settings** gear icon in the top right.
   - Enter your Gemini API key (from [Google AI Studio](https://aistudio.google.com/app/apikey)).
   - Alternatively, add it to `.env`:
     ```env
     VITE_GEMINI_API_KEY=your_gemini_api_key_here
     ```
   *(Note: Without an API key, the app runs in demo simulation mode with sample extraction).*

2. **Supabase Database (Production):**
   - Run the SQL script found in `supabase/schema.sql` in your Supabase project's SQL editor.
   - Add your Supabase credentials to `.env`:
     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your_anon_key_here
     ```

3. **Discord / Telegram Webhook:**
   - In Settings, paste your Discord Channel Webhook URL to receive automated alerts when bills are uploaded or paid.
