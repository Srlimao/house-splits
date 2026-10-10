# HouseSplits - Application Specification

**Version:** 2.0.0  
**Status:** Approved Production Architecture  
**Target Platform:** Mobile-First Responsive Web Application (PWA)  
**Stack:** React 19 + Vite 6 + TypeScript 5.7 + Tailwind CSS 3.4 + Cloudflare Pages Functions (Edge V8) + Cloudflare D1 (Distributed SQLite) + Cloudflare R2 (Object Storage) + Google Gemini 2.5 Flash AI API  

---

## 1. Executive Summary & Vision

**HouseSplits** is a modern, mobile-friendly house-sharing and bill-splitting application designed for roommates sharing a home. It eliminates the friction, forgotten payments, and awkward financial conversations common in shared living.

### Core Value Propositions
- **AI-Powered Bill Ingestion:** Upload or photograph utility bills (electricity, water, internet, gas, garbage) and rent statements (PDF or images). Google Gemini AI automatically extracts the service provider, billing period, issue date, due date, invoice number, and exact monetary amount.
- **Granular Custom Split Rules:** Flexible split rules per category. For instance, Rent is split 50% to the primary tenant and 25% each to a couple; while utilities (electricity, water, internet) are split equally (33.33% each).
- **Single Central Payer Model (Admin-Payer):** The House Admin pays the service providers and landlords directly. The application calculates what each roommate owes the Admin, tracks payment transfers, and manages debt reconciliation.
- **Instant Roommate Transparency:** Each roommate has their own account to view current month totals, outstanding balances, upcoming due dates, and the Admin's bank/payment details (IBAN, Revolut, etc.).
- **Automated Webhook Notifications:** Instant alerts to household chat channels (Discord, Telegram, or WhatsApp) when a new bill is ingested, when splits are generated, and when payments are due.

---

## 2. User Roles & Permission Model

| Feature / Action | House Admin | Roommate (Member) |
|---|:---:|:---:|
| Upload & Scan Bills with Gemini AI | ✅ | ❌ (or optional toggle) |
| Review & Confirm Ingested Bills | ✅ | ❌ |
| Configure Category Split Presets | ✅ | ❌ |
| Override Split % on a Specific Bill | ✅ | ❌ |
| Edit Household Settings & Payment Info (IBAN/Revolut) | ✅ | ❌ |
| Mark Bill as "Paid to Provider" | ✅ | ❌ |
| Confirm Roommate's Payment to Admin | ✅ | ❌ |
| View Own Debt, History & Invoices | ✅ | ✅ |
| Mark Own Share as "Paid to Admin" (Upload Transfer Proof) | ✅ | ✅ |
| Download Original Bill PDFs / Receipts | ✅ | ✅ |
| Receive Chat Webhook / In-App Reminders | ✅ | ✅ |

---

## 3. Core Workflows & Life Cycles

### 3.1 Bill Scanning & Ingestion Life Cycle
```mermaid
sequenceDiagram
    autonumber
    actor Admin as House Admin
    participant App as HouseSplits Web App
    participant Edge as Cloudflare Pages Functions (/api/*)
    participant AI as Google Gemini 2.5 Flash
    participant D1 as Cloudflare D1 Database
    participant R2 as Cloudflare R2 Storage
    participant Webhook as Discord / Telegram Webhook

    Admin->>App: Upload bill (PDF or camera photo)
    App->>Edge: POST /api/upload (Invoice file)
    Edge->>R2: Store document in private bucket
    App->>AI: Send image/document payload + Structured Schema Prompt
    AI-->>App: Extracted JSON (Provider, Category, Amount, Dates, Inv#)
    App->>App: Calculate split preview using category preset rules
    App->>Admin: Open Interactive Review Modal (pre-filled fields)
    Admin->>App: Adjust any field / split override & click "Save Bill & Generate Splits"
    App->>Edge: POST /api/bills (Payload + splits)
    Edge->>D1: Insert bill and split records
    App->>Webhook: Post notification to House Chat channel
    Webhook-->>Admin: "New Electricity bill uploaded: €120.00. Splits generated!"
```

