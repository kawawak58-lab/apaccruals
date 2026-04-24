# Year-End Accrual System Functional Overview

## 1. Overview

The Year-End Accrual System is a finance-focused web application used to create, manage, monitor, and control year-end accrual entries. It provides a structured workflow for end users who need to submit accrual requests and for administrators who maintain the supporting master data, user access, and accrual filing window.

The current active architecture is a React frontend connected directly to Supabase for:

- authentication
- database reads and writes
- role-based access
- RPC-based business actions such as accrual submission and cancellation

Although the repository still contains older Google Sheets and Express-based code, the main live application flow is centered on Supabase.

## 2. Business Purpose

The application is designed to support the year-end accrual process by giving users a controlled way to:

- create accrual submissions with detailed accounting line items
- generate and track unique control numbers
- maintain reference data required for accurate submission
- monitor submitted accruals
- cancel accruals when needed with business justification
- enforce a defined filing period for accrual entry

This reduces manual tracking, standardizes submission data, and gives finance administrators a central workspace for maintenance and oversight.

## 3. Primary User Types

### 3.1 Accrual User

An `accrual_user` is a standard end user who can:

- sign in with Google
- complete a user profile
- create new accrual submissions
- use lookup data such as suppliers, GL accounts, profit centers, tax codes, and transaction types
- view their own submitted accruals
- cancel their own open accruals with remarks
- submit supplier enrollment requests when a needed supplier is missing

### 3.2 System Administrator

A `sysadmin` has all accrual user capabilities plus access to administrative modules. A sysadmin can:

- view all accrual submissions across users
- cancel any open accrual entry
- maintain master data tables
- review and approve supplier enrollment requests
- manage user roles
- configure the accrual filing window

## 4. Authentication and User Access

The system uses Google sign-in through Supabase authentication.

### 4.1 Sign-in Flow

When a user opens the application:

1. the app checks whether a valid session exists
2. if no session exists, the user is shown a Google sign-in screen
3. after successful login, the app checks for a matching user profile in the application database
4. if no profile is fully linked yet, the user is prompted to complete a display name
5. the app creates or updates the user profile and records the login

### 4.2 User Profile Management

The `users` table stores:

- Supabase auth user ID
- email address
- display name
- role or user group
- created timestamp
- updated timestamp
- last login timestamp

This table is the basis for role-based navigation and access control in the application.

## 5. Application Navigation

The application uses a dashboard-style shell with:

- a sidebar for module navigation
- a top bar for context and page title
- a central content area where the selected module is displayed

Navigation is role-sensitive.

### 5.1 Main Navigation Modules

Available to both `accrual_user` and `sysadmin`:

- All Accruals
- New Accrual

Available only to `sysadmin`:

- Suppliers
- GL Accounts
- Profit Centers
- Companies
- Expense Classifications
- Transaction Types
- Tax Codes
- Users
- Accrual Setup
- Announcement placeholder

## 6. Core Functional Module: New Accrual

The new accrual form is the central business workflow of the system.

### 6.1 Purpose

This module allows a user to create an accrual submission made up of:

- one submission header
- one or more line items

### 6.2 Header Information

The form collects header-level information such as:

- requester email
- expense class
- company
- supplier code and supplier name
- invoice number

These values describe the overall accrual request and are stored in the accrual submission header record.

### 6.3 Line Item Information

Each accrual can contain multiple line items. Each line item includes:

- gross amount
- GL account code
- GL account name
- profit center code
- profit center name
- transaction type
- VAT type
- tax code
- remarks

This lets a single accrual submission capture detailed financial allocation across one or more accounting lines.

### 6.4 Lookup-driven Data Entry

The form relies heavily on maintained master data. Users do not type everything manually. Instead, they choose from lookup-driven options for:

- expense classes
- companies
- suppliers
- GL accounts
- profit centers
- transaction types
- tax codes

This improves consistency and reduces invalid submissions.

### 6.5 Draft Persistence

The accrual form stores a draft in local browser storage while the user is working. This means:

- progress is not easily lost after a refresh
- users can recover in-progress entries
- line items and header information persist until cleared or submitted

### 6.6 Validation Rules

Before submission, the form validates required fields, including:

- required header values
- required line-level values
- mandatory remarks
- VAT and tax code logic depending on expense class

The form prevents submission until validation passes.

### 6.7 Filing Window Enforcement

The ability to submit a new accrual is controlled by the configured accrual filing window.

If the current date is outside the allowed date range:

