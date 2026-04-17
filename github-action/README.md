# RepoDoc Docs Check — GitHub Action

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-RepoDoc%20Docs%20Check-blue?logo=github)](https://github.com/marketplace/actions/repodoc-docs-check)

**Automatically checks if your README is in sync with your code on every PR or push.**

RepoDoc analyzes your repository's actual source code — dependencies, routes, env vars, scripts — and detects when your documentation may have become outdated.

## Usage

```yaml
name: Docs Check
on:
  push:
    branches: [main]
  pull_request:

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: repodoc/docs-check@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          repodoc-api-key: ${{ secrets.REPODOC_API_KEY }}
```

Add `REPODOC_API_KEY` to your repo secrets from **[repodoc.vercel.app/settings](https://repodoc.vercel.app/settings)**.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `repo-token` | ✅ | — | `${{ secrets.GITHUB_TOKEN }}` — used to post PR comments |
| `repodoc-api-key` | ✅ | — | Your RepoDoc API key from `/settings` |
| `fail-on-drift` | ❌ | `false` | Set to `true` to fail CI when drift is detected |
| `drift-threshold` | ❌ | `70` | Score below which to warn (0–100) |
| `post-comment` | ❌ | `true` | Set to `false` to disable PR comments |

## Outputs

| Output | Description |
|--------|-------------|
| `drift-score` | Documentation drift score (0–100). 100 = fully in sync. |
| `status` | `in-sync` \| `minor-drift` \| `moderate-drift` \| `major-drift` |
| `summary` | Human-readable summary of what changed |

## Example: Strict Mode (fail CI on drift)

```yaml
- uses: repodoc/docs-check@v1
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    repodoc-api-key: ${{ secrets.REPODOC_API_KEY }}
    fail-on-drift: 'true'
    drift-threshold: '80'
```

## How It Works

1. On every push/PR, this action calls the RepoDoc API with your repo name
2. RepoDoc checks your current README against the latest codebase snapshot
3. A drift score is calculated (100 = in sync, lower = more drift)
4. If drift is detected below your threshold:
   - A warning is posted to the CI logs
   - A comment is posted on the PR (if it's a PR event)
   - Optionally fails the CI check (`fail-on-drift: true`)

## Getting Your API Key

1. Sign in at [repodoc.vercel.app](https://repodoc.vercel.app) with GitHub
2. Go to **Settings** → **API Key**
3. Copy your key (starts with `rd_`)
4. Add it to your GitHub repo secrets as `REPODOC_API_KEY`

## License

MIT © [RepoDoc](https://repodoc.vercel.app)
