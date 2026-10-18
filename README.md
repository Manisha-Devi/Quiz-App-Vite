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

The frontend uses same-origin `/api` routes for server-backed question-bank
features. Those features need the backend from the `server` branch to be
available through the same origin or a development proxy.
