# Quiz App — Frontend (`main`)

This branch contains the React/Vite quiz interface. The Express question-bank
API is kept separately on the `server` branch.

## Run

```sh
npm install
npm run dev
```

The frontend runs on port `5000`. To create a production build, use
`npm run build`; use `npm run preview` to preview that build.

In this Replit workspace, `Backend API` runs the `server` branch from
`.server-worktree` on port `8000`. `Start application` runs Vite on port `5000`
and forwards `/api` requests to the backend. The bundled question banks can be
synced from the Server Data page.

Production still needs the backend to be deployed and `/api` routed to it on the
same origin.
