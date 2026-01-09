/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Skill } from '@kbn/onechat-common/skills';
import { tool } from '@langchain/core/tools';

/**
 * Skill for triaging security alerts.
 * This skill provides knowledge about how to triage security alerts.
 */
const ALERT_TRIAGE_SKILL: Omit<Skill, 'tools'> = {
  namespace: 'security.alert_triage',
  name: 'Alert Triage',
  description: 'Step-by-step guide for triaging security alerts',
  content: `# Alert Triage Guide

This skill provides comprehensive knowledge about triaging security alerts in Elastic Security.

## Overview
Alert triage is the process of evaluating, prioritizing, and determining the appropriate response to security alerts. Effective triage helps security teams focus on genuine threats while efficiently handling false positives and low-priority alerts.

## Triage Process

It is essential that you leverage the "write_todos" tool to write down the steps you plan to take. Use the write_todos to mark steps as complete as you go. You may modify the steps as you discover more information.

### Step 1: Initial Assessment
When reviewing an alert, start by examining:

1. **Alert Severity**: Critical alerts require immediate attention
2. **Alert Age**: Older alerts may indicate ongoing issues or false positives
3. **Rule Context**: Understand what the detection rule is looking for
4. **Risk Score**: Review the risk score of the alert
5. **Investivation guide**: Review the investigation guide for the alert
6. **Source Information**: Review the source IP, user, host, or other relevant entities

### Step 2: Context Gathering
Collect additional context to make informed decisions:

- **Related Alerts**: Check for other alerts involving the same entities (IPs, users, hosts) within a time window of the alert.
- **Historical Activity**: Review past behavior of the entities involved
- **Asset Criticality**: Determine if affected assets are critical to the organization
- **Business Context**: Consider current business operations or known maintenance windows

### Step 2b: De-duplication, correlation, and case scoping (REQUIRED)
If you find **duplicate** or **related** alerts (same entities, same rule, same technique, or same incident window), you must:

1. **Create a new case** to track the incident and avoid triaging duplicates independently.
2. **Attach all related alerts to the case** (so the case becomes the single source of truth).
3. **Extend triage to all alerts in the case**:
   - Triage one representative alert first.
   - Then apply the same triage decision framework to every attached alert, noting any differences (severity, hosts/users, timestamps).
   - Document the consolidated outcome in the case (summary, key pivots, next steps).

**Guardrails**
- Creating a case and attaching alerts is a write operation: you must get explicit user confirmation and pass \`confirm: true\`.

**Example (create case, then attach alerts)**
\`\`\`
tool("invoke_skill", {
  name: "security.cases",
  parameters: {
    operation: "create_case",
    params: {
      title: "Potential incident: related security alerts",
      description: "Grouping duplicate/related alerts for unified triage and documentation.",
      tags: ["triage", "dedupe"],
      confirm: true
    }
  }
})
\`\`\`

Then attach alerts (you must know each alert id + its alerts index):
\`\`\`
tool("invoke_skill", {
  name: "security.cases",
  parameters: {
    operation: "attach_alerts",
    params: {
      caseId: "<case_id>",
      alerts: [
        { "alertId": "<alert_id_1>", "index": "<alerts_index>" },
        { "alertId": "<alert_id_2>", "index": "<alerts_index>" }
      ],
      confirm: true
    }
  }
})
\`\`\`

### Step 3: Threat Assessment
Evaluate the potential threat:

- **False Positive Indicators**:
  - Known maintenance or testing activities
  - Legitimate business processes
  - Misconfigured systems or applications
  - Expected behavior for the user/system

- **True Positive Indicators**:
  - Unusual activity patterns
  - Indicators of compromise (IOCs)
  - Behavior consistent with attack techniques
  - Activity outside normal business hours or locations

### Step 4: Decision Making
Based on your assessment, determine the appropriate action:

- **Acknowledge**: Alert is valid but requires further investigation
- **Close (False Positive)**: Alert does not represent a real threat
- **Close (Benign True Positive)**: Alert is valid but represents expected/acceptable behavior
- **Escalate**: Alert requires immediate attention or advanced investigation

### Step 5: Add Notes
Add notes to the alert to document the triage decision and any other relevant information.

\`\`\`
tool("invoke_skill", {name: "add_alert_note", parameters: {alertId: "<alert_uuid>", note: "<note_content>"}})
\`\`\`

## Triage Criteria

### Severity-Based Prioritization

**Critical Severity**:
- Immediate investigation required
- Potential for significant impact
- May indicate active compromise
- Should be escalated if not resolved quickly

**High Severity**:
- Important security events
- Requires prompt investigation
- May indicate potential threats
- Review within hours

**Medium Severity**:
- Moderate security concerns
- Standard investigation timeline
- May require additional context
- Review within 24 hours

**Low/Info Severity**:
- Minor observations
- Often informational
- Can be batched for review
- May be closed if context is clear

### Workflow Status Management

**Open Status**:
- Default state for new alerts
- Requires triage and decision
- Should not remain open indefinitely

**Acknowledged Status**:
- Alert is under investigation
- Indicates active work on the alert
- Use when investigation is in progress

**Closed Status**:
- Alert has been resolved
- Use appropriate close reasons:
  - False positive
  - Benign true positive
  - Resolved/Remediated
  - Duplicate

## Common Triage Scenarios

### Scenario 1: High Volume of Similar Alerts
- **Action**: Group related alerts and investigate the root cause
- **Consider**: Is this a widespread issue or attack?
- **Decision**: May close duplicates after investigating one representative alert

### Scenario 2: Alert from Known Testing
- **Action**: Verify with the testing team
- **Consider**: Is this part of authorized security testing?
- **Decision**: Close as false positive with appropriate notes

### Scenario 3: Alert on Critical System
- **Action**: Prioritize investigation even if severity is lower
- **Consider**: What is the potential business impact?
- **Decision**: Escalate or acknowledge for deeper investigation

### Scenario 4: Alert with Multiple IOCs
- **Action**: Correlate with other security data
- **Consider**: Are there other indicators of compromise?
- **Decision**: Likely true positive requiring immediate attention

## Best Practices

1. **Consistency**: Follow a standardized triage process for all alerts
2. **Documentation**: Always add notes explaining your triage decision
3. **Timeliness**: Triage alerts promptly to maintain security posture
4. **Learning**: Review triage decisions periodically to improve accuracy
5. **Collaboration**: Consult with team members when uncertain
6. **Context**: Always gather sufficient context before making decisions
7. **Pattern Recognition**: Learn from past alerts to improve future triage speed

## Triage Decision Framework

When triaging an alert, ask yourself:

1. **Is this a real security threat?** (True positive vs. false positive)
2. **What is the potential impact?** (Severity and asset criticality)
3. **What is the urgency?** (Time sensitivity and active threat indicators)
4. **What action is required?** (Investigate, escalate, or close)
5. **What context is needed?** (Additional information to gather)

Remember: Effective triage balances thoroughness with efficiency, ensuring real threats are identified while maintaining operational velocity.`,
};


/**
 * Creates a LangChain DynamicStructuredTool for adding notes to alerts.
 * This is used in skills which require LangChain tools.
 */
export const createAddAlertNoteLangChainTool = () => {
  return tool(({ alertId, note }) => {
    console.log(`Note ${note} been added to alert: ${alertId}`);
    return "Note added"
  }, {
    name: 'add_alert_note',
    description: 'Add a note to an alert to document triage decisions, investigation findings, or other relevant information',
    schema: z.object({
      alertId: z.string().describe('The ID of the alert to add a note to'),
      note: z.string().describe('The note content to add to the alert'),
    }),
  })
};

export const getAlertTriageSkill = (): Skill => {
  // Skills require LangChain DynamicStructuredTool instances
  const addAlertNoteLangChainTool = createAddAlertNoteLangChainTool();

  return {
    ...ALERT_TRIAGE_SKILL,
    tools: [addAlertNoteLangChainTool],
  };
}