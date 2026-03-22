/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const ALERT_INVESTIGATION_TRIGGER_ID = 'elastic_assistant.alert_created_high_risk';

/**
 * Event payload schema for alert.created trigger
 *
 * Emitted when a high-risk security alert is created
 */
export const AlertCreatedEventSchema = z.object({
  /** Alert ID */
  alert_id: z.string(),
  /** Index where alert is stored */
  alert_index: z.string(),
  /** Alert severity (critical, high, medium, low) */
  severity: z.string(),
  /** Alert risk score (0-100) */
  risk_score: z.number().optional(),
  /** Alert rule name */
  rule_name: z.string().optional(),
  /** Case ID if alert is already attached to a case */
  case_id: z.string().optional(),
  /** Alert timestamp */
  timestamp: z.string(),
});

export type AlertCreatedEvent = z.infer<typeof AlertCreatedEventSchema>;

/**
 * Alert Created (High Risk) Trigger Definition
 *
 * This trigger fires when a high-risk security alert is created,
 * enabling automated investigation workflows
 */
export const alertCreatedTriggerCommonDefinition: CommonTriggerDefinition<
  typeof AlertCreatedEventSchema
> = {
  id: ALERT_INVESTIGATION_TRIGGER_ID,
  title: 'High-Risk Security Alert Created',
  description:
    'Triggered when a high-risk security alert is created (CRITICAL or HIGH severity)',
  documentation: {
    details: `This trigger fires when the detection engine creates a high-risk security alert.

**Trigger Conditions:**
- Alert severity is CRITICAL or HIGH
- Alert is newly created (not updated)
- Alert is in an open state

**Event Payload:**
- \`alert_id\`: Alert identifier
- \`alert_index\`: Index where alert is stored
- \`severity\`: Alert severity level
- \`risk_score\`: Alert risk score (0-100)
- \`rule_name\`: Detection rule that created the alert
- \`case_id\`: Case ID if alert is already attached to a case
- \`timestamp\`: Alert creation timestamp

**Common Use Cases:**
1. **Automated Investigation** - Trigger AI investigation when high-risk alerts are created
2. **Case Creation** - Auto-create security case for CRITICAL alerts
3. **Notification** - Send Slack/email notification to SOC team
4. **Response Actions** - Auto-isolate host for ransomware alerts

**Example Workflow:**
\`\`\`yaml
name: Autonomous Alert Investigation
trigger: ${ALERT_INVESTIGATION_TRIGGER_ID}
steps:
  - name: investigate
    type: elastic_assistant.ai_investigation
    with:
      alert_id: "\${{ trigger.alert_id }}"
      alert_index: "\${{ trigger.alert_index }}"
      connector_id: "my-claude-connector"

  - name: create_case
    type: cases.createCase
    with:
      title: "High-Risk Alert: \${{ trigger.rule_name }}"
      description: "\${{ steps.investigate.outputs.investigation_text }}"
\`\`\`
`,
    examples: [
      `## Trigger AI investigation on high-risk alerts
\`\`\`yaml
name: Auto-Investigate High-Risk Alerts
trigger: ${ALERT_INVESTIGATION_TRIGGER_ID}
steps:
  - name: ai_investigation
    type: elastic_assistant.ai_investigation
    with:
      alert_id: "\${{ trigger.alert_id }}"
      alert_index: "\${{ trigger.alert_index }}"
      connector_id: "claude-connector"
\`\`\``,
      `## Create case and investigate
\`\`\`yaml
name: Create Case and Investigate
trigger: ${ALERT_INVESTIGATION_TRIGGER_ID}
steps:
  - name: create_case
    type: cases.createCase
    with:
      title: "Alert: \${{ trigger.rule_name }}"

  - name: investigate
    type: elastic_assistant.ai_investigation
    with:
      alert_id: "\${{ trigger.alert_id }}"
      alert_index: "\${{ trigger.alert_index }}"
      connector_id: "claude-connector"
      case_id: "\${{ steps.create_case.outputs.case.id }}"

  - name: add_comment
    type: cases.addComment
    with:
      case_id: "\${{ steps.create_case.outputs.case.id }}"
      comment: "\${{ steps.investigate.outputs.investigation_text }}"
\`\`\``,
    ],
  },
  eventSchema: AlertCreatedEventSchema,
};
