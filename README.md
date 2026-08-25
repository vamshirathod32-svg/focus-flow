# Focus Flow

A Pomodoro timer that remembers your grind.

Focus Flow is a small, dependency-free web app for running focus/break
cycles, tracking tasks, and seeing how many focus sessions you've completed
over the past week. Everything is stored locally in the browser via
`localStorage` — no backend, no build step.

## Features

- **Focus / Short break / Long break** timer modes with a circular progress ring
- **Custom durations** — click the ⚙ icon to set your own focus/break lengths (persisted across sessions)
- **Task list** — add tasks, mark them done, and track pomodoros completed per task
- **Weekly stats** — a bar chart of focus sessions completed over the last 7 days
- **Browser notifications** when a session ends (if permission is granted)

## Running it

No build step or dependencies required. Either:

- Open `index.html` directly in a browser, or
- Serve the folder locally, e.g.:

  ```bash
  python3 -m http.server 8000
  ```

  then visit `http://localhost:8000`.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | App markup |
| `style.css` | Styling |
| `app.js` | Timer, task, and stats logic |
