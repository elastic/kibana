/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { SECURITY_GET_ENTITY_TOOL_ID, SECURITY_SEARCH_ENTITIES_TOOL_ID } from '../../tools';

export const RECOMMENDED_ACTIONS_SKILL_ID = 'recommended-actions';

export const recommendedActionsSkill = defineSkillType({
  id: RECOMMENDED_ACTIONS_SKILL_ID,
  name: RECOMMENDED_ACTIONS_SKILL_ID,
  basePath: 'skills/security/discoveries',
  description:
    'Recommend and classify response actions for an Attack Discovery. Produces read-only, structured ' +
    'Kibana-executable and analyst-manual actions for downstream human approval; never executes actions.',
  content: `# Attack Discovery Recommended Actions

## Purpose

Turn one Attack Discovery into a concise set of evidence-based recommended actions. This skill is
**recommend-only**. It MUST NOT execute an action, mutate Kibana data, create a case, change asset
criticality, or invoke an Endpoint response action. A later human-in-the-loop workflow translates
approved Kibana-executable recommendations into API calls.

## Input

The input is an Attack Discovery and normally contains:
- \`title\`
- \`summary_markdown\`
- \`details_markdown\`
- \`entity_summary_markdown\`
- \`mitre_attack_tactics\`
- \`alert_ids\`

Optional enrichment or confidence fields may also be present. Do not require them. When enrichment is
absent, derive recommendations from the discovery text and leave unknown target arrays empty instead
of inventing entities.

## Action catalog

Use only these action types and classifications:

### Type 1 — Kibana-executable (\`execution: "kibana_api"\`)

| action_type | capability_ref | When justified |
| --- | --- | --- |
| \`isolate_host\` | \`endpoint.isolate\` | A named host is likely compromised and containment is proportionate. |
| \`kill_process\` | \`endpoint.kill_process\` | A specific malicious process is identified on a named host. |
| \`hunt_process_persistence\` | \`endpoint.running_procs\` | Process or persistence evidence warrants read-only process inspection or a follow-up hunt. |
| \`create_case\` | \`cases.create\` | The discovery needs tracked investigation, coordination, or escalation. |
| \`set_asset_criticality\` | \`asset_criticality.set\` | Evidence shows an entity's current criticality is missing or inappropriate. |
| \`analyze_exfiltration_ips\` | \`threat_hunting.exfil_ips\` | Network or exfiltration evidence identifies IPs that need scoped analysis. |

### Type 2 — Analyst-manual (\`execution: "manual"\`)

These have no Kibana API capability and MUST omit \`capability_ref\`:
- \`revoke_user_account\` — disable or revoke a compromised identity in its identity provider.
- \`enforce_step_up_auth\` — require stronger authentication or session re-verification.
- \`onboard_integration\` — add a missing telemetry or security integration.

Do not substitute a Type 1 action for a manual action merely to make it executable.

## Selection process

1. Extract only explicitly named hosts, users, IPs, and alert IDs.
2. Match concrete evidence to the smallest useful action set. Do not recommend every catalog action.
3. Use \`priority: "immediate"\` for active containment, \`"investigation"\` for verification and
   scoping, and \`"hardening"\` for durable posture improvements.
4. Optionally use the read-only entity tools to verify risk or criticality for named entities.
5. Optionally use the read-only ES|QL tools for narrowly scoped process-persistence or exfiltration-IP
   context. Time-bound every query. Missing telemetry is a data gap, not evidence that an action ran.
6. De-duplicate overlapping actions. Keep the rationale tied to the discovery evidence.

## Required structured response

Return an object with a single \`recommended_actions\` array. Every item MUST contain:
- \`action_type\`: one of the nine catalog values
- \`execution\`: \`kibana_api\` or \`manual\`, exactly as classified above
- \`title\`: short, analyst-readable imperative
- \`rationale\`: why the discovery supports this recommendation
- \`priority\`: \`immediate\`, \`investigation\`, or \`hardening\`
- \`targets\`: an object containing all four arrays: \`hosts\`, \`users\`, \`ips\`, \`alert_ids\`
- \`capability_ref\`: required for Type 1 and forbidden for Type 2

An empty \`recommended_actions\` array is valid when the discovery does not justify a catalog action.
Never claim that a recommendation was executed or approved.`,
  getRegistryTools: () => [
    SECURITY_GET_ENTITY_TOOL_ID,
    SECURITY_SEARCH_ENTITIES_TOOL_ID,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
  ],
});
