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
  content: `# Alert Analysis Skill

## When to use

The question is about: triaging a specific alert, correlating related alerts by \`alertId\`,
Security Labs threat intel, or entity risk signals.

## Tool selection (one rule per question shape)

| Question shape | Tool |
|---|---|
| Correlation by \`alertId\` | \`platform.workflows.workflow_execute_step\` — see Related Alerts API below |
| List/prioritize alerts (e.g. "high/critical last 24h") | \`security.alerts\` |
| Security Labs intel (e.g. "Lazarus techniques") | \`security.security_labs_search\` |
| Entity risk score (e.g. "risk score for DC01") | \`security.entity_risk_score\` |

Hard rules:
- When an \`alertId\` is present, call \`workflow_execute_step\` **directly**.
  Do NOT first call \`security.alerts\` to "fetch alert context".
- \`security.alerts\`, \`security.security_labs_search\`, and \`security.entity_risk_score\`
  are top-level registry tools. NEVER nest them as \`type: security.alerts\`
  inside a workflow YAML — they are not workflow step types.
- If \`workflow_execute_step\` returns \`"alert not found"\` or any explicit error,
  STOP and report the error verbatim. Do NOT verify by listing all alerts.
- If \`security.security_labs_search\` returns an install-not-completed error
  pointing at the GenAI Settings page, surface that link to the user as the
  final answer; do NOT retry the tool, do NOT call other tools to compensate,
  and do NOT fabricate threat intelligence — the install is a prerequisite
  the user must complete first.

## Related Alerts API (correlation by alertId)

Use this exact \`workflow_execute_step\` call shape. The (POST, ${ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH})
pair is registered as read-only, so the confirmation dialog is skipped automatically.

\`\`\`
tool_id: platform.workflows.workflow_execute_step
params:
  stepName: get_related_alerts
  confirmation_body: |
    Correlate related alerts for \`<alert-id>\` over the last 24h (read-only API).
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
          headers:
            elastic-api-version: "1"
          body:
            alertId: "<alert-id>"
            timeWindowHours: 24
\`\`\`

Optional body fields: \`timeWindowHours\` (default 24, max 168),
\`hostNames\` / \`userNames\` / \`sourceIps\` / \`destIps\` (arrays, pass when already known),
\`maxResults\` (bounded server-side).

The response is token-budgeted and may include truncation metadata.`,
  getRegistryTools: () => [
    SECURITY_ALERTS_TOOL_ID,
    SECURITY_LABS_SEARCH_TOOL_ID,
    SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
    WORKFLOW_EXECUTE_STEP_TOOL_ID,
  ],
});
