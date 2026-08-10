# Expense Tracker - Project Context

## Project Overview

This project is a mobile application built using **React Native (Expo)** and **TypeScript**.

The purpose of this application is to help users quickly record their daily expenses and understand where their money is being spent.

The primary goal is **speed, simplicity, and excellent user experience**, not feature richness.

The application should feel lightweight, modern, and intuitive.

---

# Product Vision

Users should be able to record an expense within **5-10 seconds**.

Instead of functioning as a complete accounting application, this app focuses on helping users build a daily expense tracking habit.

Every design and development decision should prioritize:

- Simplicity
- Minimal user interaction
- Clean interface
- Fast performance
- Easy maintenance
- Scalable architecture

---

# Version 1 Scope (MVP)

Version 1 ONLY supports expense tracking.

Features included:

- Add Expense
- Edit Expense
- Delete Expense
- View Expense History
- Search Expenses
- Filter Expenses
- Dashboard
- Monthly Summary
- Category-wise Summary
- Local Storage
- Basic Analytics

Features NOT included:

- Income Tracking
- Budget Planning
- Bank Integration
- UPI Integration
- Authentication
- Cloud Sync
- Notifications
- OCR Receipt Scanning
- AI Categorization
- Multiple Wallets
- Export PDF
- Backup
- Multi-user Support

Avoid implementing future features unless explicitly requested.

---

# Target Users

Primary users include:

- Students
- Working Professionals
- Individuals managing personal expenses

The app is designed for users who simply want to know:

- How much did I spend today?
- How much did I spend this month?
- Where is my money going?
- Which category consumes the highest amount?

---

# Design Philosophy

The application should follow these principles:

Minimalistic

Modern

Fast

Responsive

Easy to understand

Avoid clutter.

Every screen should have a single clear purpose.

White space is encouraged.

Use smooth animations sparingly.

---

# User Journey

Dashboard

↓

Tap "+" button

↓

Enter Amount

↓

Select Category

↓

(Optional) Add Note

↓

Save

↓

Dashboard updates instantly

The complete flow should take less than 10 seconds.

---

# Core Screens

1. Dashboard

Display:

Today's Spending

This Month Spending

Recent Expenses

Quick Add Button

Category Breakdown

2. Add Expense

Fields:

Amount

Category

Date

Time

Optional Note

Save Button

3. Edit Expense

Pre-filled values

Update Button

Delete Option

4. History

Expense list

Search

Filter

Grouped by date

5. Analytics

Monthly spending

Category distribution

Simple charts

6. Settings

Theme (future-ready)

Currency

About

App Version

---

# Categories

Initial categories:

Food

Transport

Shopping

Bills

Entertainment

Health

Education

Travel

Groceries

Others

Categories should be configurable in future versions.

---

# Data Model

Expense

- id
- amount
- category
- note
- date
- createdAt
- updatedAt

Use TypeScript interfaces for all models.

---

# Storage

Version 1 uses local storage only.

Technology:

AsyncStorage

No backend.

No API.

No cloud database.

The storage layer should be abstracted so it can be replaced by SQLite or Firebase later.

---

# Architecture

Follow a scalable folder structure.

src/

components/

screens/

navigation/

hooks/

services/

storage/

models/

constants/

utils/

types/

theme/

Keep business logic outside UI components.

---

# UI Guidelines

Design style:

Modern

Rounded corners

Soft shadows

Minimal colors

Readable typography

Spacing consistency

Primary Color:

Purple

Accent:

Blue

Background:

White

Cards:

Rounded

Buttons:

Filled

Icons:

Minimal outline icons

Avoid overcrowded screens.

---

# Navigation

Bottom Navigation

Dashboard

History

Add Expense

Analytics

Settings

Navigation should be smooth and maintain state.

---

# Coding Standards

Use TypeScript everywhere.

Avoid using "any".

Use reusable components.

Prefer functional components.

Use hooks.

Keep files small.

Separate UI from business logic.

Avoid duplicate code.

Write readable code over clever code.

Follow SOLID principles where applicable.

---

# Naming Conventions

Components:

PascalCase

Example:

ExpenseCard.tsx

Hooks:

useExpense.ts

Utilities:

currencyFormatter.ts

Constants:

colors.ts

Interfaces:

Expense.ts

Screens:

DashboardScreen.tsx

---

# State Management

Version 1

Use React Context + Hooks.

Do not introduce Redux unless required.

Keep state simple.

---

# Performance Expectations

The app should:

Load quickly

Avoid unnecessary re-renders

Use memoization only when beneficial

Lazy load screens when appropriate

Avoid unnecessary libraries

---

# Error Handling

Handle:

Invalid amount

Empty category

Storage failures

Corrupted local data

Unexpected exceptions

Always show user-friendly error messages.

---

# Accessibility

Use readable font sizes.

Support dark mode later.

Buttons should have sufficient touch area.

Use semantic labels where possible.

---

# Future Roadmap (Not for Version 1)

Version 2

Income Tracking

Budgets

Savings Goals

Recurring Expenses

Recurring Income

Monthly Reports

Dark Mode

Version 3

Authentication

Cloud Sync

Firebase

Family Sharing

Export PDF

CSV Export

Version 4

AI Expense Categorization

Receipt OCR

Voice Input

Financial Insights

Spending Predictions

Smart Suggestions

---

# AI Development Guidelines

When generating code:

- Prefer reusable components.
- Keep components under ~250 lines where practical.
- Avoid hardcoding values.
- Use constants for repeated values.
- Create utility functions instead of duplicating logic.
- Write self-documenting code.
- Add comments only where they clarify non-obvious logic.
- Ensure the app compiles after every feature.
- Do not introduce unnecessary dependencies.
- Preserve existing architecture when adding features.

Always prioritize maintainability over speed of implementation.

---

# Project Goal

Build an elegant, scalable, production-ready expense tracker that delivers an exceptional user experience through simplicity.

The focus of Version 1 is to establish a solid foundation. Every new feature should be evaluated against one question:

**"Does this make recording and understanding expenses faster or easier?"**

If the answer is no, it belongs in a future version, not the MVP.
