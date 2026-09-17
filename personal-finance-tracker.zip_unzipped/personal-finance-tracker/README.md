# FinTrack — Personal Finance & Expense Tracker

A full-stack personal finance dashboard: track income and expenses, set
category budgets, chase savings goals, and see everything on one glassmorphism
dashboard — built with vanilla HTML/CSS/JS on the front end and
Node.js + Express + MySQL on the back end.

![stack](https://img.shields.io/badge/stack-Node.js%20%7C%20Express%20%7C%20MySQL%20%7C%20Vanilla%20JS-7B6EF6)

## Features

- 🔐 Secure registration & login (bcrypt password hashing, JWT auth)
- 💳 Add / edit / delete income and expense transactions
- 🏷️ Expense categories: Food, Travel, Shopping, Education, Bills, Others
  (income categories: Salary, Freelance, Business, Investment, Other)
- 📅 Monthly and yearly tracking with a period switch on the dashboard
- 🎯 Per-category monthly budgets with live spent/remaining progress bars
- 🏆 Financial goals with progress bars and quick "add funds" contributions
- 📊 Dashboard: total income, total expense, net savings, remaining budget
- 📈 Interactive charts (Chart.js): expense-by-category doughnut, income vs.
  expense trend bar chart
- 🔎 Filter transactions by type, category, and date range; free-text search
- 📁 One-click CSV export of all transactions
- 🌗 Dark / light mode toggle (persisted per browser)
- 📱 Fully responsive — collapsible sidebar and stacked layout on mobile
- 🛡️ Server-side validation (express-validator), rate limiting on auth
  routes, Helmet security headers, parameterized SQL queries throughout

## Project structure

```
personal-finance-tracker/
├── backend/
│   ├── config/
│   │   └── db.js                 # MySQL connection pool
│   ├── controllers/               # Route handlers (business logic)
│   │   ├── authController.js
│   │   ├── transactionController.js
│   │   ├── budgetController.js
│   │   ├── goalController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT verification
│   │   ├── validateMiddleware.js  # express-validator error handler
│   │   └── errorMiddleware.js     # 404 + centralized error handler
│   ├── routes/                    # Express routers per resource
│   ├── utils/
│   │   ├── constants.js           # Shared category lists + validator
│   │   └── generateToken.js       # JWT signing helper
│   ├── .env.example               # Copy to .env and fill in your values
│   ├── package.json
│   └── server.js                  # App entry point (serves API + frontend)
├── frontend/
│   ├── index.html                 # Login / register page
│   ├── dashboard.html             # Main app shell (4 views + modals)
│   ├── css/
│   │   ├── style.css              # Design system, layout, components
│   │   └── auth.css               # Login/register page styling
│   └── js/
│       ├── api.js                 # fetch wrapper, session, formatting
│       ├── theme.js                # dark/light toggle
│       ├── auth.js                 # login/register form logic
│       ├── charts.js               # Chart.js rendering
│       ├── transactions.js         # transaction CRUD, filters, search, CSV
│       ├── budgets.js              # budget cards, set/delete budget
│       ├── goals.js                # goal cards, create/edit/contribute
│       └── dashboard.js            # nav, modals, dashboard view logic
├── database/
│   └── schema.sql                 # Full MySQL schema (run once)
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [MySQL](https://dev.mysql.com/downloads/) 8.0 or later (a local install,
  or any reachable MySQL server)

## Setup — run it locally

Follow these steps on your machine to run the project locally.

### 1) Install MySQL and create the database

Make sure MySQL 8.0+ is installed and running. Then run the schema file to create the app database:

```bash
mysql -u root -p < database/schema.sql
```

If you are using MySQL Workbench, phpMyAdmin, or a GUI client, you can also paste the contents of `database/schema.sql` there instead.

### 2) Configure the backend

Go into the backend folder and create a local `.env` file from the example:

```bash
cd backend
copy .env.example .env
```

Open `.env` and update your local values:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=finance_tracker

JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d

CLIENT_URL=*
```

Important:
- `DB_PASSWORD` must be your actual local MySQL root password.
- `JWT_SECRET` should be a long random string.

You can generate a random JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3) Install project dependencies

