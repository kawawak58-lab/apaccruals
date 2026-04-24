# Year-End Accrual System Client Overview

## 1. Introduction

The Year-End Accrual System is a web-based finance workspace designed to make the accrual process more structured, more consistent, and easier to manage.

Instead of relying on scattered files, manual follow-ups, and spreadsheet-based tracking, the system provides one central place where users can prepare accrual requests and where administrators can oversee the overall process.

This document is written for client and business stakeholders. It focuses on the process, user experience, business value, and development direction rather than the technical implementation.

## 2. Project Goal

The main goal of the system is to support year-end accrual handling through a guided and controlled workflow.

The solution was designed to help the organization:

- standardize how accrual requests are prepared and submitted
- reduce manual encoding and inconsistent entries
- make supporting reference data easier to manage
- improve visibility of submitted accruals
- control when filing is open or closed
- create a more reliable and auditable finance process

In practical terms, the system aims to turn a process that is often manual and difficult to monitor into a cleaner, more manageable digital workflow.

## 3. Development Idea

The overall development idea behind the system is simple:

- make the process easy for requestors
- make the controls clear for finance administrators
- reduce avoidable errors before submission
- keep the workflow traceable from submission to review

The application was planned as an internal business tool, not just a form. That means it was designed to combine:

- request creation
- record monitoring
- maintenance of supporting data
- approval support for missing references
- user access management
- filing window control
- internal announcements and guidance

The intention is to support both day-to-day usability and finance governance at the same time.

## 4. Who the System Is For

The system supports two broad groups of users.

### 4.1 End Users

These are the employees or requestors who prepare and submit accrual entries.

They need a simple way to:

- sign in
- create accrual requests
- use approved lookup values
- review their submitted records
- cancel eligible requests when needed

### 4.2 Administrators

These are the finance or system administrators responsible for maintaining control over the process.

They need tools to:

- manage lookup data
- manage user access
- monitor all submitted accruals
- approve missing supplier requests
- control the filing period
- communicate important announcements to users

## 5. Business Process View

At a high level, the system supports the following business flow:

1. the user signs in to the workspace
2. the user prepares an accrual request using guided fields and approved lookup values
3. the system checks the entry before allowing submission
4. the request is saved and assigned a control number
5. the user can review the submitted request later
6. administrators can monitor all requests and maintain the supporting setup behind them

This makes the process clearer for both the requestor and the finance team.

## 6. Core User Journey

### 6.1 Sign-In and Access

Users enter the system through a simple login flow. Once inside, they see only the functions relevant to their role.

This keeps the interface focused and avoids exposing unnecessary administrative options to standard users.

### 6.2 Create an Accrual

The main user task is to create an accrual request.

The system guides the user through:

- entering the main request details
- selecting reference values from maintained lists
- adding one or more accounting line items
- reviewing required information before submission

The experience is intended to be guided rather than open-ended, so users are less likely to submit incomplete or inconsistent requests.

### 6.3 Receive a Control Number

Once submitted, the accrual is given a control number that can be used for tracking and reference.

This gives users and administrators a common identifier for follow-up and monitoring.

### 6.4 Review Submitted Requests

Users can return to view their submitted accruals. This improves transparency and reduces the need for manual follow-up just to confirm whether a request was submitted successfully.

### 6.5 Cancel When Necessary

If a request needs to be withdrawn, the system supports cancellation with proper remarks.

This preserves visibility and accountability instead of allowing silent deletion or informal adjustment outside the process.

## 7. Full Feature Overview

This section summarizes the main features in business terms.

### 7.1 Dashboard and Navigation

The system provides a role-based workspace with:

- a clear menu structure
- page-level organization for key tasks
- separate access for standard users and administrators

This helps users go directly to the functions relevant to them.

### 7.2 New Accrual Creation

This is the main transaction area of the system.

Users can:

- complete the main accrual request information
- add one or multiple accounting line items
- use maintained lookup data instead of typing everything manually
- review the request before submission

This supports more accurate and complete requests.

### 7.3 Draft Saving

While users are preparing an accrual, the system can retain in-progress work so it is less likely to be lost during interruptions or page refresh.

This helps users continue their work without needing to start over.

### 7.4 Validation Before Submission

The system checks required information before allowing submission.

This helps reduce incomplete, inconsistent, or invalid requests before they reach the finance team.

### 7.5 Accrual Monitoring

The All Accruals view allows users and administrators to review submitted records.

Depending on access level, this can include:

- reviewing submitted accruals
- searching records
- filtering by status or date
- opening details of a specific request
- checking cancellation remarks when applicable

This improves visibility and follow-up across the process.

### 7.6 Cancellation Process

Eligible requests can be cancelled through the system with a reason provided by the user.

This supports proper documentation and avoids untracked manual removal of entries.

### 7.7 Filing Window Control

Administrators can control when accrual filing is open or closed.

This allows the business to:

