# POC: Private Locations horizontal scaling & HA (Kibana-side sharding)

Throwaway tooling to demo condition-based sharding for
[synthetics-dev#462](https://github.com/elastic/synthetics-dev/issues/462) /
[obs-execution#24](https://github.com/elastic/obs-execution/issues/24).

Design: `./2026_07_15_private_locations_scaling_poc_design.md`.

## What this proves

Multiple agents under one Private Location share monitors with **at-most-once
execution** (no duplicate runs), and work **rebalances** when the online-agent
set changes — all in Kibana, no Beats and no Fleet-core changes.

## How it works

- A "scalable" private location keeps its **single** agent policy but sets
  `agentConditionSharding: true`. Many agents (distinct hostnames) enroll into
  that one policy.
- Kibana assigns each monitor's package policy to exactly one agent via
  **rendezvous hashing weighted by monitor cost**
  (`server/synthetics_service/private_location/assign_shards.ts` +
  `assign_by_condition.ts`), stamping `newPolicy.condition` with the agent's
  `host.name` in `generateNewPolicy`. Package-policy id stays
  `${monitorId}-${locationId}` and its `policy_ids` stay on the single agent
  policy; only its `condition` moves between agents. Elastic Agent drops inputs
  whose condition doesn't match → no duplicate runs.
- `RebalancePrivateLocationShardsTask` (`Synthetics:Rebalance-Private-Location-Shards`,
  ~1m) reads each enrolled agent's `host.name` + `last_checkin`, recomputes the
  assignment over the **healthy** host subset, and rewrites conditions for movers
  when an agent goes offline/online (with recovery hysteresis to avoid flap).

## Run

```bash
KIBANA_URL=http://localhost:5601 ES_HOST=http://localhost:9200 \
KIBANA_USER=elastic KIBANA_PASS=changeme N_AGENTS=3 \
./setup_scalable_location.sh
```

Then follow the printed steps: enroll N agents (distinct hostnames) into the one
policy, create ~10 monitors on the location, and run the verification ES|QL. Kill
an agent to demo rebalancing.

## Observability (free from Heartbeat/Agent monitoring)

With Agent monitoring on, per-agent signals land in `metrics-elastic_agent.*`:
`heartbeat.scheduler.jobs.missed_deadline` (missed schedules/overload),
`heartbeat.scheduler.tasks.waiting` (saturation), `heartbeat.scheduler.jobs.active`
(utilization). These double as autoscaling signals for a later phase.
