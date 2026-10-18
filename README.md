# Quiz App — Server Branch

This branch contains the Express question-bank API. The frontend lives on the
`main` branch. The server uses the bundled question files in `public/json/` and
stores imported question-bank data in `data/question-bank.json` by default.

## Run

```sh
npm install
npm run dev
```

The API listens on port `5000` by default. Set `PORT` to use a different port,
or `LOWDB_FILE` to choose a different database file.

## API

- `GET /api/health`
- `GET /api/question-bank`
- `POST /api/question-bank/import-bundled`
- `POST /api/question-bank/import`
- `POST /api/question-bank/select`
