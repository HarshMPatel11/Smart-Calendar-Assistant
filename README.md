# Smart Calendar Assistant

Smart Calendar Assistant is a full-stack appointment scheduling application
built with the MERN stack and TypeScript. It allows users to book appointments
through a conversational assistant, check available time slots, manage
appointments, block unavailable periods, and view the complete schedule in
day, week, and month calendar formats.

The application also synchronizes calendar changes across open browser sessions
and prevents overlapping or simultaneous double bookings.

## Table of Contents

- [Project Objective](#project-objective)
- [Key Features](#key-features)
- [Approach in Brief](#approach-in-brief)
- [How the Application Works](#how-the-application-works)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Application Screenshots](#application-screenshots)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Commands](#available-commands)
- [Application Pages](#application-pages)
- [API Endpoints](#api-endpoints)
- [Scheduling and Conflict Prevention](#scheduling-and-conflict-prevention)
- [Validation and Error Handling](#validation-and-error-handling)
- [Future Improvements](#future-improvements)

## Project Objective

The objective of this project is to simplify appointment scheduling by
combining a conversational booking experience with a visual calendar and
reliable availability management.

The system is designed to:

- Reduce the manual effort required to schedule appointments.
- Help users find available time slots quickly.
- Prevent appointments from overlapping.
- Allow administrators to block unavailable periods.
- Keep calendar data synchronized across multiple browser sessions.
- Organize frontend, backend, and database logic in a maintainable structure.

## Key Features

### Conversational appointment booking

- Detects booking, availability, confirmation, greeting, and cancellation
  intents from user messages.
- Extracts a user's name, email address, phone number, purpose, date, and time.
- Understands common date expressions such as `today`, `tomorrow`,
  `next Monday`, and calendar dates.
- Accepts common 12-hour and 24-hour time formats.
- Requests missing booking details one field at a time.
- Displays a final appointment summary before saving the booking.

### Availability management

- Generates one-hour appointment slots from 9:00 AM to 6:00 PM.
- Checks existing appointments and administrator-blocked periods.
- Shows alternative slots when the requested time is unavailable.
- Excludes cancelled appointments from conflict checks.

### Appointment management

- Creates, displays, edits, deletes, confirms, and cancels appointments.
- Supports `pending`, `confirmed`, and `cancelled` appointment states.
- Provides upcoming appointment and appointment-statistics views.
- Stores optional phone numbers and notes along with booking information.

### Calendar and dashboard

- Provides day, week, and month calendar views.
- Visually distinguishes booked, available, and blocked periods.
- Includes a dashboard for schedule summaries and quick access to key actions.
- Provides individual appointment detail pages.

### Real-time synchronization

- Uses Socket.IO to broadcast calendar changes.
- Automatically refreshes calendar information in other open browser sessions
  after appointments or blocks are changed.

### Safe concurrent booking

- Uses a date-level database lock while creating appointments.
- Rechecks availability inside the lock before saving.
- Prevents two simultaneous requests from booking the same or overlapping time.

## Approach in Brief

- Divided the application into independent React client and Express server
  workspaces.
- Built reusable frontend pages, layouts, UI components, hooks, and API helpers.
- Created REST endpoints using routes, controllers, services, validation
  schemas, and Mongoose models.
- Implemented a rule-based conversational assistant to detect user intent and
  extract appointment details without requiring an external AI API.
- Centralized scheduling rules so both normal and conversational bookings use
  consistent overlap checks.
- Stored appointments, calendar blocks, counters, and temporary date locks in
  MongoDB.
- Used React Query for server-state fetching and cache management.
- Added Socket.IO events so all connected clients receive calendar updates.
- Used Zod, TypeScript, and centralized error handling to improve reliability.

## How the Application Works

1. A user opens the booking page and enters a natural-language request.
2. The assistant identifies the user's intent and extracts any booking details
   included in the message.
3. If required information is missing, the assistant asks a follow-up question.
4. The server checks appointments and calendar blocks for the selected date.
5. If the requested slot is occupied, the assistant returns available
   alternatives.
6. When all details are complete, the assistant shows a booking summary and
   requests confirmation.
7. On confirmation, the scheduling service obtains a date-level lock, checks
   for conflicts again, and saves the appointment.
8. The server broadcasts a calendar-change event through Socket.IO.
9. Connected clients refresh their calendar data and display the new booking.

## Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Radix UI components
- TanStack React Query
- Wouter
- React Hook Form
- Zod
- date-fns
- Socket.IO Client
- Recharts
- Framer Motion

### Backend

- Node.js
- Express 5
- TypeScript
- MongoDB
- Mongoose
- Socket.IO
- Zod
- Pino

### Development tools

- npm workspaces
- TSX for server watch mode
- Concurrently for running the client and server together
- TypeScript compiler for type checking and production builds

## System Architecture

```text
Browser / React Client
        |
        | REST API requests
        v
Express Routes
        |
        v
Controllers and Zod Validation
        |
        v
Scheduling / Real-time Services
        |
        v
Mongoose Models
        |
        v
MongoDB

Express Server -- Socket.IO events --> Connected React Clients
```

## Application Screenshots

<img width="1892" height="953" alt="image" src="https://github.com/user-attachments/assets/5640ea18-c347-43de-b042-ceae19693d76" />
<img width="1917" height="902" alt="image" src="https://github.com/user-attachments/assets/3edbca18-0b86-4e22-bf81-209c30f4a2fb" />
<img width="1901" height="902" alt="image" src="https://github.com/user-attachments/assets/55c8f0f1-169a-45ff-a81f-1438bfad3512" />
<img width="1907" height="901" alt="image" src="https://github.com/user-attachments/assets/f4c4d432-5459-447e-91af-8ca54726e31b" />

The frontend is responsible for presentation, navigation, forms, calendar
views, and server-state caching. The backend handles validation, conversational
processing, scheduling rules, persistence, and real-time event broadcasting.

## Project Structure

```text
smart-calendar-assistant/
|-- client/
|   |-- src/
|   |   |-- api/          # API client and generated request helpers
|   |   |-- components/   # Layout and reusable UI components
|   |   |-- hooks/        # Toast, mobile, and real-time calendar hooks
|   |   |-- lib/          # Shared frontend utilities
|   |   |-- pages/        # Dashboard, calendar, booking, and appointment pages
|   |   |-- App.tsx       # Routes and global providers
|   |   `-- main.tsx      # React application entry point
|   |-- package.json
|   `-- vite.config.ts
|-- server/
|   |-- src/
|   |   |-- config/       # Environment and database configuration
|   |   |-- controllers/  # Request-handling and conversational logic
|   |   |-- lib/          # Server utilities and logging
|   |   |-- middleware/   # Centralized error handling
|   |   |-- models/       # Mongoose database models
|   |   |-- routes/       # REST API route definitions
|   |   |-- services/     # Scheduling and Socket.IO services
|   |   |-- validation/   # Zod request schemas
|   |   |-- app.ts        # Express application configuration
|   |   `-- index.ts      # HTTP and Socket.IO server entry point
|   |-- package.json
|   `-- tsconfig.json
|-- .env.example
|-- package.json
`-- README.md
```

## Getting Started

### Prerequisites

Install the following software before running the project:

- Node.js 20 or later
- npm
- MongoDB Community Server or a MongoDB Atlas database

### Installation

1. Clone the repository and enter the project directory.

   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install all root, client, and server dependencies.

   ```bash
   npm install
   ```

3. Create the local environment file from the example.

   On macOS or Linux:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Update `MONGODB_URI` in `.env` if required.

5. Make sure the configured MongoDB instance is running.

6. Start the client and server in development mode.

   ```bash
   npm run dev
   ```

7. Open `http://localhost:5173` in a browser.

The Vite client runs on port `5173`, while the Express API and Socket.IO server
run on port `5000` by default.

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes | Local MongoDB URI in example file | MongoDB connection string |
| `PORT` | No | `5000` | Express and Socket.IO server port |
| `CLIENT_PORT` | No | `5173` | Client development port |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Origin allowed by CORS and Socket.IO |
| `VITE_API_URL` | No | `http://localhost:5000` | API URL used by the React client |

Do not commit real credentials or production database connection strings.

## Available Commands

Run these commands from the repository root:

| Command | Description |
| --- | --- |
| `npm install` | Installs dependencies for all npm workspaces |
| `npm run dev` | Starts the React and Express development servers |
| `npm run typecheck` | Type-checks both TypeScript projects |
| `npm run build` | Creates production client and server builds |
| `npm start` | Starts the compiled server and serves the client in production |

## Application Pages

| Route | Purpose |
| --- | --- |
| `/` | Dashboard and schedule overview |
| `/calendar` | Day, week, and month calendar |
| `/appointments` | Appointment list and management |
| `/appointments/:id` | Individual appointment details |
| `/book` | Conversational appointment-booking interface |

## API Endpoints

The API is served from the backend base URL, which is
`http://localhost:5000` by default.

### Appointments

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/appointments` | Lists appointments |
| `GET` | `/appointments/stats` | Returns appointment statistics |
| `GET` | `/appointments/upcoming` | Lists upcoming appointments |
| `GET` | `/appointments/:id` | Returns one appointment |
| `POST` | `/appointments` | Creates an appointment |
| `PATCH` | `/appointments/:id` | Updates an appointment |
| `PATCH` | `/appointments/:id/status` | Updates appointment status |
| `DELETE` | `/appointments/:id` | Deletes an appointment |

### Availability and assistant

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/availability` | Returns availability for a selected date |
| `POST` | `/ai/chat` | Processes conversational booking messages |

### Calendar blocks

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/blocks` | Lists blocked calendar periods |
| `POST` | `/blocks` | Creates an unavailable period |
| `DELETE` | `/blocks/:id` | Removes a blocked period |

### Health check

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/healthz` | Confirms that the API is running |

## Scheduling and Conflict Prevention

An appointment conflicts when its time range overlaps a non-cancelled
appointment or an administrator-created calendar block on the same date.

The server applies the following overlap rule:

```text
existing start < requested end
AND
existing end > requested start
```

Before an appointment is created, the scheduling service:

1. Obtains a temporary lock for the selected date.
2. Checks appointments and calendar blocks for overlapping time ranges.
3. Saves the appointment only when no conflict exists.
4. Releases the lock after the operation completes.

This second availability check protects the application when multiple users try
to reserve the same slot at nearly the same time.

## Validation and Error Handling

- Zod validates incoming request data.
- Mongoose schemas enforce required values, date and time formats, and allowed
  appointment statuses.
- TypeScript provides compile-time checks across the client and server.
- Invalid requests return structured API errors.
- Scheduling conflicts are rejected before data is written.
- A centralized Express error handler prevents unhandled errors from exposing
  internal implementation details.

## Future Improvements

- Add user and administrator authentication.
- Introduce role-based access control.
- Send email or SMS booking confirmations and reminders.
- Support configurable business hours and appointment durations.
- Add recurring appointments and recurring blocked periods.
- Add timezone-aware scheduling.
- Integrate Google Calendar or Microsoft Outlook Calendar.
- Add automated unit, integration, and end-to-end tests.
- Provide reporting and appointment-data export.
- Deploy the client, API, and database to production infrastructure.

## License

This project is licensed under the terms included in the [LICENSE](LICENSE)
file.