### 3.2 Payment & Settlement Life Cycle
```mermaid
stateDiagram-v2
    [*] --> BillIngested: Admin scans & confirms bill
    
    state BillState {
        BillIngested --> PaidToProvider: Admin marks official bill paid
    }

    state RoommateSplitState {
        SplitOwed: Split balance owed to Admin
        PaidToAdmin: Roommate transfers funds & marks "Paid"
        Confirmed: Admin verifies bank receipt & confirms
        
        BillIngested --> SplitOwed
        SplitOwed --> PaidToAdmin: Roommate pays (IBAN/Revolut)
        PaidToAdmin --> Confirmed: Admin confirms receipt
        PaidToAdmin --> SplitOwed: Admin rejects (funds not arrived)
    }

    Confirmed --> [*]: Balance Settled
```

---

## 4. Split Engine Specifications

### 4.1 Category Split Presets
The household maintains default split configurations per bill category:
- **Rent:** E.g., `User: 50.00%`, `Roommate A: 25.00%`, `Roommate B: 25.00%` (Total = 100%).
- **Electricity:** E.g., `User: 33.34%`, `Roommate A: 33.33%`, `Roommate B: 33.33%` (Total = 100%).
- **Water:** E.g., `User: 33.34%`, `Roommate A: 33.33%`, `Roommate B: 33.33%` (Total = 100%).
- **Internet:** E.g., `User: 33.34%`, `Roommate A: 33.33%`, `Roommate B: 33.33%` (Total = 100%).
- **Groceries / Shared House Supplies:** Configurable equal or custom split.

### 4.2 Exact-Cent Allocation & Rounding Rule
When dividing uneven amounts (e.g. €100.00 divided 3 ways = €33.3333...):
- Calculate each member's exact cent share: `Math.floor(totalAmount * (percent / 100) * 100) / 100`.
- Calculate remainder: `totalAmount - sum(allocatedShares)`.
- Allocate remaining cents (typically 1 or 2 cents) to the designated primary payer (Admin) or member with the highest percentage.
- **Invariant:** The sum of all `bill_splits.amount_due` must *always* equal `bills.total_amount` down to the exact cent.

### 4.3 Per-Bill Override Capability
In the Review Modal, the Admin can:
- Switch between percentage mode (%) and fixed monetary amount mode (€).
- Exclude a roommate (e.g., away for an entire month) and redistribute 100% across the remaining roommates.
- Fine-tune individual shares manually; the UI highlights whether the sum equals the bill total (green indicator) or has a discrepancy (red indicator).

---

## 5. Gemini AI Bill Scanner Specification

### 5.1 Model & API Configuration
- **Model:** `gemini-2.5-flash` (or `gemini-1.5-flash` with fallback)
- **Input Modality:** Multi-modal (Supports PDF documents and image formats `image/jpeg`, `image/png`, `image/webp`, `image/heic`).
- **Response Format:** Forced JSON output schema via `response_mime_type: "application/json"`.

### 5.2 Structured Extraction Schema
```json
{
  "provider_name": "string (e.g. EDP Comercial, Endesa, Vodafone, Landlord)",
  "category_suggestion": "string enum: ['rent', 'electricity', 'water', 'internet', 'gas', 'garbage', 'other']",
  "invoice_number": "string or null",
  "total_amount": "number (exact decimal, e.g. 142.50)",
  "currency": "string (ISO 4217, default 'EUR')",
  "issue_date": "string (YYYY-MM-DD or null)",
  "due_date": "string (YYYY-MM-DD or null)",
  "billing_period": {
    "start_date": "string (YYYY-MM-DD or null)",
    "end_date": "string (YYYY-MM-DD or null)"
  },
  "confidence_score": "number between 0 and 1",
  "notes": "string (brief summary or note on meter readings if present)"
}
```

### 5.3 System Prompt Blueprint
```text
You are a specialized financial document parser for residential household bills.
Your job is to analyze the provided bill image or PDF and extract structured invoice details with extreme accuracy.

Rules:
1. Identify the utility provider name or landlord.
2. Determine the bill category strictly from: rent, electricity, water, internet, gas, garbage, other.
3. Extract the total payable amount. Ensure discounts or previous balance forwards are accounted for and extract the FINAL amount due.
4. Extract the payment due date (the deadline to pay).
5. Extract the billing service period dates (from and to) if clearly indicated.
6. Extract the unique invoice or customer reference number.
7. Return clean JSON matching the specified schema. If any field cannot be determined, return null for that field.
```

---

## 6. Database Schema (Supabase PostgreSQL)