From the backend folder:

```bash
npm install
```

### 4) Start the project

```bash
npm start
```

If the app starts correctly, you should see:

```bash
MySQL connected successfully
Server running at http://localhost:5000
```

For auto-restart while developing, use:

```bash
npm run dev
```

### 5) Open the app in the browser

Visit:

```text
http://localhost:5000
```

You can then register a new user, log in, and use the finance tracker.

## How it's wired together

- The frontend is plain HTML/CSS/JS with **no build step and no framework**
  — every file in `frontend/` is served as-is by Express's static middleware.
- Authentication uses **JWT bearer tokens**: on login/register the API
  returns a token, which the frontend stores in `localStorage` and sends
  as an `Authorization: Bearer <token>` header on every subsequent request
  (see `frontend/js/api.js`).
- All amounts are stored as `DECIMAL(12,2)` in MySQL to avoid floating-point
  rounding issues with money.
- Categories are validated in the application layer
  (`backend/utils/constants.js`) rather than as a database `ENUM`, so you
  can add or rename categories without a migration — just update that file
  (and the matching `CATEGORIES` object in `frontend/js/api.js`).
- Budgets are keyed by `(user_id, category, month, year)` with a unique
  constraint, so setting a budget for a category that already has one that
  month **updates** it instead of creating a duplicate.

## REST API reference

All routes except `/api/auth/register` and `/api/auth/login` require an
`Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, receive a JWT |
| GET | `/api/auth/me` | Get the current user |
| GET | `/api/transactions` | List transactions (supports `type`, `category`, `startDate`, `endDate`, `month`, `year`, `search`, `page`, `limit`) |
| POST | `/api/transactions` | Create a transaction |
| GET | `/api/transactions/:id` | Get one transaction |
| PUT | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| GET | `/api/transactions/export/csv` | Download all transactions as CSV |
| GET | `/api/transactions/summary` | Yearly totals, category breakdown, monthly trend |
| GET | `/api/budgets?month=&year=` | List budgets for a month, with spent/remaining |
| POST | `/api/budgets` | Create or update a budget |
| DELETE | `/api/budgets/:id` | Delete a budget |
| GET | `/api/goals` | List financial goals with progress |
| POST | `/api/goals` | Create a goal |
| PUT | `/api/goals/:id` | Update a goal (name, target, current amount, deadline) |
| DELETE | `/api/goals/:id` | Delete a goal |
| GET | `/api/dashboard?month=&year=` | Dashboard summary for a given period |

## Security notes

- Passwords are hashed with **bcrypt** (10 salt rounds) — never stored or
  logged in plain text.
- Every transaction/budget/goal query is scoped to `req.user.id`, so one
  user can never read or modify another user's data.
- All SQL queries use parameterized placeholders (`?`) — no string
  concatenation, so the app is not vulnerable to SQL injection.
- **Helmet** sets standard security headers; **express-rate-limit** throttles
  the auth endpoints (30 requests / 15 minutes) against brute-forcing.
- Input is validated server-side with **express-validator** on every
  write endpoint — the frontend's own validation is a UX convenience, not
  the security boundary.

## Troubleshooting

- **`MySQL connection failed`** on startup — check that MySQL is running
  and that the credentials in `backend/.env` are correct. Test manually
  with `mysql -u <user> -p -h <host>`.
- **Port 5000 already in use** — change `PORT` in `.env`, or stop whatever
  else is using it.
- **Charts don't render** — the app loads Chart.js from a CDN
  (`cdn.jsdelivr.net`); make sure the machine running it has internet
  access, or swap in a locally-hosted copy of Chart.js.
- **Google Fonts don't load** — same as above; the app falls back to
  system fonts automatically if `fonts.googleapis.com` is unreachable.

## License

MIT — use it, modify it, ship it.