- define the working period for accrual submission
- prevent submissions outside the intended schedule
- communicate process status more clearly
- support submission deadline reminders before cutoff

### 7.8 Master Data Maintenance

The system includes maintenance areas for the reference data used across the application, such as:

- companies
- expense classifications
- suppliers
- GL accounts
- profit centers
- transaction types
- tax codes

This helps keep the process standardized and reduces user guesswork during submission.

### 7.9 Supplier Enrollment Support

If a user cannot find the supplier they need, the system provides a controlled request path instead of forcing a workaround.

This allows:

- users to request missing suppliers
- administrators to review and approve those requests
- supplier records to be added in a controlled way

This keeps master data cleaner while still supporting operational flexibility.

### 7.10 User Administration

Administrators can review users and assign the correct access role.

This supports:

- proper access control
- role-based visibility
- easier administration as usage grows

### 7.11 Announcements

The system includes an announcement feature so important updates can be shown directly inside the workspace and on the login experience.

This is useful for:

- process reminders
- filing notices
- rollout updates
- important operational messages

### 7.12 Bulk Upload Features

Bulk upload is an important productivity feature across the system.

It allows administrators and users, where applicable, to upload structured files instead of entering every item manually.

Supported upload use cases include:

- maintenance data upload
- reference list upload
- accrual-related upload processes

The upload experience is designed to support:

- template-based preparation
- file selection
- preview before final upload
- row-level validation
- upload progress feedback

This helps reduce repetitive encoding and speeds up high-volume work.

### 7.13 Export Support

The system can also support exporting records for review and reporting purposes.

This is useful for:

- reconciliation
- offline review
- reporting
- process follow-up

## 8. Administrative Process Support

A major part of the system's value is that it does not stop at request submission. It also supports the operational controls around the process.

### 8.1 Master Data Management

Administrators can maintain the reference lists used throughout the application, such as:

- companies
- expense classifications
- suppliers
- GL accounts
- profit centers
- transaction types
- tax codes

This ensures that users work from approved values and that the process remains consistent over time.

### 8.2 Filing Window Control

The system allows administrators to define when accrual filing is open.

This supports business discipline by ensuring that requests are submitted only during the intended period.

### 8.3 User Administration

Administrators can review users and assign the correct access level. This helps ensure that the right people have the right level of visibility and control.

### 8.4 Supplier Enrollment Support

If a required supplier is not yet available, the system provides a controlled request path instead of forcing users to work around the issue manually.

This helps maintain cleaner master data while still supporting operational needs.

### 8.5 Announcements and Communication

The system also includes an announcement feature so important updates can be shown directly inside the workspace or on the login experience.

This supports change communication, reminders, and rollout messaging without relying only on separate email chains.

## 9. Upload and Data Handling Experience

One of the practical strengths of the system is that it does not rely only on manual entry.

For areas where larger volumes of information need to be maintained, the solution supports upload-driven workflows.

From a client perspective, this means:

- faster maintenance of reference lists
- less repetitive manual entry
- easier preparation through templates
- more confidence through pre-upload checking

This is especially useful for finance teams managing recurring or higher-volume data preparation tasks.

## 10. Design Direction

The solution is being shaped around a few practical design principles:

- clear and guided user flow
- minimal confusion during data entry
- strong separation between user tasks and admin tasks
- simple language where possible
- visibility of important process status
- faster access to the most common actions
- guided form tips for complex fields
- better mobile-friendly review screens

The design direction is not only about appearance. It is also about making the system easier to understand and easier to adopt.

## 11. Expected Business Value

From a client and operational perspective, the system is expected to provide value in the following ways:

- better consistency in submitted accrual data
- reduced manual follow-up and clarification
- more organized monitoring of requests
- clearer ownership and control across the process
- easier maintenance of supporting records
- faster handling of recurring data tasks through upload support
- stronger visibility of deadlines, status, and key updates
- a more professional and sustainable workflow compared with ad hoc spreadsheet handling

## 12. Future-Friendly Approach

The system is also being developed with growth in mind.

That means the structure supports further refinement such as:

- additional process controls
- richer reporting views
- improved communication experiences
- more polished workflow guidance
- expanded upload and review capabilities
- safer retry or resume handling for interrupted uploads
- rollback options for failed bulk upload batches
- enhancements to usability based on client feedback

The intention is to create a foundation that can continue improving as operational needs become clearer.

## 13. Summary

The Year-End Accrual System is intended to be more than a submission form. It is a structured finance operations tool designed to support the full accrual process from preparation to monitoring and control.

For end users, it aims to make submission easier and clearer.

For administrators, it aims to provide the tools needed to maintain data quality, manage access, control timing, communicate updates, and oversee the process.

For the business overall, it creates a more organized, transparent, and maintainable way to handle year-end accrual activity, while also supporting faster work through uploads, better visibility through monitoring, and stronger governance through controlled administration.
