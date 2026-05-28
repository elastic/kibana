# ADR: Why Not Native Workflow Scheduling

**Status:** Accepted  
**Date:** 2026-02-20  
**Authors:** Security Solution Team  

## Context

Attack Discovery 2.0 introduces a generation workflow that coordinates alert retrieval, generation, and promotion via the Kibana Workflows engine. The natural question arises: **should we schedule these workflows using native workflow scheduling (cron/interval triggers built into the Workflows engine), or continue using the existing Kibana Alerting Framework?**

The existing public Attack Discovery schedule API (`/api/attack_discovery/schedules`) already uses the Alerting Framework to create and manage scheduled alerting rules. These rules execute a custom rule type (`attack-discovery`) whose executor retrieves alerts, invokes generation, and writes results as alerts-as-data.

### Options Considered

1. **Native Workflow Scheduling** — Add cron/interval trigger support to the Workflows engine and use it to schedule Attack Discovery workflows directly.

2. **Alerting Framework with Workflow Executor** — Continue using the Alerting Framework for scheduling, but replace the executor with one that invokes the generation workflow. The schedule API remains a thin wrapper around alerting rules.

## Decision

**Option 2: Alerting Framework with Workflow Executor.**

We use the Kibana Alerting Framework as the scheduling mechanism and add a new executor that invokes the generation workflow pipeline (`executeGenerationWorkflow`) instead of running the legacy inline generation logic.

## Rationale

### The Alerting Framework provides battle-tested infrastructure

- **Persistence**: Alerting rules are stored in Saved Objects with full CRUD, versioning, and space isolation.
- **Task Manager integration**: The Alerting Framework delegates to Task Manager for reliable distributed scheduling with retry, concurrency control, and leader election.
- **Alerts-as-data**: The framework natively writes to the `.alerts-*` indices, which Attack Discovery already uses for scheduled results. Using workflows directly would require reimplementing this write path.
- **Actions integration**: Alerting rules support notification actions (email, Slack, webhook, etc.) triggered by rule execution. Native workflow scheduling would need to reimplement this.
- **Security model**: The framework handles API key management, privilege checks, and RBAC for scheduled execution contexts. Workflows currently run with the caller's credentials.
- **Monitoring and health**: Alerting provides execution history, health status, error tracking, and the Rules UI for operational visibility.

### Native workflow scheduling is not mature enough

- The Workflows engine does not currently support scheduled triggers. Adding this would require:
  - A persistence layer for schedule definitions (or reusing Task Manager directly).
  - API key management for deferred execution.
  - Retry and error handling comparable to the Alerting Framework.
  - Integration with the Kibana notification system for actions.
- Building all of this duplicates infrastructure that the Alerting Framework already provides.

### The approach is minimally invasive

- The existing public schedule API in `elastic_assistant` continues to work unchanged.
- The new internal schedule API in `discoveries` uses the same data client, field maps, and transforms extracted into `@kbn/attack-discovery-schedules-common`.
- The only difference is the executor: the internal API registers a workflow-aware executor that calls `executeGenerationWorkflow`, while the public API retains its existing inline executor.
- Tag-based isolation (`attack-discovery-schedule` tag) ensures that internal and public schedules do not interfere with each other.

### Shared code reduces maintenance burden

- `AttackDiscoveryScheduleDataClient`, transforms, field maps, and constants are extracted into `@kbn/attack-discovery-schedules-common` so both `elastic_assistant` and `discoveries` share the same infrastructure.
- The `filterTags` option on the data client ensures each API only sees its own schedules.

## Consequences

### Positive

- **Reuse**: No new scheduling infrastructure to build or maintain.
- **Feature parity**: Notification actions, execution history, and RBAC work out of the box.
- **Compatibility**: Existing public schedule API and FTR tests remain unchanged.
- **Incremental**: The workflow executor can evolve independently of the scheduling mechanism.

### Negative

- **Coupling to Alerting Framework**: Schedule behavior is constrained by the Alerting Framework's execution model (fixed intervals, rule-level concurrency, etc.).
- **Two executors**: `elastic_assistant` and `discoveries` each register their own executor for the same `attack-discovery` rule type, differentiated by tags. This requires careful coordination.
- **Indirection**: Debugging a scheduled workflow execution requires tracing through the Alerting Framework → Task Manager → executor → generation workflow chain.

### Neutral

- The existing public schedule API is not modified. Both APIs can coexist.
- Migration of existing schedules to workflow-oriented schedules is explicitly out of scope and would be handled by a separate effort if needed.

## Conditions for Revisiting

This decision should be revisited if any of the following conditions are met:

1. **The Workflows engine gains native scheduling** with persistence, API key management, retry, and actions integration — making it a viable alternative to the Alerting Framework for scheduled execution.
2. **The Alerting Framework becomes a bottleneck** for workflow-oriented scheduling (e.g., execution model limitations, performance issues with long-running workflow executions).
3. **The two-executor model causes operational confusion** or maintenance burden that outweighs the benefits of reuse.
4. **A unified scheduling abstraction** emerges in the Kibana platform that subsumes both the Alerting Framework and workflow triggers.

## References

- Epic: Workflow Schedule API (`kibana-9p4`)
- Public schedule API: `elastic_assistant/server/routes/attack_discovery/schedules/public/`
- Internal schedule API: `discoveries/server/routes/schedules/` (kibana-9p4.6)
- Shared package: `@kbn/attack-discovery-schedules-common` (kibana-9p4.1)
- Generation workflow: `discoveries/server/routes/post/generate/helpers/execute_generation_workflow.ts`
