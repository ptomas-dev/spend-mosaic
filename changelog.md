# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Added repository instructions for GitHub Copilot.
- Connected the expenses page to the backend for listing and creating expenses.
- Added a Vite development proxy for the expenses API.
- Added income model and API endpoints for listing and creating income.
- Connected the income page to the backend and added its Vite development proxy.

### Security

- Updated locked versions of React Router to 6.30.6 and nanoid to 3.3.18 to address npm audit vulnerabilities.
- Updated `react-router-dom` to `^7.18.4` to address GHSA-wrjc-x8rr-h8h6 and GHSA-337j-9hxr-rhxg.

## [0.1.4] - 2026-08-03

### Changed

- Migrated repository dependency management to npm workspaces (`backend` and `frontend`) via the root `package.json`.
- Added workspace scripts at root level to run app commands without changing directories:
  - `npm run dev:backend`
  - `npm run dev:frontend`
  - `npm run build:frontend`
- Updated backend `express` from `4.21.1` to `^5.2.1`.
- Updated frontend `vite` from `^5.4.1` to `^6.4.3`.
- Refreshed dependency lock data as part of the workspace migration and vulnerability fixes.

### Removed

- Removed invalid self-referential `file:` dependencies from package manifests (`spend-mosaic`, `backend`, `frontend`).
- Removed workspace-local lockfiles (`backend/package-lock.json` and `frontend/package-lock.json`) in favor of a single root lockfile.

### Security

- Applied dependency and lockfile updates to address npm audit vulnerabilities.
- Regenerated root lockfile after the Vite upgrade, including updated `esbuild` transitive packages.

### Changed

- Migrated repository dependency management to npm workspaces (`backend` and `frontend`) via the root `package.json`.
- Added workspace scripts at root level to run app commands without changing directories:
  - `npm run dev:backend`
  - `npm run dev:frontend`
  - `npm run build:frontend`
- Updated backend `express` from `4.21.1` to `^5.2.1`.
- Updated frontend `vite` from `^5.4.1` to `^6.4.3`.
- Refreshed dependency lock data as part of the workspace migration and vulnerability fixes.

### Removed

- Removed invalid self-referential `file:` dependencies from package manifests (`spend-mosaic`, `backend`, `frontend`).
- Removed workspace-local lockfiles (`backend/package-lock.json` and `frontend/package-lock.json`) in favor of a single root lockfile.

### Security

- Applied dependency and lockfile updates to address npm audit vulnerabilities.
- Regenerated root lockfile after the Vite upgrade, including updated `esbuild` transitive packages.

## [0.1.3] - 2024-11-13

### Added

- Added PostgreSQL database support using Sequelize ORM
- Refactored backend to a modular structure with:
  - Separate routes for each resource type
  - Controllers to handle CRUD operations
- Updated server startup to wait for successful database synchronization before listening to requests
- Implemented .env file for managing sensitive database connection settings

Note: Database must be run separately from the project, with the connection managed through environment variables

## [0.1.2] - 2024-11-5

### Added

- Setup basic CRUD operations for expenses.
- Initial project setup.
- Basic frontend and backend integration.
- Add base app layout.

## [0.1.1] - 2024-10-31

- Fix backend not starting - update package.json
- Rename app - change all references to prior name of the app

## [0.1.0] - 2024-07-01

### Added

- Basic project setup with initial configurations.
- Setup frontend and backend base structure.

## [0.0.1] - 2024-06-15

### Added

- Project initialization.
