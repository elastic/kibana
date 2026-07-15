# POC: Private Locations horizontal scaling & HA (Kibana-side sharding)

Throwaway tooling to demo Option 3 (policy sharding) for
[synthetics-dev#462](https://github.com/elastic/synthetics-dev/issues/462) /
[obs-execution#24](https://github.com/elastic/obs-execution/issues/24).

Design: `docs/superpowers/specs/2026-07-15-private-locations-scaling-poc-design.md`.

## What this proves

Multiple agents under one Private Location share monitors with **at-most-once
execution** (no duplicate runs), and work **rebalances** when the online-agent
set changes — all in Kibana, no Beats changes.

## How it works

- A "scalable" private location holds a **pool of agent policies** (`agentPolicyIds`),
  one agent per policy (= one shard).
- Kibana assigns each monitor's package policy to exactly one shard via
  **rendezvous hashing** (`server/synthetics_service/private_location/assign_shards.ts`),
  applied in `generateNewPolicy`. Package-policy id stays `${monitorId}-${locationId}`;
  only its `policy_id` binding moves between shards.
- `RebalancePrivateLocationShardsTask` (`Synthetics:Rebalance-Private-Location-Shards`,
  ~1m) recomputes the assignment over the **healthy** shard subset and re-syncs
  movers when an agent goes offline/online.

## Run

```bash
KIBANA_URL=http://localhost:5601 ES_HOST=http://localhost:9200 \
KIBANA_USER=elastic KIBANA_PASS=changeme N_SHARDS=3 \
./setup_scalable_location.sh
```

Then follow the printed steps: enroll one agent per shard, create ~10 monitors on
the location, and run the verification ES|QL. Kill an agent to demo rebalancing.

## Observability (free from Heartbeat/Agent monitoring)

With Agent monitoring on, per-shard signals land in `metrics-elastic_agent.*`:
`heartbeat.scheduler.jobs.missed_deadline` (missed schedules/overload),
`heartbeat.scheduler.tasks.waiting` (saturation), `heartbeat.scheduler.jobs.active`
(utilization). These double as autoscaling signals for a later phase.
