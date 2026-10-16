# Investigation card states gallery

Worktree: `/Users/katesosedova/dev/elastic/kibana-investigation-card-states`  
Branch: `ekso-investigation-card-states`

## One-time worktree setup

This worktree reuses the bootstrapped Kibana checkout (no second `kbn bootstrap`):

```bash
cd /Users/katesosedova/dev/elastic/kibana-investigation-card-states
ln -sfn /Users/katesosedova/dev/elastic/kibana/node_modules node_modules
ln -sfn /Users/katesosedova/dev/elastic/kibana/target target
# Storybook expects target/kibana/...; assets live under target/build/...
test -e /Users/katesosedova/dev/elastic/kibana/target/kibana || \
  ln -sfn build /Users/katesosedova/dev/elastic/kibana/target/kibana
```

## Run Storybook

```bash
cd /Users/katesosedova/dev/elastic/kibana-investigation-card-states
source ~/.nvm/nvm.sh && nvm use
node scripts/storybook nightshift
```

Open **app → Nightshift → InvestigationCard → AllStates**

Direct URL:

http://localhost:9001/?path=/story/app-nightshift-investigationcard--all-states

## What’s covered

| State | Notes |
| --- | --- |
| Nightshift default | Summary, entities, actions |
| Selected | Interactive select highlight |
| In progress | Running dot beside the age |
| Closed | `status: closed` data only — no badge on the card |
| Title pending (alert / Slack / none) | Fallback titles |
| No summary / no entities | Sparse content |
| Entity overflow | First 3 + `+N` |
| Long title / long summary | Truncate + 2-line clamp |
| Without actions / minimal | Brief-card style |

The top of the story also stacks four Nightshift-style cards in one bordered panel (section list).
