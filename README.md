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



<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/f4a9432a-1795-44fe-9a55-99ad081f46bd" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/e3668667-5f46-4e3c-8914-b7d4c574b093" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/75a24ad9-60cf-439a-866c-0b93e7c3b561" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/9415c2cc-b119-4048-a0d7-4b902eceb74c" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/e228d2c5-80c0-4f5f-94cc-db48d81292c3" />




