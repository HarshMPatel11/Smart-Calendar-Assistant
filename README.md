# Smart Calendar Assistant

A MERN appointment-booking application with a React/Vite client and an
Express/Mongoose API.

## Local setup

1. Install Node.js and run `npm install` from the repository root.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` to a local MongoDB instance or MongoDB Atlas connection.
4. Run `npm run dev`.

The React client runs at `http://localhost:5173` and proxies `/api` requests to
the Express server at `http://localhost:5000`.

## Features

- Conversational appointment booking with date, time, intent, and contact-detail extraction
- Availability checks, alternative slot suggestions, and overlap prevention
- Live day, week, and month calendar views
- Booked, available, and administrator-blocked time visualization
- Cross-browser calendar synchronization over Socket.IO
- Date-level booking serialization to prevent simultaneous double bookings

## Commands

- `npm run dev` starts the client and server in watch mode.
- `npm run typecheck` checks both TypeScript projects.
- `npm run build` creates the production client and server builds.
- `npm start` serves the built API and, in production mode, the built client.

## Structure

```text
client/   React UI, generated API hooks, and Vite configuration
server/   Express routes, controllers, Mongoose models, and database setup
```



<img width="1892" height="953" alt="image" src="https://github.com/user-attachments/assets/5640ea18-c347-43de-b042-ceae19693d76" />




