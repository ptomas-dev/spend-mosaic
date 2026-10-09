# Project Guidelines

## Architecture

- This is an npm workspaces monorepo. Keep frontend work in `frontend/` and API/database work in `backend/`.
- The frontend is React 18, TypeScript, Vite, React Router, and Tailwind CSS.
- The backend is JavaScript, Express 5, Sequelize, and PostgreSQL. Preserve the controller, route, model, and config separation under `backend/src/`.
- Use the root `package-lock.json`; do not add workspace-local lockfiles.

## Commands

- Install dependencies from the repository root: `npm install`.
- Run the frontend: `npm run dev:frontend`.
- Run the backend: `npm run dev:backend`.
- Validate frontend changes with `npm run build:frontend` and `npm run lint -w frontend`.
- The backend test script is currently a placeholder. Do not claim it passes or use it as validation.

## Conventions

- Follow the existing component/page directory structure and colocated `index.ts` exports in the frontend.
- Do not commit secrets or `.env` files. Backend database settings are supplied through environment variables.
- Keep changes focused; update `README.md` or `changelog.md` when a user-facing workflow or release-relevant behavior changes.
- Before changing dependencies, inspect the root workspace manifest and preserve the single-lockfile workspace setup.

## Language

- Write all project documentation, application text (including labels, messages, and errors), code comments, commit messages, PR descriptions, and other project content in English, even when the user communicates in Portuguese or another language.
- Conversational replies may follow the user's language; this does not change the English requirement for project content.

## Git Flow

- Use Git Flow: branch feature work from `develop` as `feature/<description>` and merge it back into `develop` when complete.
- Create `release/<version>` branches from `develop` to prepare a release; merge completed releases into both `main` and `develop`.
- Create urgent production fixes from `main` as `hotfix/<description>`; merge completed hotfixes into both `main` and `develop`.
- Do not commit directly to `main` or `develop`; keep pull requests focused on one branch's purpose.
- Use Conventional Commits for commit messages: `<type>(<scope>): <description>`. Use `feat`, `fix`, `docs`, `chore`, `refactor`, or `test` as appropriate; the scope is optional.
