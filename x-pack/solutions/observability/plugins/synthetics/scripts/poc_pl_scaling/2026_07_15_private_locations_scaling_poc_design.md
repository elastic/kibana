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
Beats/Heartbeat and no Fleet-core changes**.

## Approach: one agent policy, many agents (condition-based assignment)

Fleet delivers **one** compiled policy per agent policy (`getFullAgentPolicy`
→ `.fleet-policies`), identical for every enrolled agent — which is exactly why
naively adding a second agent duplicates runs. The only lever that filters
per-agent *without* agent-side code is Elastic Agent's `condition`:

- **Elastic Agent** evaluates `condition` (EQL) per input/stream at runtime and
  drops the unit when false — `internal/pkg/agent/transpiler/ast.go` (reserved
  `condition` key) + `inputs.go` ("after conditions are applied … the input is
  removed"). Integration-agnostic, so the heartbeat input honours it unmodified.
- **Fleet** already carries `condition` on package policies at package/input/
  stream level and compiles it into the delivered policy —
  `fleet/common/types/models/package_policy.ts` +
  `fleet/server/services/agent_policies/package_policies_to_agent_inputs.ts`
  (`combineConditions`). So Kibana only has to *set* `newPolicy.condition`; the
  plumbing to deliver it already exists.

So: a "scalable" PL keeps its **single** agent policy, and Kibana stamps each
monitor's package policy with a `condition` matching its **assigned agent**. All
agents receive the identical compiled policy; each runs only the inputs whose
condition matches → no duplicates. HA = rewrite the condition onto a healthy
agent.

> **Why not a pool of agent policies?** An earlier iteration modelled a scalable
> PL as a *pool of agent policies — one agent per policy (= one shard)*. It works,
> but trades duplicate-runs for **agent-policy sprawl**: N agents per location
> means N Fleet agent policies (M·N across M locations), plus per-shard policy
> lifecycle and Fleet UI clutter. The condition model gets the same at-most-once
> guarantee with a single policy per location, so it replaced the pool model.

### Key property: stable identity, moving binding

Package-policy id stays `${monitorId}-${locationId}`, and its `policy_id`/
`policy_ids` stay pinned to the location's single agent policy — so the
monitor↔package-policy **saved-object references never change**. Only the
policy's `condition` moves between agents. This preserves the existing
persistence model (an RFC MUST).

### Choice of shard key: `host.name`

The condition needs a stable per-agent fact that (a) Elastic Agent exposes to
the condition provider and (b) Kibana can read to build the assignment:

- `host.name` / `host.id` — **chosen.** Stable, and Kibana already knows it from
  each agent's `local_metadata` in `.fleet-agents`. Assumes one agent per host
  (the private-location norm). The agent `host` provider lowercases `host.name`.
- `agent.id` — Kibana knows it, but it's regenerated on re-enroll → a bounce
  reshuffles that agent's slice. Rejected.
- agent **tags** — operator-friendly, but the agent context provider
  (`providers/agent/agent.go`) publishes only `id`/`version`/`unprivileged`, not
  tags, so they can't be referenced in a `condition`. Rejected.
- `env.*` — provider-visible and stable, but Kibana can't read an agent's process
  env to build the map. Rejected.

### Assignment: rendezvous (HRW) hashing, weighted by monitor cost

Host names are just rendezvous ids, so the placement math is shared with any
node-assignment problem:

- `assignShard(monitorId, hostNames[])` → picks the host with the highest
  `hash(monitorId + hostName)`. Rendezvous hashing means that when a host leaves,
  **only its monitors move**; everything else stays put → minimal-churn failover.
- `balanceShardsByCost(...)` → a longest-processing-time (LPT) greedy pass that
  balances total **memory cost per host** (browser monitors ≈ 50× a lightweight
  monitor — see benchmarking below), using rendezvous only to break ties. Used
  for the initial spread and for recovery redistribution.

`assign_by_condition.ts` delegates to both and only adds the `${host.name}`
condition builder/parser (`hostNameCondition` / `hostFromCondition`).

## Change surface (all under `x-pack/solutions/observability/plugins/synthetics/server`)

1. **Data model** — add optional `agentConditionSharding?: boolean` to:
   - server `PrivateLocationAttributesCodec` (`runtime_types/private_locations.ts`)
   - common `PrivateLocationCodec` (`common/runtime_types/.../synthetics_private_locations.ts`)
   - carry it in `common/utils/location_formatter.ts`.
   `get_private_locations.ts` spreads `...attributes`, so it flows through for free.
   A PL is "scalable" when `agentConditionSharding === true`; otherwise behaviour
   is unchanged (single policy, no condition, every agent runs everything).

2. **Assignment module** — `synthetics_service/private_location/assign_shards.ts`
   (rendezvous + cost balancing) and `assign_by_condition.ts` (condition build/
   parse + `isConditionShardedLocation`) + unit tests.

3. **Wire into policy creation/edit** — in `SyntheticsPrivateLocation.generateNewPolicy`,
   when `isConditionShardedLocation(location)`, keep `policy_ids` on the single
   agent policy and set `newPolicy.condition = hostNameCondition(assignedHost)`.
   Enrolled hosts are resolved once per create/edit batch (not per monitor). This
   covers both create (`createPackagePolicies`) and edit (`editMonitors`).

4. **Rebalancing — a NEW dedicated task** (the existing
   `Synthetics:Sync-Private-Location-Monitors` task is already overloaded with MW
   drift + duplicate cleanup, so we keep it untouched):
   `tasks/rebalance_private_location_shards_task.ts` →
   `RebalancePrivateLocationShardsTask`, mirroring the existing task's
   register/`start`/`ensureScheduled` pattern.
   - Own task type `Synthetics:Rebalance-Private-Location-Shards`, own interval knob.
   - Early-exits for non-condition-sharded PLs.
   - Per scalable PL: read each enrolled agent's `host.name` + `last_checkin` from
     `.fleet-agents` (`getAgentHostCheckins`), split into healthy / stale hosts,
     recompute the assignment over **healthy** hosts, diff against each package
     policy's current `condition`, and `bulkUpdate` only the movers (rewriting
     `condition`, never `policy_ids`).
   - `runRebalanceShardsTaskSoon(server)` helper so enroll/unenroll or CRUD can
     trigger a rebalance immediately; the interval is the safety net.
   - **Recovery hysteresis (anti-flap):** the task tracks each host's healthy
     streak in its state (`healthySince`, keyed `${agentPolicyId}:${host}`). A host
     that just came back only becomes eligible to *receive* the full cost
     redistribution after it has stayed healthy for `RECOVERY_STABILITY_MS`.
     Failover (evicting a *dead* host's monitors onto survivors) still reacts
     immediately, so a flapping agent can't repeatedly pull a redistribution — and
     the pool-wide Fleet re-check-in it triggers — onto itself on every bounce.

5. **Demo harness** — use `x-pack/packages/kbn-synthetics-private-location` to
   stand up one agent policy + N dockerized agents (distinct hostnames), create
   ~10 monitors, and an ES verification query.

## Validation / proof

- **Distribution:** ~10 monitors across 3 agents → each monitor's `summary` docs
  come from a single `agent.id`; exactly one run per interval. Zero duplicates.
- **Rebalancing:** kill one agent → after a rebalance cycle its ~3 monitors
  reappear on the surviving agents (still one-per-interval, none dropped); the
  other ~7 never moved (rendezvous property).

## Monitor cost model (benchmarking)

Cost weights come from measuring per-monitor RSS with `docker stats` on the
`elastic-agent-complete` image: a **lightweight** (HTTP/TCP/ICMP) monitor adds
~1 unit, a **browser** monitor ~50 units (Chromium + Node runtime). These feed
`balanceShardsByCost` so a host running one browser monitor isn't handed the same
count of monitors as a host running only lightweight checks. See
`assign_shards.ts` for the constants and rationale.

## Observability (free from Heartbeat/Agent monitoring)

Heartbeat already emits scheduler self-metrics — collected per-agent into
`metrics-elastic_agent.*` when Agent monitoring is on:
- `heartbeat.scheduler.jobs.missed_deadline` → missed schedules / overload
- `heartbeat.scheduler.tasks.waiting` (+ `schedule.limit`) → queue depth / saturation
- `heartbeat.scheduler.jobs.active`, CPU, `libbeat.pipeline.events.active` → utilization / backpressure

These are per-instance counters and double as autoscaling signals for a later
phase. For the POC correctness proof we still verify against actual `summary`
docs; `missed_deadline` is the health overlay, not the correctness oracle.

## Tradeoffs / constraints

- **Win:** one agent policy per location — no agent-policy sprawl, no Fleet UI
  clutter, no per-shard policy lifecycle.
- **Cost:** every reassignment rewrites conditions on the *shared* policy →
  bumps its revision → **all** enrolled agents re-check-in (each just starts/
  stops local units, which is cheap, but it's pool-wide). Hysteresis keeps this
  from happening on every flap.
- **Constraint:** identity is tied to `host.name` (one agent per host). The
  condition also pins `host.id` (machine UniqueID) so two agents that happen to
  share a hostname can't both match the same monitor.
- **At-most-once is best-effort across a failover, not fenced.** When a monitor
  moves from a stale agent A onto a healthy agent B, there is a brief window
  where both may run it: A might be a false-positive stale (slow check-in, not
  actually dead) or may not have polled the revised policy yet, while B has
  already started. Condition sharding has no cross-agent handoff/lease to fence
  this. **This short overlap is acceptable** — the steady state is exactly-once,
  the window is bounded by the stale threshold (`STALE_CHECKIN_MS`, ~3 missed
  check-ins) plus one agent poll, and Heartbeat runs are idempotent w.r.t.
  indexing. True fencing would need a lease protocol (out of scope).

## Explicitly out of scope (downstream of proving distribution)

Drain/cordon, version-skew protocol, at-least-once/idempotent indexing, K8s
Helm/HPA, pool dashboards/alerts, placement/priority, licensing.
