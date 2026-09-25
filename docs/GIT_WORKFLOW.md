# Git Workflow

This document defines the Git workflow used to maintain Spend Mosaic.

## Branches

`develop` is the integration branch. All regular work starts from `develop` and returns to `develop` through a Pull Request (PR). The `main` branch represents production-ready code.

| Branch type             | Source    | Target               | Purpose                 |
| ----------------------- | --------- | -------------------- | ----------------------- |
| `feature/<description>` | `develop` | `develop`            | New features            |
| `fix/<description>`     | `develop` | `develop`            | Regular bug fixes       |
| `hotfix/<description>`  | `main`    | `main` and `develop` | Urgent production fixes |
| `release/<version>`     | `develop` | `main` and `develop` | Release preparation     |

Use short, descriptive, lowercase names separated by hyphens. Documentation and maintenance work follow the same principle. For example, `docs/git-workflow` and `chore/update-tooling` start from `develop` and target `develop`.

## Pull Requests

- All changes must be integrated through a PR.
- Direct commits to `main` and `develop` are prohibited.
- Each PR must have a single purpose, a clear description, and the target branch defined in the table above.
- Before merge, update the branch with its target branch and obtain the approvals required by the repository.
- After merge, delete the remote branch and its local counterpart when they are no longer needed.

## Required validations

Run these commands from the repository root before merge:

```bash
npm run build:frontend
npm run lint -w frontend
```

Run all applicable tests when they exist, including backend tests once they are available. A PR may only be merged after every required validation succeeds, unless a pre-existing failure is clearly documented and approved in the PR.

## Commit convention

Use Conventional Commits in this format:

```text
<type>(<scope>): <description>
```

Common types include `feat`, `fix`, `docs`, `chore`, `refactor`, and `test`. The `scope` is optional and should identify the affected area. Write a short, objective description in the imperative mood.

Examples:

```text
feat(expenses): add category filter
fix(api): validate expense amount
docs(git): document branching workflow
```

## Releases

1. Create `release/<version>` from the latest `develop`, using a SemVer version such as `release/1.2.0`.
2. On the release branch, make only publication-related changes: update versions in the applicable manifests, synchronize the root `package-lock.json`, update the changelog and documentation, and apply final fixes.
3. Run every required validation and open a PR from `release/<version>` to `main`.
4. After merging into `main`, create and push an annotated tag on the release commit using `v<version>`, such as `v1.2.0`.
5. Merge the release back into `develop` through a PR, resolving conflicts without losing later changes.
6. Delete the release branch remotely and locally after both merges are complete.

The manifest versions, root `package-lock.json`, changelog, and tag must all represent the same version.

## Hotfixes

1. Create `hotfix/<description>` from the latest `main`.
2. Limit the branch to the urgent fix and any required version or documentation updates.
3. Run every required validation and open a PR to `main`.
4. After merging, create a new version tag when the hotfix results in a release.
5. Merge the same hotfix back into `develop` through a PR to prevent regressions.
6. Delete the hotfix branch remotely and locally after the merges into `main` and `develop` are complete.

## Dependencies and lockfile

This repository uses npm workspaces. Install and update dependencies from the repository root, and keep only the root `package-lock.json`. Do not create or commit a `package-lock.json` inside `frontend/`, `backend/`, or any other workspace.
