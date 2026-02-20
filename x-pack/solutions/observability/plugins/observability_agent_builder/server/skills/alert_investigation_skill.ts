/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

const ID = 'observability-alert-investigation';
const NAME = 'alert-investigation';
const BASE_PATH = 'skills/observability';

/**
 * Alert investigation skill for the Observability Agent.
 *
 * Guides the agent through a structured investigation sequence when an alert is present,
 * mirroring the signal hierarchy validated by the Alert AI Insight component.
 *
 * Signal sequence (APM alerts):
 *   1. Blast radius — get_service_topology (downstream, depth 1)
 *   2. When did it start — get_trace_change_points (last 6h)
 *   3. Error patterns — get_log_groups (last 15min)
 *   4. Runtime pressure — get_runtime_metrics (last 15min)
 *
 * Signal sequence (infrastructure alerts):
 *   1. Host resource pressure — get_hosts
 *   2. Services on host — get_services
 */
export const alertInvestigationSkill = defineSkillType({
  id: ID,
  name: NAME,
  basePath: BASE_PATH,
  description:
    'Investigate an observability alert to find root cause. Use when the user asks ' +
    'why an alert fired, wants to understand service or infrastructure degradation, ' +
    'or needs to identify the root cause of a performance or availability problem.',
  content: `# Observability Alert Investigation

Use this skill when the user wants to understand why an alert fired, investigate a service
or infrastructure problem, or find the root cause of a performance or availability issue.

---

## Step 1: Get the alert details

Call \`get_alert_details\` to fetch the full alert document. Extract:
- \`kibana.alert.reason\` — the human-readable trigger condition
- \`service.name\` — present for APM alerts (latency, error rate, throughput, anomaly)
- \`host.name\` — present for infrastructure alerts (CPU, memory, disk)
- \`kibana.alert.start\` — when the alert fired (use as the anchor for time windows)

If neither \`service.name\` nor \`host.name\` is present, tell the user you cannot determine
the affected entity and ask them to clarify.

---

## Step 2: Gather signals — do not stop after the first finding

Run all relevant steps before drawing conclusions. Evidence must corroborate.

### For APM / service alerts (service.name is present)

**2a. Blast radius**
Call \`observability.get_service_topology\` with:
- \`serviceName\`: the service from the alert
- \`direction\`: \`"downstream"\`
- \`depth\`: \`1\`
- \`start\`: alert start minus 30 minutes
- \`end\`: \`"now"\`

Look for downstream dependencies with elevated error rates or latency. A dependency
failure here is often the root cause, not the alerted service itself.

**2b. When did it start**
Call \`observability.get_trace_change_points\` with:
- \`start\`: alert start minus 6 hours
- \`end\`: \`"now"\`
- \`kqlFilter\`: \`service.name: "<service>"\`
- \`groupBy\`: \`"service.name"\` first, then \`"transaction.name"\` if a specific transaction
  looks affected

Look for the earliest change point across latency, throughput, and failure rate. This
tells you when the degradation actually started — which may be before the alert fired.

**2c. Error patterns**
Call \`observability.get_log_groups\` with:
- \`start\`: alert start minus 15 minutes
- \`end\`: \`"now"\`
- \`kqlFilter\`: \`service.name: "<service>"\`
- \`includeFirstSeen\`: \`true\`

New exceptions (firstSeen near alert time) are strong signal. Recurring exceptions that
predate the alert are likely pre-existing noise — flag but don't overweight.

**2d. JVM / runtime pressure** (skip if not a JVM service)
Call \`observability.get_runtime_metrics\` with:
- \`serviceName\`: the service from the alert
- \`start\`: alert start minus 15 minutes
- \`end\`: \`"now"\`

Look for heap saturation, GC pause spikes, or thread exhaustion. These indicate resource
pressure rather than a code or dependency issue.

### For infrastructure alerts (host.name is present, no service.name)

**2a. Host resource pressure**
Call \`observability.get_hosts\` with:
- \`kqlFilter\`: \`host.name: "<host>"\`
- \`start\`: alert start minus 15 minutes
- \`end\`: \`"now"\`

Look at CPU, memory, disk, and network. Identify which metric is saturated.

**2b. Services on the affected host**
Call \`observability.get_services\` with a \`kqlFilter\` scoped to the host to find which
services are running there. Then follow the APM signal sequence above for any services
that show degradation.

---

## Step 3: Synthesize

After gathering all signals, respond with:

**Trigger**: What changed first and when — quote the specific metric, value, and timestamp.

**Blast radius**: Which other services or hosts are affected. If none, say so explicitly.

**Likely cause**: The best-evidenced hypothesis. Distinguish the source (where the problem
started) from affected services (downstream victims). If the evidence points clearly to a
downstream dependency, name it. If evidence is weak or conflicting, say so — do not
fabricate confidence.

**Next steps**: Two or three specific, actionable recommendations. Prefer concrete actions
("roll back the deployment of X", "check the connection pool config on Y") over vague ones
("investigate further").

---

## Guidelines

- Quote specific numbers: error rate %, latency in ms, throughput in tpm.
- Temporal sequence matters: a change point that precedes the alert start is a stronger
  causal candidate than one that follows it.
- The alerted service is not necessarily the root cause — check downstream dependencies
  first.
- If a signal returns no data, note it briefly and move on. Absence of data is not
  evidence of absence.
- Do not repeat the alert reason verbatim. Explain what the data shows.
`,
  getRegistryTools: () => [],
});