- users cannot submit new accruals
- the UI communicates that the filing window is closed

### 6.8 Submission Behavior

When the user submits:

1. the app prepares a header payload and line item payloads
2. a Supabase RPC creates the submission
3. the system generates the next control number
4. the submission header is inserted into `accrual_submissions`
5. the line items are inserted into `accrual_submission_lines`
6. the generated control number is returned to the frontend
7. the user sees a confirmation modal containing the new control number

### 6.9 Control Number Generation

Control numbers are generated centrally through a dedicated sequence table and database function. This ensures:

- unique control numbers
- consistent prefix formatting
- sequential numbering

The default pattern is based on a prefix such as `ACT` combined with a zero-padded numeric sequence.

## 7. All Accruals Module

The All Accruals page is the monitoring and inquiry screen for submitted accruals.

### 7.1 Purpose

It allows users to:

- review previously submitted accruals
- search and filter accrual records
- inspect detailed line items
- export accrual data
- cancel eligible accruals

### 7.2 Visibility Rules

Visibility depends on user role:

- `sysadmin` users can view all accrual submissions
- `accrual_user` users can view only submissions associated with their email

### 7.3 Filtering and Search

The page supports:

- free-text search
- date-from filter
- date-to filter
- status filter

The search checks values such as:

- control number
- requester email
- expense class
- company
- supplier details
- invoice number
- cancellation remarks

### 7.4 Accrual Detail Review

Users can open a selected accrual and review:

- control number
- submission timestamp
- requester
- status
- expense class
- company
- supplier information
- invoice number
- cancellation remarks if applicable
- all submitted line items

### 7.5 Export

The module can export filtered accrual results into a CSV file that includes both header and line-level data.

This supports offline review, reconciliation, and reporting.

### 7.6 Cancellation

Eligible open accruals can be cancelled.

Cancellation rules:

- cancelled entries cannot be cancelled again
- sysadmins may cancel any open accrual
- regular users may cancel only their own open accruals
- cancellation remarks are mandatory

When cancelled:

- the submission status changes from open to cancelled
- the cancellation remarks are stored in the submission record

## 8. Accrual Setup Module

The Accrual Setup page is an administrative control point for the filing period.

### 8.1 Purpose

It lets administrators define the window during which new accrual submissions are allowed.

### 8.2 Managed Values

The module maintains:

- start date
- cutoff date

These are stored in a singleton table called `accrual_setup`.

### 8.3 Functional Effect

The setup affects the New Accrual module directly:

- if today falls within the date range, filing is open
- if today is outside the date range, filing is closed
- if setup is incomplete, filing is treated as unavailable

### 8.4 UI Feedback

The page displays:

- whether the window is open, closed, or unconfigured
- the current date
- the configured rule in human-readable form
- the last update timestamp

## 9. Master Data Management Modules

The system includes several administrative maintenance modules used to manage the lookup values that drive form behavior.

These modules use a shared pattern:

- searchable table view
- add/edit dialog
- delete capability
- bulk upload via CSV or XLSX

### 9.1 Companies

Purpose:

- maintain the list of valid companies used across the system

This list is used by:

- the accrual form
- supplier assignment
- GL account assignment
- profit center assignment

### 9.2 Expense Classifications

Purpose:

- maintain the list of valid expense classes used in accrual submissions

These values affect form behavior, including VAT and tax code handling.

### 9.3 Transaction Types

Purpose:

- maintain valid transaction types used at line-item level

### 9.4 Tax Codes

Purpose:

- maintain valid tax code descriptions used in line items

### 9.5 Suppliers

Purpose:

- maintain the approved supplier master
- support search and company filtering
- support direct creation, editing, deletion, and bulk upload

Supplier records contain:

- supplier code
- supplier name
- company

### 9.6 Supplier Enrollment Queue

This is a supplier-specific workflow.

If a user cannot find a supplier during accrual creation, they can submit a supplier enrollment request. These requests are stored in `suppliernenroll`.

Admins can:

- review pending enrollments
- approve an enrollment
- delete an enrollment request

Approval behavior:

1. mark the enrollment as approved
2. insert the supplier into the main `suppliers` table

This creates a controlled onboarding path for missing suppliers.

### 9.7 GL Accounts

Purpose:

- maintain the list of valid GL accounts
- assign GL accounts per company
- support searching, editing, deletion, and bulk upload

GL account records contain:

- GL account code
- GL account name
- company

### 9.8 Profit Centers

Purpose:

