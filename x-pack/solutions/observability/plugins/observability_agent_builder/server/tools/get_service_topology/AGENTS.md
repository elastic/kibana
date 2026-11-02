# get_service_topology — Requirements

## Purpose

Surface upstream and downstream service dependencies for a given service, enabling SREs to understand blast radius and trace root causes during incidents.

## Implementation

Core logic: `x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_service_topology/get_service_topology.ts`

## Direction Semantics

- **downstream**: Services and dependencies _called by_ the queried service (and its descendants).
- **upstream**: Services that _call_ the queried service (and their ancestors).
- **both**: Union of upstream and downstream.

## Depth Parameter

The `depth` parameter limits BFS traversal to a maximum number of hops:

- `depth=1`: Immediate (single-hop) dependencies only. Replaces the former `get_downstream_dependencies` tool.
- `depth=2`: Up to two hops from the root service.
- Omitted: Unlimited traversal (full multi-hop topology).

## Graph Traversal Rules

Given this topology:

```
         frontend
        /        \
  checkout     recommendation
  /  |  \          |
pg redis kafka     pg
```

### Downstream (BFS (Breadth-First Search) forward from root)

Start from `serviceName`, follow outgoing edges. Include multi-hop descendants.

**Query: `checkout` downstream**

```
         frontend
        /        \
 [checkout]    recommendation    ← sibling branch excluded
  /  |  \          |
[pg][redis][kafka]  pg
```

Result: `checkout→pg`, `checkout→redis`, `checkout→kafka`
Excluded: `frontend→*`, `recommendation→*` (parent and sibling branches)

### Upstream (BFS backward from root)

Start from `serviceName`, follow incoming edges backward. Include multi-hop ancestors.

**Query: `pg` upstream**

```
       [frontend]
        /        \
  [checkout]    [recommendation]
  /  |  \          |
[pg] redis kafka  [pg]
```

Result: `checkout→pg`, `frontend→checkout`, `recommendation→pg`
Excluded: `checkout→redis`, `checkout→kafka` (sibling edges that don't lead to `pg`)

## Critical Constraints

### Service identity must come from resolved `service.name`, not from `span.destination.service.resource`

- `span.destination.service.resource` can be arbitrary (proxy hostname, IP address, load balancer) and has **no guaranteed relationship** to `service.name`.
- Service-to-service edges in the graph must use the resolved `service.name` from linked traces (parent-child join via `span.id` → `parent.id`).
- **DO NOT** use heuristic/fuzzy matching on `span.destination.service.resource` for graph traversal.

### Upstream must work for both instrumented services and external dependencies

- For **instrumented services**: the service has its own transactions, so upstream callers can be discovered from those traces.
- For **external dependencies** (e.g., `postgres`, `redis`): the dependency has no transactions. Upstream callers must still be discoverable via exit spans that target the dependency.

## Test Coverage

API tests: `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/tools/get_service_topology.spec.ts`

Synthtrace scenario: `src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/get_service_topology/topology.ts`

The synthtrace scenario generates **linked traces** (frontend → checkout-service → deps share a `trace.id`) to enable multi-hop testing, and **separate traces** (recommendation-service → postgres) to verify sibling exclusion.
