# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layout, and API routes (see `app/api/*`).
- `src/components/canvas/`: React Three Fiber scene components and effects.
- `src/components/dom/`: UI panels and overlay elements.
- `src/store/`: Zustand state management.
- `src/constants/`, `src/helpers/`, `src/templates/`, `src/lib/`: shared data, utilities, and helpers.
- `public/`: static assets (images, icons, etc.).

## Build, Test, and Development Commands
- `npm run dev`: start the local Next.js dev server.
- `npm run build`: production build, then runs `deploy-pack.js`.
- `npm run start`: run the production server from `.next/`.
- `npm run lint`: lint `app/` with auto-fix via Next.js ESLint.
- `npm run analyze`: build with bundle analyzer enabled.

## Coding Style & Naming Conventions
- Formatting is enforced by Prettier (`tabWidth: 2`, single quotes, no semicolons, `printWidth: 120`).
- ESLint uses Next.js defaults plus Prettier; fix lint issues before pushing.
- Use `PascalCase` for component files (e.g., `CameraRig.jsx`), `camelCase` for hooks and utilities (e.g., `usePostprocess.jsx`).
- Prefer colocating UI in `src/components/dom/` and 3D scene code in `src/components/canvas/`.

## Testing Guidelines
- No automated test suite is configured. Use `npm run lint` and manual verification in dev.
- If you add tests, document the command in this file and keep test files near related code.

## Commit & Pull Request Guidelines
- Recent commits use short, descriptive summaries (often in Chinese). Keep messages concise and action-oriented.
- PRs should include: a clear summary, relevant screenshots/GIFs for UI/3D changes, and steps to verify.

## Configuration & Secrets
- Local secrets live in `.env.local` (e.g., API keys). Never commit secret files.
- If you add new config keys, update project docs and provide sane defaults.