- maintain the list of valid profit centers
- assign profit centers per company
- support searching, editing, deletion, and bulk upload

Profit center records contain:

- profit center code
- profit center name
- company

## 10. User Administration Module

The Users page lets a sysadmin manage application users after they sign in.

### 10.1 Purpose

It provides visibility into authenticated users and lets admins assign the right access group.

### 10.2 Supported Actions

The module allows admins to:

- search users by display name, email, or role
- review account creation and last login timestamps
- update display name
- change user group between `accrual_user` and `sysadmin`

Users are not manually created here. Instead:

- users are created automatically the first time they authenticate and complete profile setup

## 11. Bulk Upload Functionality

Bulk upload is a shared feature used across multiple maintenance modules and the accrual process.

### 11.1 Supported File Types

The upload utility supports:

- CSV
- XLSX

### 11.2 Shared Upload Flow

The upload experience includes:

1. template download
2. file selection or drag-and-drop
3. parsing and validation
4. preview of parsed rows
5. row-level error review
6. upload progress feedback
7. success confirmation

### 11.3 Validation Support

Validation checks can include:

- missing required columns
- blank required values
- duplicates inside the uploaded file
- duplicates already existing in the database
- invalid company references

### 11.4 Accrual Bulk Upload

Bulk upload is also implemented for accrual submissions.

In that process:

- rows are grouped by a `sequence` value
- each group becomes one accrual submission header
- grouped rows become that submission’s line items
- each generated submission receives its own control number

The upload result can present the created control numbers back to the user for reference.

## 12. Database Structure

The system’s main functional entities are represented in the following tables.

### 12.1 User and Access Tables

- `users`

### 12.2 Setup and Control Tables

- `accrual_setup`
- `control_number_sequence`

### 12.3 Master Data Tables

- `companies`
- `expense_classes`
- `transaction_types`
- `tax_codes`
- `suppliers`
- `suppliernenroll`
- `glaccounts`
- `profitcenters`

### 12.4 Transaction Tables

- `accrual_submissions`
- `accrual_submission_lines`

## 13. Stored Procedures and Business Functions

The system uses Supabase/Postgres functions to centralize important business logic.

### 13.1 `get_current_app_user`

Purpose:

- return the signed-in user’s application profile

### 13.2 `ensure_user_profile`

Purpose:

- create or update a user profile after authentication

### 13.3 `get_next_control_number`

Purpose:

- increment the sequence and return the next formatted control number

### 13.4 `submit_accrual`

Purpose:

- create a new accrual submission and all associated line items

### 13.5 `cancel_accrual`

Purpose:

- cancel an accrual submission with authorization checks and required remarks

### 13.6 `is_sysadmin`

Purpose:

- determine whether the currently authenticated user is a sysadmin for policy and function checks

## 14. Access Control and Security Model

The schema includes row-level security and role-aware access patterns.

Notable functional behavior:

- users may read their own profile or sysadmins may read broader user data
- user role updates are restricted to sysadmins
- accrual cancellation enforces authenticated access and ownership or sysadmin rights

There is also a practical note in the schema that some current frontend behavior still assumes broad browser-side access for certain tables. This is functional for the current implementation, but it is an area that could be tightened further for stricter production security.

## 15. Legacy or Transitional Components

The repository still contains:

- an Express backend
- API endpoint files
- Google Sheets integration logic

These components appear to reflect an older architecture where lookup and submission data were read from and written to Google Sheets.

Based on the current frontend implementation, the main active application flow now uses Supabase directly for:

- auth
- CRUD
- setup management
- submission management
- cancellation

These older components are likely legacy, transitional, or retained for reference.

## 16. End-to-End Functional Summary

In practical terms, the system works like this:

1. a user signs in with Google
2. the app ensures the user has a profile and role
3. the user creates an accrual using approved master data
4. the app validates the entry and checks whether the filing window is open
5. the database generates a control number and saves the submission plus all line items
6. the user can later review the submission in All Accruals
7. admins maintain the lookup tables and user roles that support the process
8. admins can also approve new suppliers and control when filing is open
9. eligible users can cancel open accrual entries with documented remarks

## 17. Overall Functional Value

Functionally, the application serves as a centralized accrual workspace that combines:

- controlled submission intake
- master data governance
- user and role administration
- filing period control
- searchable accrual tracking
- bulk upload support
- control number generation

This makes it a practical internal finance operations tool for handling year-end accrual activity in a more consistent, auditable, and maintainable way than ad hoc spreadsheet-based processes.
