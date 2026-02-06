# Character Tinder

A Tinder-style image sorter for Google Drive photos. Swipe right to keep, left to discard, with the ability to undo.

## Tech Stack

- **Runtime**: Bun
- **Framework**: React 19 + TypeScript 5.9
- **Build**: Vite 7
- **Styling**: Tailwind CSS v4
- **State**: Zustand 5 with persist middleware
- **Testing**: Vitest 4 + React Testing Library + MSW 2
- **Auth**: Google OAuth 2.0

## Project Structure

```
src/
├── components/       # React components
├── stores/           # Zustand stores
│   └── authStore.ts  # Authentication state
├── hooks/            # Custom React hooks
│   └── useGooglePicker.ts  # Google Picker API wrapper
├── mocks/            # MSW handlers + Google Picker mock
│   ├── handlers.ts
│   ├── server.ts
│   └── googlePicker.ts     # Google Picker test mock
├── types/            # TypeScript declarations
│   └── google-picker.d.ts  # Google Picker API types
├── test/             # Test setup
│   └── setup.ts
└── App.tsx
```

## Commands

```bash
bun dev        # Start dev server
bun build      # Production build
bun test       # Run tests in watch mode
bun test:run   # Run tests once
bun lint       # Run ESLint
```

## Development Approach

This project follows **TDD (Test-Driven Development)**:
1. Write tests first (TEST tasks)
2. Implement code to pass tests (IMPL tasks)
3. Tests use MSW for API mocking

## Key Conventions

- Use **Zustand** for global state with `persist` middleware for persistence
- Use **MSW** to mock Google Drive API in tests
- Keep components small and focused
- Use Tailwind utility classes for styling

## Google Drive Integration

- OAuth 2.0 for authentication
- Google Picker API for native folder selection (source folders)
- Custom `DestinationFolderPicker` for destination folders (supports "Create new folder")
- API scopes: `drive` for full access (listing, copying, deleting)
- Requires: `VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_APP_ID` env vars for Picker API
- Workflow: Google Picker → Load images → Swipe → Copy "keep" images to destination folder
- `useGooglePicker` hook wraps Picker API with dynamic script loading
