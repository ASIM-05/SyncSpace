# SyncSpace collaboration server and Railway deployment

1. Create a Supabase project and run `supabase/schema.sql` in its SQL Editor.
2. Copy `.env.example` to `.env` and fill in the project URL, **service role** key, and allowed client URL. Never expose the service role key in the client or commit it.
3. Run `npm install` then `npm run dev` locally.
4. Create a Railway service with this `server` folder as its root. Railway runs `npm start` automatically. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CLIENT_ORIGIN` in Railway Variables; Railway supplies `PORT`.
5. Deploy the Vercel client and set Railway `CLIENT_ORIGIN` to its production URL. Use a comma-separated value if you also need local access, for example `https://your-app.vercel.app,http://localhost:5173`.

The server verifies Supabase access tokens for HTTP, Socket.IO, and Yjs WebSocket connections. Board and Yjs document state are persisted through Supabase Postgres.
