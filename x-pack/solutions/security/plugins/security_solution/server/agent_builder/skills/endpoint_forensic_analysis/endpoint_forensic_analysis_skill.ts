/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID = 'endpoint-forensic-analysis';

const ENDPOINT_TELEMETRY_INDEX_PATTERNS = [
  'logs-endpoint.events.process-*',
  'logs-endpoint.events.network-*',
  'logs-endpoint.events.file-*',
  'logs-endpoint.events.registry-*',
] as const;

export const endpointForensicAnalysisSkill = defineSkillType({
  id: ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  name: ENDPOINT_FORENSIC_ANALYSIS_SKILL_ID,
  basePath: 'skills/security/endpoint',
  description:
    'Endpoint DFIR forensic reconstruction (read-only): patient zero identification across enrolled hosts, ' +
    'host-scoped attack timelines, lateral movement chains between named hosts, and persistence enumeration. ' +
    'Recommends containment response actions for a human to approve, but never executes them. ' +
    'Use for incident-scoped questions naming specific hosts or outbreaks — NOT fleet-wide proactive hunts (use threat-hunting). ' +
    'NOT alert triage by alert ID (use alert-analysis). NOT host isolation, kill process, or file retrieve (direct the analyst to Endpoint response actions in Security — no dedicated Agent Builder skill yet). ' +
    'NOT conflicting/incompatible antivirus or security software, policy or configuration failures, endpoint health or missed check-ins, ' +
    'performance/resource troubleshooting, or output/integration failures — even when the question names a specific host ' +
    '(use elastic-defend-configuration-troubleshooting).',
  content: `# Endpoint Forensic Analysis

## When to Use

Load when the analyst asks about a **specific host or incident** and needs forensic reconstruction:
- Patient zero identification
- Attack timeline on a named host
- Lateral movement chain between hosts
- Persistence mechanism enumeration

Naming a specific host is **not** sufficient on its own — the question must also require forensic reconstruction (timeline, patient zero, lateral movement, persistence), not configuration/health/software-conflict diagnosis. See "Do not load" below.

Do **not** load for:
- Fleet-wide proactive hunts → threat-hunting
- Alert triage from alert id only → alert-analysis
- Host isolation / kill process / file retrieve → tell the analyst to use **Endpoint response actions** in Security (Fleet / Endpoint details). Do not invoke response-action tools from this skill.
- Conflicting or incompatible security software, including antivirus/AV software (e.g. "does host X have conflicting antivirus", third-party AV conflicts) → elastic-defend-configuration-troubleshooting. Naming a specific host does **not** make this a forensic question — antivirus/AV conflict detection is always configuration troubleshooting, never forensic reconstruction.
- Policy/configuration failures → elastic-defend-configuration-troubleshooting
- Endpoint health and missed check-ins → elastic-defend-configuration-troubleshooting
- Performance/resource troubleshooting → elastic-defend-configuration-troubleshooting
- Output or integration failures → elastic-defend-configuration-troubleshooting

## Scope (read-only)

This skill MUST NOT invoke response actions — it recommends them and stops there. On a request to *execute* one, explain that this skill is read-only and direct the analyst to Endpoint response actions in Security. Recommending is not executing: step 7 below is required, not an exception to this rule.

## Process

### 1. Discover telemetry scope (when hosts or time window need scoping)
When the question names specific hosts or implies a lookback window, call \`${
    platformCoreTools.listIndices
  }\` with pattern \`logs-endpoint.events.*\` to confirm which Defend telemetry indices are actually available before ES|QL. Skip when the question is already narrowly scoped and you can proceed directly to ES|QL on known \`logs-endpoint.events.*\` indices (${ENDPOINT_TELEMETRY_INDEX_PATTERNS.join(
    ', '
  )}).

### 2. Query with ES|QL
Use \`platform.core.generate_esql\` then \`platform.core.execute_esql\` against the recommended Defend indices.
Always scope \`@timestamp\`. Cite index and query in answers.

### 3. Patient zero
Query process and network indices ordered by @timestamp ASC.
Return earliest host, timestamp, indicator, and delivery-vector hypothesis.

### 4. Attack timeline
Merge process, file, network, and registry events for the host in the time window; sort by \`@timestamp\` ascending.
Present the answer as an explicit chronological timeline — an ordered, timestamp-labeled sequence of events scoped to the named host — not a prose paragraph. **Only include events supported by query results.** If telemetry is sparse or unavailable, state the data gap explicitly and optionally provide a clearly labeled investigation plan (suggested ES|QL queries / indices to check) — do **not** present an expected attack sequence as that host's chronology.

### 5. Lateral movement
Trace outbound internal connections from source host; correlate with process creation on destinations.

### 6. Persistence
Enumerate registry run keys, scheduled tasks, services, and startup items from telemetry indices.

### 7. Recommend response actions
Close every reconstruction that found a live threat with a **Recommended response actions** section: the containment the evidence justifies, for a human to approve. Recommend only what the reconstruction supports — an action whose rationale you cannot tie to a specific finding above does not belong in the list, and a reconstruction that found nothing gets no list at all.

Each recommendation carries a short imperative \`title\`, the \`rationale\` naming the finding that justifies it, a \`priority\`, and the \`targets\` it touches (\`hosts\`, \`users\`, \`ips\`, \`alert_ids\` — each an array, empty when it names none).

Priority is \`immediate\` when the threat is still live, \`investigation\` when the action answers an open question, and \`hardening\` when it closes the gap that allowed the attack.

Use these action types, and no others:

| \`action_type\` | \`execution\` | \`capability_ref\` | Recommend it when |
|---|---|---|---|
| \`isolate_host\` | \`kibana_api\` | \`endpoint.isolate\` | the host is actively compromised or pivoting |
| \`release_host\` | \`kibana_api\` | \`endpoint.release\` | an isolated host turns out to be clean |
| \`scan_host\` | \`kibana_api\` | \`endpoint.scan\` | a malware scan would confirm or bound the infection |
| \`list_running_processes\` | \`kibana_api\` | \`endpoint.running_procs\` | you need live process state a historical query cannot give |
| \`hunt_indicator\` | \`kibana_api\` | \`threat_hunting.indicator\` | an extracted IoC should be hunted across other endpoints |
| \`create_case\` | \`kibana_api\` | \`cases.create\` | the incident needs a durable record for handoff |
| \`block_indicator\` | \`manual\` | omit | a C2 address or domain should be blocked at the perimeter |
| \`revoke_user_account\` | \`manual\` | omit | an account was used or is implicated in the attack |

That list is the whole vocabulary because it is the whole set Elastic can action. Other Endpoint response actions — kill-process, suspend-process, execute, get-file, upload, runscript, memory-dump — are **not** supported; recommending one proposes containment nothing can carry out. If the evidence calls for one, say so in the narrative instead of inventing an \`action_type\`.

A host that needs its own forensic reconstruction is **not** a response action. Name it as an investigation lead in the narrative (or in \`followUpHosts\` when the caller asked for structured output), so it is followed up rather than approved.

\`kibana_api\` marks an action an executor could carry out once approved; \`manual\` marks one the analyst performs outside Kibana. Neither runs here — you recommend, a human decides, and something else executes. Say so when you present the list; never imply an action has been taken or scheduled.

When the caller asked for structured output with a \`recommendedActions\` field, return the same list there using exactly these field names. Return an empty array rather than omitting the field when you recommend nothing, so "nothing to contain" is distinguishable from "not assessed".

## Tool Selection Guardrails

- Call \`${
    platformCoreTools.listIndices
  }\` when host scope or time window is ambiguous — not required on every turn if ES|QL targets are already clear.
- **Always** use \`platform.core.generate_esql\` and \`platform.core.execute_esql\` for forensic answers.
- Do **not** use \`platform.core.search\` or \`relevance_search\` for reconstruction — they cannot replace scoped ES|QL on Defend telemetry.
- Use \`platform.core.get_index_mapping\` only when field names are uncertain before generating ES|QL.
`,
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
  ],
});
