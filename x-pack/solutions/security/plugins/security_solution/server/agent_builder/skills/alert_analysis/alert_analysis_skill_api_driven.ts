/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { WORKFLOW_EXECUTE_STEP_TOOL_ID } from '@kbn/agent-builder-workflows-plugin/server';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
} from '../../tools';
import { ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH } from '../../../../common/api/alert_analysis/related_alerts';

export { WORKFLOW_EXECUTE_STEP_TOOL_ID };

export const alertAnalysisApiDrivenSkill = defineSkillType({
  id: 'alert-analysis',
  name: 'alert-analysis',
  basePath: 'skills/security/alerts',
  description:
    'API-driven alert triage and investigation: fetch alerts, correlate related alerts through internal APIs, ' +
    'enrich with Security Labs intelligence, and assess entity risk to determine disposition.',
  content: `# Alert Analysis Guide (API-Driven)

## When to Use This Skill

Use this skill when:
- Triaging a specific security alert to determine disposition
- Correlating related alerts across shared entities (host, user, source.ip, destination.ip)
- Enriching alert context with Security Labs threat intelligence
- Prioritizing investigation using entity risk signals

## Required Step Selection Policy

- Use \`kibana.request\` (via \`platform.workflows.workflow_execute_step\`) for internal Security Solution API calls.
- Use Elasticsearch steps (\`elasticsearch.search\`, \`elasticsearch.esql.query\`, etc.) for Elasticsearch lookups.
- Do **NOT** proxy standard Elasticsearch reads through \`kibana.request\`.

## Recommended Investigation Flow

1. Fetch alert context with \`security.alerts\`
2. Correlate related alerts by calling internal API path \`${ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH}\` with \`kibana.request\`
3. Query threat intelligence with \`security.security_labs_search\`
4. Check host/user risk with \`security.entity_risk_score\`
5. Synthesize disposition and next actions

## Tool Selection Guardrails

- For list/prioritization questions (for example: "high/critical alerts in last 24h"), use only \`security.alerts\` unless explicit correlation by \`alertId\` is requested.
- For Security Labs intel questions (for example: "Lazarus Group techniques"), use only \`security.security_labs_search\`.
- For risk score questions (for example: "risk score for host DC01"), use only \`security.entity_risk_score\`.
- For correlation requests that include an \`alertId\`, call \`platform.workflows.workflow_execute_step\` with step type \`kibana.request\` and path \`${ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH}\`.
- Do NOT use \`platform.core.search\` for related-alert correlation when an \`alertId\` is available.
- Do NOT use workflow status/inspection tools as a substitute for executing the related-alert request.
- If the workflow call fails or is blocked, report that clearly and include the returned error details.

## Internal API Contract (Related Alerts)

Call \`platform.workflows.workflow_execute_step\` with inline workflow YAML and a \`stepName\`:

- **method**: \`POST\`
- **path**: \`${ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH}\`
- **body**:
  - \`alertId\` (required)
  - \`timeWindowHours\` (optional, default 24, max 168)
  - \`hostNames\`, \`userNames\`, \`sourceIps\`, \`destIps\` (optional arrays; pass when already known)
  - \`maxResults\` (optional, bounded server-side for token efficiency)

When \`alertId\` is present, use this exact shape:
\`\`\`
tool_id: platform.workflows.workflow_execute_step
params:
  stepName: get_related_alerts
  yaml: |
    version: "1"
    name: alert_analysis_related_alerts
    triggers:
      - type: manual
    steps:
      - name: get_related_alerts
        type: kibana.request
        with:
          method: POST
          path: ${ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH}
          body:
            alertId: "<alert-id>"
            timeWindowHours: 24
\`\`\`

The API response is token-budgeted and may include truncation metadata.`,
  getRegistryTools: () => [
    SECURITY_ALERTS_TOOL_ID,
    SECURITY_LABS_SEARCH_TOOL_ID,
    SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
    WORKFLOW_EXECUTE_STEP_TOOL_ID,
  ],
});