### 6.1 Entity Relationship Overview
```mermaid
erDiagram
    HOUSEHOLDS ||--o{ PROFILES : "has members"
    HOUSEHOLDS ||--o{ BILL_CATEGORIES : "defines"
    BILL_CATEGORIES ||--o{ CATEGORY_SPLIT_RULES : "has default %"
    PROFILES ||--o{ CATEGORY_SPLIT_RULES : "assigned %"
    HOUSEHOLDS ||--o{ BILLS : "manages"
    BILL_CATEGORIES ||--o{ BILLS : "categorizes"
    BILLS ||--o{ BILL_SPLITS : "split into"
    PROFILES ||--o{ BILL_SPLITS : "owes share"
    PROFILES ||--o{ PAYMENTS : "submits"
    BILLS ||--o{ PAYMENTS : "settles"
```

### 6.2 Table Definitions (Cloudflare D1 SQLite DDL)

```sql
-- 1. Households Table
CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Our Home',
    currency TEXT NOT NULL DEFAULT 'EUR',
    invite_code TEXT UNIQUE,
    admin_payment_info TEXT DEFAULT '{"iban":"","revolut":"","bizum":"","notes":""}',
    webhook_settings TEXT DEFAULT '{"discord_url":"","notify_on_new_bill":true,"notify_on_payment":true}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Profiles Table (Holds authentication and user profile data)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80',
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'system_manager')),
    is_system_manager INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Bill Categories
CREATE TABLE IF NOT EXISTS bill_categories (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    icon TEXT DEFAULT 'zap',
    color_hex TEXT DEFAULT '#10b981',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 4. Category Split Rules
CREATE TABLE IF NOT EXISTS category_split_rules (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES bill_categories(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    default_percentage REAL NOT NULL CHECK (default_percentage >= 0 AND default_percentage <= 100),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(category_id, profile_id)
);

-- 5. Bills
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES bill_categories(id),
    provider_name TEXT NOT NULL,
    invoice_number TEXT,
    total_amount REAL NOT NULL CHECK (total_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    issue_date TEXT,
    due_date TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    file_path TEXT,
    file_type TEXT,
    paid_to_provider INTEGER DEFAULT 0,
    paid_to_provider_at TEXT,
    created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 6. Bill Splits
CREATE TABLE IF NOT EXISTS bill_splits (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount >= 0),
    percentage REAL NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid_to_admin', 'confirmed_by_admin')),
    paid_at TEXT,
    confirmed_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 7. Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    bill_id TEXT REFERENCES bills(id) ON DELETE SET NULL,
    payer_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    payment_method TEXT NOT NULL,
    notes TEXT,
    confirmed INTEGER DEFAULT 0,
    confirmed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### 6.3 Edge Authorization & Scope Policies
Access control is enforced at the serverless edge via `functions/_auth.ts` middleware on all `/api/*` endpoints:
- **System Manager:** Global access across all households and users (`is_system_manager = 1`). Can inspect households, delete households, and reassign roles.
- **House Admin:** Scoped to `household_id`. Full CRUD on household bills, split rules, and payment confirmation.
- **Roommate (Member):** Scoped to `household_id`. Can read household bills, mark personal splits as paid to admin, and view payment details. Cannot modify other roommates' shares or delete household assets.

---

## 7. User Interface & Screen Wireframes

HouseSplits adopts a clean, high-contrast, dark-first UI with warm accents, optimized for thumb-driven mobile interaction.

### 7.1 Key Navigation Screens
1. **Home / Dashboard (`/`)**
   - **Hero Summary:** Current month overall spending, Admin settlement summary ("You are owed €340.50" or for member: "You owe Admin €85.00").
   - **Due Soon Carousel:** Cards showing upcoming bills with countdown tags (`Due in 3 days`).
   - **Quick Action Bar:** `[+ Scan Bill]` (Prominent floating action button for Admin), `[Pay Admin]` (for Roommates), `[Copy IBAN/Revolut]`.
   - **Recent Activity Feed:** Feed of newly uploaded bills and confirmed payments.

2. **Scanner & Review Modal (`/scan` or Modal)**
   - **Upload Dropzone:** Drag & drop bill or tap "Take Photo" / "Choose File".
   - **Live Progress Indicator:** "Gemini is reading your bill..." with animated shimmer.
   - **Side-by-Side Review:**
     - Left (Desktop) / Top Collapsible (Mobile): Document viewer preview.
     - Right: Extracted Form:
       - Provider Name & Category Selector.
       - Amount & Due Date picker.
       - Interactive Split Preview Table:
         - Row for each roommate showing Photo, Name, Split %, and Computed Share in €.
         - Real-time warning if total != 100%.
     - Primary Action: `[Confirm & Split Bill]`.

3. **Bills & Ledger (`/bills`)**
   - Filter tabs: `All`, `Unsettled`, `Paid to Provider`, `Archived`.
   - Category chips: `Rent`, `Electricity`, `Water`, `Internet`, etc.
   - Bill Card details: Provider logo/icon, invoice date range, total amount, badge showing how many roommates have paid (e.g. `2/3 Settled`).
   - Expandable split detail drawer showing breakdown per roommate with action buttons.

4. **Split Rules Manager (`/settings/splits`)**
   - Interactive matrix of categories vs roommates.
   - Sliders or numeric inputs to set default percentages per category.
   - Auto-balancing helper ("Equalize remaining").

5. **Household & Payment Settings (`/settings/house`)**
   - Admin Payment Info: IBAN, BIC, Revolut `@username`, Bizum number, custom payment instructions.
   - Roommate Management: Invite link generation, active roommate list, permission toggles.
   - Webhooks: Discord / Telegram webhook URL inputs with a "Send Test Notification" button.

---

## 8. Webhook Notification Payloads

### 8.1 Discord Webhook Payload (New Bill Ingested)
```json
{
  "username": "HouseSplits Bot",
  "avatar_url": "https://housesplits.app/icon.png",
  "embeds": [
    {
      "title": "⚡ New Utility Bill Uploaded",
      "description": "**Provider:** EDP Comercial\n**Category:** Electricity\n**Total Amount:** €120.00\n**Due Date:** Oct 25, 2026",
      "color": 3901686,
      "fields": [
        { "name": "Will (50%)", "value": "€60.00", "inline": true },
        { "name": "Mate A (25%)", "value": "€30.00", "inline": true },
        { "name": "Mate B (25%)", "value": "€30.00", "inline": true }
      ],
      "footer": { "text": "HouseSplits • Check app to view invoice & transfer details" }
    }
  ]
}
```

---

## 9. Security & Privacy Architecture

1. **Authentication & Password Protection:**
   - Passwords hashed using PBKDF2 with unique salts.
   - Sessions issued as signed HMAC-SHA256 JWTs and delivered via `HttpOnly`, `Secure`, `SameSite=Lax` cookies with `Bearer` token fallback for non-cookie HTTP clients.
2. **Encrypted Document Storage:**
   - Invoices and payment proofs are stored in Cloudflare R2 bucket (`housesplits-storage`) via authenticated `/api/upload` endpoint.
3. **Auditability:**
   - All balance changes, overrides, and payment confirmations record `created_at` and `updated_at` with user IDs in Cloudflare D1.

---

## 10. Implementation Phasing & Milestones

- **Phase 1: Project Initialization & Cloudflare Native Edge Setup**
  - Setup Vite + React 19 + TypeScript + Tailwind CSS project.
  - Setup Cloudflare D1 SQL schema, indices, and seed categories.
- **Phase 2: Authentication & Multi-Tenant Household Configuration**
  - Native PBKDF2/JWT auth at edge.
  - Roommate login & invite link system.
  - Category split rules manager with dynamic 100% balance validation.
  - System Manager Portal for platform-wide household & user management.
- **Phase 3: Gemini Bill Scanner & Cent-Accurate Split Engine**
  - Google Gemini 2.5 Flash multimodal document and photo OCR parsing.
  - Cent-accurate split calculator eliminating rounding errors.
  - Interactive Review & Confirmation Modal.
- **Phase 4: Bill Ledger & Payment Settlement Flow**
  - Dashboard with summary metrics (Total monthly expenses, what is owed to Admin).
  - Roommate payment tracking ("Mark Paid to Admin" + Admin "Confirm Payment").
  - Filterable Bills Ledger by month and category.
- **Phase 5: Webhooks & PWA Polish**
  - Discord webhook dispatch on new bill uploads and payment confirmations.
  - PWA manifest, offline icons, mobile-first responsive touch interface.
