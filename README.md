# Infinite Tasks

A lightweight task management web app built with TypeScript, no frameworks required.

## Features

- Create multiple workspaces to organize your work
- Kanban board and list views per workspace
- Add, edit, and delete tasks with status tracking (Pending, In Progress, Done)
- Search workspaces from the sidebar
- All data persisted in `localStorage` — works fully offline

## Tech Stack

- TypeScript
- Vanilla HTML + CSS
- `localStorage` for persistence

## Running locally

Just open `index.html` in your browser — the pre-compiled bundle (`dist/main.js`) is included.

To recompile from TypeScript source:

```bash
npx tsc
```
