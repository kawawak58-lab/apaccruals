-- Create tables for static data
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS tax_codes (
  id SERIAL PRIMARY KEY,
  description VARCHAR(255) UNIQUE NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_expense_classes_name ON expense_classes(name);
CREATE INDEX IF NOT EXISTS idx_transaction_types_name ON transaction_types(name);
CREATE INDEX IF NOT EXISTS idx_tax_codes_description ON tax_codes(description);

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on companies"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on expense_classes"
  ON expense_classes FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on transaction_types"
  ON transaction_types FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on tax_codes"
  ON tax_codes FOR SELECT
  USING (true);

-- Optional: Create policies for admin insert/update (you'll need to set up auth)
-- CREATE POLICY "Allow authenticated insert on companies"
--   ON companies FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');
