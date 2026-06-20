# Error Sentry

Kibana plugin that sets up the Error Sentry system and provides an overview page showing the status of each component.

## What it does

Error Sentry monitors your Kibana logs, groups recurring error patterns, and surfaces them as Observability cases. The actual detection, case creation, GitHub escalation, and Detective Ralph investigation are all handled by three managed workflows this plugin installs.

This plugin's job is to:
1. Register the custom `error-sentry.collectLogPatterns` workflow step.
2. Install the three Error Sentry managed workflows.
3. Register the Detective Ralph agent (requires Agent Builder).
4. Show an overview page listing the status of every component.

## Components tracked

| Component | Installed by |
|---|---|
| Custom step `collectLogPatterns` | This plugin (at startup) |
| Workflow: Capture log error patterns | This plugin (user-triggered Install) |
| Workflow: Escalate case to GitHub issue | This plugin (user-triggered Install) |
| Workflow: Ask Detective Ralph | This plugin (user-triggered Install) |
| Detective Ralph agent | This plugin (at startup, requires Agent Builder) |
| GitHub connector | User (Stack Management → Connectors) |
| Cases (observability owner) | Platform |
| Semantic Code Search interfaces | SCS CLI (external) |
| SCS ingested code repositories | SCS CLI (external) |
| Capture log source (`logs.otel`) | User data |

## Development

```bash
# Bootstrap
yarn kbn bootstrap

# Type check
node scripts/type_check --project x-pack/solutions/observability/plugins/error_sentry/tsconfig.json

# Lint
node scripts/eslint --fix x-pack/solutions/observability/plugins/error_sentry

# Tests
node scripts/jest x-pack/solutions/observability/plugins/error_sentry
```
