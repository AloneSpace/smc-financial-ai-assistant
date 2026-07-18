# Database Document

**Project:** Financial AI Chat Assistant  
**Version:** 1.0  
**Status:** Planning  
**Date:** 2026-07-14

---

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Data Coverage](#2-data-coverage)
3. [Schema Overview](#3-schema-overview)
4. [Table: financial\_data](#4-table-financial_data)
5. [Application Tables](#5-application-tables)
6. [NULL Value Analysis](#6-null-value-analysis)
7. [Business Rules & Constraints](#7-business-rules--constraints)
8. [Index Strategy](#8-index-strategy)
9. [Example SQL Queries](#9-example-sql-queries)
10. [Out-of-Coverage Scenarios](#10-out-of-coverage-scenarios)

---

## 1. Database Overview

The application uses a single **PostgreSQL** database that contains two logical groups of tables:

| Group | Tables | Purpose |
|---|---|---|
| **Financial Data** | `financial_data` | Read-only dataset provided as part of the assignment. Queried exclusively by the AI SQL tool. |
| **Application Data** | `users`, `conversations`, `messages` | Managed by NestJS backend. Stores user accounts, conversation threads, and chat messages. |

> **Critical rule:** The AI assistant must only retrieve financial figures from the `financial_data` table. It must never fabricate numbers. If a query returns 0 rows, the response must state that the data is not available.

---

## 2. Data Coverage

### 2.1 Dimensions

| Dimension | Coverage |
|---|---|
| **Companies** | 49 unique companies (see full list below) |
| **Years** | 2022, 2023, 2024, 2025 |
| **Sectors** | Technology, Finance, Healthcare, Consumer, Energy |
| **Total rows** | 192 |
| **Metrics** | revenue, net\_income, operating\_income, gross\_profit |

> **Note:** The REQUIREMENTS.md states "48 companies / 192 rows." The actual SQL dump contains **49 unique company names** and **192 rows**. This is because BlackRock (2 rows: 2022–2023) and Shopify (2 rows: 2024–2025) each have incomplete year coverage, while the remaining 47 companies each have 4 rows. 47 × 4 + 2 + 2 = **192 rows**.

### 2.2 Companies by Sector

#### Technology (15 companies)

| Company | Ticker | Years |
|---|---|---|
| AMD | AMD | 2022–2025 |
| Adobe | ADBE | 2022–2025 |
| Amazon | AMZN | 2022–2025 |
| Apple | AAPL | 2022–2025 |
| Google | GOOGL | 2022–2025 |
| Intel | INTC | 2022–2025 |
| Meta | META | 2022–2025 |
| Microsoft | MSFT | 2022–2025 |
| Netflix | NFLX | 2022–2025 |
| Nvidia | NVDA | 2022–2025 |
| Oracle | ORCL | 2022–2025 |
| Salesforce | CRM | 2022–2025 |
| Shopify | SHOP | 2024–2025 only |
| Tesla | TSLA | 2022–2025 |
| Uber | UBER | 2022–2025 |

#### Finance (15 companies)

| Company | Ticker | Years |
|---|---|---|
| AmericanExpress | AXP | 2022–2025 |
| BankOfAmerica | BAC | 2022–2025 |
| BlackRock | BLK | 2022–2023 only |
| CapitalOne | COF | 2022–2025 |
| Citigroup | C | 2022–2025 |
| Goldman | GS | 2022–2025 |
| JPMorgan | JPM | 2022–2025 |
| Mastercard | MA | 2022–2025 |
| Morgan Stanley | MS | 2022–2025 |
| PNC | PNC | 2022–2025 |
| PayPal | PYPL | 2022–2025 |
| Schwab | SCHW | 2022–2025 |
| USB | USB | 2022–2025 |
| Visa | V | 2022–2025 |
| WellsFargo | WFC | 2022–2025 |

#### Healthcare (8 companies)

| Company | Ticker | Years |
|---|---|---|
| AbbVie | ABBV | 2022–2025 |
| Amgen | AMGN | 2022–2025 |
| Bristol-Myers | BMY | 2022–2025 |
| Eli Lilly | LLY | 2022–2025 |
| JohnsonJohnson | JNJ | 2022–2025 |
| Merck | MRK | 2022–2025 |
| Pfizer | PFE | 2022–2025 |
| UnitedHealth | UNH | 2022–2025 |

#### Consumer (9 companies)

| Company | Ticker | Years |
|---|---|---|
| Coca-Cola | KO | 2022–2025 |
| Costco | COST | 2022–2025 |
| HomeDepot | HD | 2022–2025 |
| McDonald's | MCD | 2022–2025 |
| Nike | NKE | 2022–2025 |
| PepsiCo | PEP | 2022–2025 |
| Starbucks | SBUX | 2022–2025 |
| Target | TGT | 2022–2025 |
| Walmart | WMT | 2022–2025 |

#### Energy (2 companies)

| Company | Ticker | Years |
|---|---|---|
| Chevron | CVX | 2022–2025 |
| ExxonMobil | XOM | 2022–2025 |

---

## 3. Schema Overview

```
┌─────────────────────────────────────────────────────────┐
│  financial_data                                          │
│  (Read-only. Queried only via AI SQL Tool.)              │
│                                                          │
│  company          VARCHAR(255)                           │
│  ticker           VARCHAR(255)                           │
│  sector           VARCHAR(255)                           │
│  year             INTEGER                                │
│  revenue          BIGINT NULL                            │
│  net_income       BIGINT NULL                            │
│  operating_income BIGINT NULL                            │
│  gross_profit     BIGINT NULL                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  users                                                   │
│                                                          │
│  id               UUID PK DEFAULT gen_random_uuid()      │
│  email            VARCHAR(255) UNIQUE NOT NULL           │
│  password_hash    VARCHAR(255) NOT NULL                  │
│  created_at       TIMESTAMPTZ DEFAULT now()              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  conversations                                           │
│                                                          │
│  id               UUID PK DEFAULT gen_random_uuid()      │
│  user_id          UUID NOT NULL FK → users.id            │
│  title            VARCHAR(255) NOT NULL                  │
│  created_at       TIMESTAMPTZ DEFAULT now()              │
│  updated_at       TIMESTAMPTZ DEFAULT now()              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  messages                                                │
│                                                          │
│  id               UUID PK DEFAULT gen_random_uuid()      │
│  conversation_id  UUID NOT NULL FK → conversations.id    │
│  role             VARCHAR(20) NOT NULL                   │
│  content          TEXT NOT NULL                          │
│  tool_name        VARCHAR(100) NULL                      │
│  tool_input       JSONB NULL                             │
│  tool_output      JSONB NULL                             │
│  tokens_used      INTEGER NULL                           │
│  is_partial       BOOLEAN DEFAULT false                  │
│  created_at       TIMESTAMPTZ DEFAULT now()              │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Table: financial\_data

### 4.1 DDL (from `data/financial_data.sql`)

```sql
DROP TABLE IF EXISTS financial_data;
CREATE TABLE financial_data (
    company          VARCHAR(255),
    ticker           VARCHAR(255),
    sector           VARCHAR(255),
    year             INTEGER,
    revenue          BIGINT,
    net_income       BIGINT,
    operating_income BIGINT,
    gross_profit     BIGINT
);
```

> **Note:** The provided DDL has no primary key, no indexes, and no `NOT NULL` constraints. These must be added during the infrastructure setup phase to ensure query performance and data integrity.

### 4.2 Column Descriptions

| Column | Type | Nullable | Unit | Description |
|---|---|---|---|---|
| `company` | VARCHAR(255) | Yes (DDL default) | — | Full company name as stored (e.g. `"Apple"`, `"Eli Lilly"`, `"Morgan Stanley"`) |
| `ticker` | VARCHAR(255) | Yes | — | Stock exchange ticker symbol (e.g. `"AAPL"`, `"GOOGL"`) |
| `sector` | VARCHAR(255) | Yes | — | Industry sector. Values: `Technology`, `Finance`, `Healthcare`, `Consumer`, `Energy` |
| `year` | INTEGER | Yes | Calendar year | Fiscal/calendar year. Values: `2022`, `2023`, `2024`, `2025` |
| `revenue` | BIGINT | **Yes** | USD (absolute) | Total revenue / net sales for the year. NULL for Goldman, Morgan Stanley, WellsFargo (all years) and USB (2022) |
| `net_income` | BIGINT | **Yes** | USD (absolute) | Net income (profit after all expenses and taxes). Negative values represent net losses. NULL for Mastercard (all years) |
| `operating_income` | BIGINT | **Yes** | USD (absolute) | Earnings before interest and taxes (EBIT). NULL for most Finance and some Healthcare companies |
| `gross_profit` | BIGINT | **Yes** | USD (absolute) | Revenue minus cost of goods sold. NULL for many companies, particularly Finance and some Technology |

### 4.3 Value Scale

All monetary values are stored in **absolute USD** (not millions or billions). Examples:

| Company | Year | Revenue (raw) | Human-readable |
|---|---|---|---|
| Apple | 2025 | 416,161,000,000 | $416.16 billion |
| Netflix | 2024 | 39,000,966,000 | $39.00 billion |
| Intel | 2024 | 53,101,000,000 | $53.10 billion |
| Bristol-Myers | 2024 | 48,300,000,000 (net_income: -8,948,000,000) | Net loss of $8.95B |

The AI assistant must format these values correctly in human-readable form (e.g. divide by 1,000,000,000 and append "billion").

### 4.4 Known Data Anomalies

| Anomaly | Detail | Implication |
|---|---|---|
| **Goldman, Morgan Stanley, WellsFargo — no revenue** | Revenue is NULL for all years. Only `net_income` is available. | Queries for "revenue of Goldman" must return no data / clarify |
| **Mastercard — no net_income** | `net_income` is NULL for all years. Only `revenue` and `operating_income` are available. | Queries for "Mastercard net income" must state unavailable |
| **USB 2022 — no revenue** | `revenue` is NULL for 2022 only. 2023–2025 have revenue. | Partial data; must be stated accurately |
| **BlackRock — 2022–2023 only** | No data for 2024–2025. | Queries for 2024/2025 return 0 rows |
| **Shopify — 2024–2025 only** | No data for 2022–2023. | Queries for 2022/2023 return 0 rows |
| **Amazon — no gross_profit** | `gross_profit` is NULL for all years. | Queries for "Amazon gross profit" must state unavailable |
| **Finance sector — mostly no operating_income** | Most Finance companies do not report operating income by convention. | Expected NULL; must not be treated as missing data error |
| **Negative values** | Intel net_income (2024: -$18.76B), Bristol-Myers net_income (2024: -$8.95B), Uber net_income (2022: -$9.14B), AbbVie net_income (2024: -$22M) | Negative values are valid. The AI must not reject or flag them as errors |
| **JohnsonJohnson 2023 anomaly** | Revenue: $21.4B (2023) vs $94.9B (2022) and $88.8B (2024). This large dip may reflect a spinoff. | Real data; the AI must report it accurately without questioning it |

---

## 5. Application Tables

These tables are created by NestJS migrations on first startup and are not part of the provided SQL dump.

### 5.1 users

```sql
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.2 conversations

```sql
CREATE TABLE conversations (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.3 messages

```sql
CREATE TABLE messages (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content         TEXT        NOT NULL DEFAULT '',
    tool_name       VARCHAR(100),
    tool_input      JSONB,
    tool_output     JSONB,
    tokens_used     INTEGER,
    is_partial      BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### messages.role Values

| Role | Description |
|---|---|
| `user` | A message sent by the authenticated user |
| `assistant` | A message generated by the AI (may be partial if `is_partial = true`) |
| `tool` | The result of a SQL tool call, stored for conversation context reconstruction |

#### messages JSONB Fields

`tool_input` example:
```json
{ "query": "SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023" }
```

`tool_output` example:
```json
[{ "net_income": 96995000000 }]
```

---

## 6. NULL Value Analysis

### 6.1 NULL Coverage Map

The following table shows which metrics are NULL across all years for each company. `✓` = data exists, `✗` = always NULL.

| Company | Sector | revenue | net\_income | operating\_income | gross\_profit |
|---|---|---|---|---|---|
| AMD | Technology | ✓ | ✓ | ✓ | ✓ |
| Adobe | Technology | ✓ | ✓ | ✓ | ✓ |
| Amazon | Technology | ✓ | ✓ | ✓ | **✗** |
| Apple | Technology | ✓ | ✓ | ✓ | ✓ |
| Google | Technology | ✓ | ✓ | ✓ | **✗** |
| Intel | Technology | ✓ | ✓ | ✓ | ✓ |
| Meta | Technology | ✓ | ✓ | ✓ | **✗** |
| Microsoft | Technology | ✓ | ✓ | ✓ | ✓ |
| Netflix | Technology | ✓ | ✓ | ✓ | **✗** |
| Nvidia | Technology | ✓ | ✓ | ✓ | ✓ |
| Oracle | Technology | ✓ | ✓ | ✓ | **✗** |
| Salesforce | Technology | ✓ | ✓ | ✓ | ✓ |
| Shopify | Technology | ✓ | ✓ | ✓ | ✓ |
| Tesla | Technology | ✓ | ✓ | ✓ | ✓ |
| Uber | Technology | ✓ | ✓ | ✓ | **✗** |
| AmericanExpress | Finance | ✓ | ✓ | **✗** | **✗** |
| BankOfAmerica | Finance | ✓ | ✓ | **✗** | **✗** |
| BlackRock | Finance | ✓ | ✓ | ✓ | **✗** |
| CapitalOne | Finance | ✓ | ✓ | **✗** | **✗** |
| Citigroup | Finance | ✓ | ✓ | **✗** | **✗** |
| Goldman | Finance | **✗** | ✓ | **✗** | **✗** |
| JPMorgan | Finance | ✓ | ✓ | **✗** | **✗** |
| Mastercard | Finance | ✓ | **✗** | ✓ | **✗** |
| Morgan Stanley | Finance | **✗** | ✓ | **✗** | **✗** |
| PNC | Finance | ✓ | ✓ | **✗** | **✗** |
| PayPal | Finance | ✓ | ✓ | ✓ | **✗** |
| Schwab | Finance | ✓ | ✓ | **✗** | **✗** |
| USB | Finance | ✓* | ✓ | **✗** | **✗** |
| Visa | Finance | ✓ | ✓ | ✓ | **✗** |
| WellsFargo | Finance | **✗** | ✓ | **✗** | **✗** |
| AbbVie | Healthcare | ✓ | ✓ | ✓ | ✓ |
| Amgen | Healthcare | ✓ | ✓ | ✓ | **✗** |
| Bristol-Myers | Healthcare | ✓ | ✓ | **✗** | **✗** |
| Eli Lilly | Healthcare | ✓ | ✓ | **✗** | **✗** |
| JohnsonJohnson | Healthcare | ✓ | ✓ | **✗** | ✓ |
| Merck | Healthcare | ✓ | ✓ | **✗** | **✗** |
| Pfizer | Healthcare | ✓ | ✓ | **✗** | **✗** |
| UnitedHealth | Healthcare | ✓ | ✓ | ✓ | **✗** |
| Coca-Cola | Consumer | ✓ | ✓ | ✓ | ✓ |
| Costco | Consumer | ✓ | ✓ | ✓ | **✗** |
| HomeDepot | Consumer | ✓ | ✓ | ✓ | ✓ |
| McDonald's | Consumer | ✓ | ✓ | ✓ | **✗** |
| Nike | Consumer | ✓ | ✓ | **✗** | ✓ |
| PepsiCo | Consumer | ✓ | ✓ | ✓ | ✓ |
| Starbucks | Consumer | ✓ | ✓ | ✓ | **✗** |
| Target | Consumer | ✓ | ✓ | ✓ | **✗** |
| Walmart | Consumer | ✓ | ✓ | ✓ | **✗** |
| Chevron | Energy | ✓ | ✓ | **✗** | **✗** |
| ExxonMobil | Energy | ✓ | ✓ | **✗** | **✗** |

*USB revenue is NULL for 2022 only.

---

## 7. Business Rules & Constraints

### 7.1 AI Access Rules

| Rule | Implementation |
|---|---|
| **SELECT only** | `SqlToolService` rejects any query that does not begin with `SELECT` |
| **No DML** | Reject if query contains `INSERT`, `UPDATE`, `DELETE` |
| **No DDL** | Reject if query contains `DROP`, `CREATE`, `ALTER`, `TRUNCATE` |
| **No multi-statements** | Reject if query contains `;` within the query string |
| **financial_data only** | The AI is instructed via system prompt to only query `financial_data`. Queries against application tables (`users`, `messages`) should be rejected. |
| **Row limit** | Results capped at 100 rows to prevent oversized tool responses |
| **NULL handling** | The AI must communicate clearly when a requested metric is NULL vs. when a row does not exist |

### 7.2 Data Boundary Rules

| Rule | Description |
|---|---|
| **No years outside 2022–2025** | Any query for 2021 or earlier, or 2026 or later, will return 0 rows |
| **No companies outside the dataset** | Queries for companies not in the table return 0 rows |
| **No real-time data** | The dataset is static; all values are historical |
| **Negative values are valid** | Net losses must be reported as-is (e.g., Intel 2024: -$18.76B) |
| **NULL ≠ zero** | A NULL metric is not the same as zero. The AI must say "data not available" not "$0" |

### 7.3 Application Data Rules

| Rule | Description |
|---|---|
| **User isolation** | All `conversations` and `messages` queries must include `WHERE user_id = :userId` |
| **Cascade deletes** | Deleting a conversation cascades to all its messages |
| **Message ordering** | Messages must always be queried `ORDER BY created_at ASC` |
| **Conversation title** | Auto-generated from the first user message (first 60 characters) |
| **Partial messages** | When stop generation occurs, `is_partial = true` is set on the assistant message |

---

## 8. Index Strategy

### 8.1 financial\_data Indexes

```sql
-- Composite index for the most common query pattern
CREATE INDEX idx_financial_data_company_year
    ON financial_data (company, year);

-- Index for sector-based filtering
CREATE INDEX idx_financial_data_sector_year
    ON financial_data (sector, year);

-- Index for ticker lookups
CREATE INDEX idx_financial_data_ticker
    ON financial_data (ticker);
```

### 8.2 Application Table Indexes

```sql
-- Conversations: fast lookup by user
CREATE INDEX idx_conversations_user_id
    ON conversations (user_id, updated_at DESC);

-- Messages: fast full conversation load
CREATE INDEX idx_messages_conversation_id
    ON messages (conversation_id, created_at ASC);
```

---

## 9. Example SQL Queries

The following queries represent the most common patterns the AI SQL tool will generate. They are provided as reference for both development and testing.

### Q1 — Single Company, Single Year, Single Metric

```sql
-- "What was Apple's net income in 2023?"
SELECT company, ticker, year, net_income
FROM financial_data
WHERE company = 'Apple' AND year = 2023;
```

**Expected result:**

| company | ticker | year | net\_income |
|---|---|---|---|
| Apple | AAPL | 2023 | 96995000000 |

---

### Q2 — Single Company, All Years, Single Metric (Trend)

```sql
-- "Show Microsoft's revenue from 2022 to 2025"
SELECT year, revenue
FROM financial_data
WHERE company = 'Microsoft'
ORDER BY year ASC;
```

**Expected result:**

| year | revenue |
|---|---|
| 2022 | 198270000000 |
| 2023 | 211915000000 |
| 2024 | 245122000000 |
| 2025 | 281724000000 |

---

### Q3 — Multi-Company, Single Year, Single Metric (Ranking)

```sql
-- "Which technology companies had the highest revenue in 2024?"
SELECT company, ticker, revenue
FROM financial_data
WHERE sector = 'Technology' AND year = 2024 AND revenue IS NOT NULL
ORDER BY revenue DESC;
```

---

### Q4 — Multi-Company Comparison, Single Year, Multiple Metrics

```sql
-- "Compare Apple, Google, and Microsoft in 2024"
SELECT company, ticker, revenue, net_income, operating_income
FROM financial_data
WHERE company IN ('Apple', 'Google', 'Microsoft') AND year = 2024
ORDER BY company;
```

---

### Q5 — Year-over-Year Growth Calculation

```sql
-- "What was Nvidia's revenue growth from 2023 to 2025?"
SELECT
    a.company,
    a.year AS from_year,
    b.year AS to_year,
    a.revenue AS revenue_from,
    b.revenue AS revenue_to,
    ROUND((b.revenue - a.revenue) * 100.0 / NULLIF(a.revenue, 0), 2) AS growth_pct
FROM financial_data a
JOIN financial_data b
    ON a.company = b.company
    AND a.year = 2023
    AND b.year = 2025
WHERE a.company = 'Nvidia'
  AND a.revenue IS NOT NULL
  AND b.revenue IS NOT NULL;
```

---

### Q6 — Sector Aggregation

```sql
-- "What is the total net income of all healthcare companies in 2024?"
SELECT
    sector,
    year,
    SUM(net_income) AS total_net_income,
    COUNT(*) AS company_count
FROM financial_data
WHERE sector = 'Healthcare' AND year = 2024
GROUP BY sector, year;
```

---

### Q7 — Top N Across All Sectors

```sql
-- "Which companies had the highest net income in 2025?"
SELECT company, ticker, sector, net_income
FROM financial_data
WHERE year = 2025 AND net_income IS NOT NULL
ORDER BY net_income DESC
LIMIT 10;
```

---

### Q8 — Companies with Negative Net Income

```sql
-- "Which companies reported a net loss in any year?"
SELECT company, ticker, sector, year, net_income
FROM financial_data
WHERE net_income < 0
ORDER BY net_income ASC;
```

**Expected result includes:** Intel (2024), Bristol-Myers (2024), Uber (2022), AbbVie (2024)

---

### Q9 — Checking Data Availability (Returns 0 rows)

```sql
-- "What was Apple's revenue in 2021?"
SELECT * FROM financial_data
WHERE company = 'Apple' AND year = 2021;
-- Returns: 0 rows → AI must respond "data not available"

-- "What was Tesla's revenue in 2026?"
SELECT * FROM financial_data
WHERE company = 'Tesla' AND year = 2026;
-- Returns: 0 rows → AI must respond "data not available"

-- "What was OpenAI's net income?"
SELECT * FROM financial_data
WHERE company = 'OpenAI';
-- Returns: 0 rows → AI must respond "OpenAI is not in the dataset"
```

---

### Q10 — Handling NULL Metrics

```sql
-- "What was Goldman's revenue in 2024?"
SELECT company, ticker, year, revenue
FROM financial_data
WHERE company = 'Goldman' AND year = 2024;
```

**Expected result:**

| company | ticker | year | revenue |
|---|---|---|---|
| Goldman | GS | 2024 | NULL |

The row exists but `revenue` is NULL. The AI must respond: "Revenue data is not available for Goldman Sachs in 2024. However, their net income for 2024 was $14.28 billion."

---

### Q11 — Full Company Dataset for Multi-Year Chart

```sql
-- "Show me Nvidia's financial performance over the years"
SELECT year, revenue, net_income, operating_income, gross_profit
FROM financial_data
WHERE company = 'Nvidia'
ORDER BY year ASC;
```

---

## 10. Out-of-Coverage Scenarios

The AI must handle these scenarios without fabricating data. The system prompt and the 0-row SQL result together enforce this.

| Query | Database Response | Required AI Response |
|---|---|---|
| "Apple revenue in 2021" | 0 rows | "Data for Apple in 2021 is not available in the database. Available years are 2022–2025." |
| "Tesla revenue in 2026" | 0 rows | "Data for Tesla in 2026 is not available. The dataset covers 2022–2025." |
| "OpenAI net income" | 0 rows | "OpenAI is not included in this dataset. The dataset covers 49 US public companies." |
| "Shopify revenue in 2022" | 0 rows | "Shopify data is only available for 2024 and 2025 in this dataset." |
| "Goldman revenue in 2024" | 1 row, revenue=NULL | "Revenue data is not available for Goldman Sachs. Net income for 2024 was $14.28 billion." |
| "Mastercard net income 2023" | 1 row, net_income=NULL | "Net income data is not available for Mastercard. Operating income for 2023 was $14.01 billion." |
| "BlackRock revenue in 2025" | 0 rows | "BlackRock data is only available for 2022 and 2023 in this dataset." |

> **Design note:** The AI never guesses. It states exactly what the data shows and what it does not. This is enforced architecturally by the system prompt instruction: "If the SQL query returns no rows, respond: 'The requested data is not available in the database.'"
