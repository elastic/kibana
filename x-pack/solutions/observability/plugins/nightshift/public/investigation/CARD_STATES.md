# Investigation card states gallery

Isolated worktree / branch: `ekso-investigation-card-states`  
Path: `/Users/katesosedova/dev/elastic/kibana-investigation-card-states`

## Run

From this worktree (or any kibana checkout on this branch):

```bash
source ~/.nvm/nvm.sh && nvm use
yarn storybook nightshift
```

Open **app → Nightshift → InvestigationCard → AllStates**.

## What’s covered

| State | Notes |
| --- | --- |
| Nightshift default | Summary, entities, actions; proposals hidden |
| Selected | Interactive select highlight |
| In progress | Data flag only — no running dot |
| Closed | Hollow Closed badge |
| Title pending (alert / Slack / none) | Fallback titles |
| No summary / no entities | Sparse content |
| Entity overflow | First 3 + `+N` |
| Pending proposals | Plugin default (Nightshift turns off) |
| Long title / long summary | Truncate + 2-line clamp |
| Without actions / minimal | Brief-card style |

The top of the story also stacks four Nightshift-style cards in one bordered panel (section list).
