-- Indexes for the read-only financial_data dataset (docs/05_DATABASE.md §8.1).
-- Applied after importing data/financial_data.sql. Idempotent.
CREATE INDEX IF NOT EXISTS idx_financial_data_company_year
    ON financial_data (company, year);
CREATE INDEX IF NOT EXISTS idx_financial_data_sector_year
    ON financial_data (sector, year);
CREATE INDEX IF NOT EXISTS idx_financial_data_ticker
    ON financial_data (ticker);
