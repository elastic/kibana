# POC: Private Locations Horizontal Scaling & HA (Kibana-side sharding)

Status: POC / throwaway-quality demo
Related: elastic/synthetics-dev#462, RFC "Synthetic Monitoring Private Locations Scaling and High Availability"

## Problem

A Private Location (PL) today maps 1:1 to a single Fleet **agent policy**. Kibana
writes one `synthetics` package policy per *(monitor × location)*, all pinned to
that one agent policy (`policy_id = privateLocation.agentPolicyId`). Every agent
enrolled in the policy receives the **full** set of monitors and runs them on its
own Heartbeat schedule. So enrolling a second agent produces **duplicate runs**,
not load balancing or failover. There is no Kibana-side queue, lease, or
per-agent assignment.

## Hypothesis this POC proves

Multiple agents under one Private Location can **share monitor work with
at-most-once execution** (zero duplicate runs), and work **rebalances** when the
set of online agents changes — implemented entirely in the Kibana repo, with **no
Beats/Heartbeat changes**.

## Approach: Kibana-side sharding over a pool of agent policies

Because Fleet delivers a package policy to an *agent policy* (never an individual
agent), the only Kibana-only shape is:

> A "scalable" PL is backed by a **pool of agent policies — one agent per policy
> (= one shard)**. Kibana assigns each monitor's package policy to exactly one
> shard via deterministic hashing. Each physical agent enrolls into its own shard
> policy, so it only receives its slice of monitors → no duplicates. HA = Kibana
> moves a dead shard's monitors onto healthy shards.

Rejected alternatives (both require agent-side code, out of scope): single policy
+ ES lease claimed by Heartbeat; single policy + assignment map filtered
agent-side.

### Key property: stable identity, moving binding

Package-policy id stays `${monitorId}-${locationId}` (shard-independent), so the
monitor↔package-policy **saved-object references never change**. Only the
policy's `policy_id`/`policy_ids` binding moves between shards. This preserves the
existing persistence model (an RFC MUST).

### Assignment: rendezvous (HRW) hashing

`assignShard(monitorId, shardIds[])` → picks the shard with the highest
`hash(monitorId + shardId)`. Rendezvous hashing means that when a shard leaves,
**only its monitors move**; everything else stays put → clean, minimal-churn
rebalancing demo.

## Change surface (all under `x-pack/solutions/observability/plugins/synthetics/server`)

1. **Data model** — add optional `agentPolicyIds?: string[]` (the shard pool) to:
   - server `PrivateLocationAttributesCodec` (`runtime_types/private_locations.ts`)
   - common `PrivateLocationCodec` (`common/runtime_types/.../synthetics_private_locations.ts`)
   - carry it in `common/utils/location_formatter.ts`.
   `get_private_locations.ts` spreads `...attributes`, so it flows through for free.
   A PL is "scalable" when `agentPolicyIds.length > 1`; otherwise behaviour is
   unchanged (falls back to `agentPolicyId`).

2. **Validation** — relax `PrivateLocationRepository.validatePrivateLocation` so a
   pool of agent policies is allowed (today it rejects reusing an agent policy).

3. **Assignment module** — new `synthetics_service/private_location/assign_shards.ts`
   (rendezvous hashing) + unit tests.

4. **Wire into policy creation/edit** — in `SyntheticsPrivateLocation.generateNewPolicy`,
   when the location has a shard pool, set `policy_id`/`policy_ids` to
   `assignShard(config.id, shardPool)` instead of the single `agentPolicyId`.
   This covers both create (`createPackagePolicies`) and edit (`editMonitors`).

5. **Rebalancing — a NEW dedicated task** (the existing
   `Synthetics:Sync-Private-Location-Monitors` task is already overloaded with MW
   drift + duplicate cleanup, so we keep it untouched):
   `tasks/rebalance_private_location_shards_task.ts` →
   `RebalancePrivateLocationShardsTask`, mirroring the existing task's
   register/`start`/`ensureScheduled` pattern.
   - Own task type `Synthetics:Rebalance-Private-Location-Shards`, own interval knob.
   - Early-exits for non-scalable PLs.
   - Per scalable PL: compute healthy shard subset (via `getAgentStatusForAgentPolicy`
     per shard), recompute the rendezvous assignment over **healthy** shards, diff
     against each package policy's current `policy_id`, and `bulkUpdate` only the movers.
   - `runRebalanceShardsTaskSoon(server)` helper so enroll/unenroll or CRUD can
     trigger a rebalance immediately; the interval is the safety net.
   - Registered alongside the other synthetics tasks in plugin setup.

6. **Demo harness** — use `x-pack/packages/kbn-synthetics-private-location` to
   stand up N shard agent policies + N dockerized agents, create ~10 monitors, and
   an ES verification query.

## Validation / proof

- **Distribution:** ~10 monitors across 3 agents → each monitor's `summary` docs
  come from a single `agent.id`; exactly one run per interval. Zero duplicates.
- **Rebalancing:** kill one agent → after a rebalance cycle its ~3 monitors
  reappear on the surviving agents (still one-per-interval, none dropped); the
  other ~7 never moved (rendezvous property).

## Observability (free from Heartbeat/Agent monitoring)

Heartbeat already emits scheduler self-metrics — collected per-agent into
`metrics-elastic_agent.*` when Agent monitoring is on:
- `heartbeat.scheduler.jobs.missed_deadline` → missed schedules / overload
- `heartbeat.scheduler.tasks.waiting` (+ `schedule.limit`) → queue depth / saturation
- `heartbeat.scheduler.jobs.active`, CPU, `libbeat.pipeline.events.active` → utilization / backpressure

These are per-instance counters (no pool rollup — the gap Kibana would fill) and
double as autoscaling signals for a later phase. For the POC correctness proof we
still verify against actual `summary` docs; `missed_deadline` is the health
overlay, not the correctness oracle.

## Explicitly out of scope (downstream of proving distribution)

Drain/cordon, version-skew protocol, at-least-once/idempotent indexing, K8s
Helm/HPA, pool dashboards/alerts, placement/priority, licensing. The
one-agent-per-policy shard model is a POC device, not the proposed end-state
ergonomics.
