/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_RESPONSE_ACTIONS_TOOL_ID,
  SECURITY_CASE_MANAGE_TOOL_ID,
} from '../../tools';

export const getResponseRecommendationSkill = () =>
  defineSkillType({
    id: 'response-recommendation',
    name: 'response-recommendation',
    basePath: 'skills/security/alerts',
    experimental: true,
    description:
      'Guide to assessing blast radius and producing confidence-scored containment recommendations: evaluate compromise scope, rank response actions by effectiveness and risk, output confidence scores (0.0-1.0) with rollback procedures.',
    content: `# Response Recommendation Guide

## When to Use This Skill

Use this skill when:
- An investigation has confirmed active compromise requiring response
- An analyst requests containment or remediation recommendations
- A workflow needs confidence-scored response actions for automated decision-making
- Post-triage escalation requires blast radius assessment

## Response Recommendation Process

### 1. Assess Blast Radius

**Identify affected scope:**
- Query all entities (hosts, users, services) involved in the confirmed compromise
- Determine which systems have confirmed indicators vs. suspected exposure
- Assess lateral movement potential from compromised systems
- Evaluate data exposure: what sensitive data is accessible?
- Check business impact: are compromised systems critical?

**Blast radius categories:**
- **Contained**: Single host/user, no lateral movement evidence
- **Limited**: 2-5 entities with some lateral movement but segmented
- **Broad**: Multiple segments, active lateral movement
- **Critical**: Crown jewel systems, domain controllers, sensitive data stores

### 2. Evaluate Response Actions

For each potential response action, evaluate:
- **Effectiveness**: How completely does this contain the threat?
- **Disruption**: What legitimate operations are affected?
- **Reversibility**: Can this be rolled back? How quickly?

### 3. Confidence Scoring

Assign a confidence score (0.0 - 1.0) to each recommendation:

**Evidence quality (0.0 - 0.4):**
- 0.0-0.1: Speculation based on general patterns
- 0.1-0.2: Weak correlation, limited evidence
- 0.2-0.3: Moderate evidence from multiple sources
- 0.3-0.4: Strong evidence with confirmed IOCs

**Indicator reliability (0.0 - 0.3):**
- 0.0-0.1: Unverified, single source
- 0.1-0.2: Partially verified, some disagreement
- 0.2-0.3: Well-verified from trusted, independent sources

**Action appropriateness (0.0 - 0.3):**
- 0.0-0.1: Speculative, may not address threat
- 0.1-0.2: Addresses part of the threat
- 0.2-0.3: Directly addresses confirmed threat vector

**Automation thresholds:**
- **>= 0.90**: Auto-execute with audit logging
- **0.70 - 0.89**: Execute with analyst notification
- **< 0.70**: Require human approval

### 4. Available Response Actions

**Host-Level:**
- Endpoint isolation (high effectiveness, high disruption, reversible)
- Process termination (medium effectiveness, low disruption, not reversible)
- Process suspension (medium effectiveness, low disruption, reversible)

**Case-Level:**
- Create case with severity, attach alerts, escalate status

**Detection-Level:**
- Create rules for discovered TTPs, add exceptions for benign positives

## Output Format

**Blast Radius Assessment:**
- Scope: [Contained | Limited | Broad | Critical]
- Affected entities: [Count and list]
- Lateral movement risk: [Low | Medium | High]
- Data exposure risk: [Low | Medium | High]
- Business impact: [Low | Medium | High | Critical]

**Recommended Actions (ranked):**

1. **[Action Name]**
   - Confidence: [0.0 - 1.0]
   - Target: [Entity]
   - Rationale: [Why recommended]
   - Disruption: [Low | Medium | High]
   - Rollback: [Steps to reverse]
   - Automation: [Auto-execute | Notify | Require approval]

## Important Guidelines
- Safety first: when in doubt, require human approval
- Preserve forensic evidence: never recommend destructive actions
- Proportional response: match response to confirmed threat level
- Every recommendation must include a rollback procedure
- Never inflate confidence scores — they drive automation decisions

## Containment Options Reference

### Host-Level Containment
- **Network isolation**: Disconnect the host from the network while preserving forensic state
- **Process termination**: Kill specific malicious processes
- **Service disabling**: Disable compromised services
- **Full endpoint isolation**: Use Elastic Defend to isolate the endpoint

### Account-Level Containment
- **Password reset**: Force credential rotation for compromised accounts
- **Session termination**: Revoke all active sessions
- **Account disabling**: Temporarily disable the account
- **MFA enforcement**: Require re-enrollment of multi-factor authentication

### Network-Level Containment
- **IP blocking**: Block communication with identified C2 infrastructure
- **DNS sinkholing**: Redirect malicious domain resolutions
- **Firewall rule updates**: Restrict lateral movement paths

## Rollback Procedures
For every recommended action, provide a clear rollback procedure:
- **Network isolation rollback**: Steps to reconnect the host, verify clean state, and restore network access
- **Account disabling rollback**: Steps to re-enable the account, verify no unauthorized changes, and confirm identity
- **Process termination rollback**: Steps to restart legitimate services that may have been affected
- **Firewall rule rollback**: Steps to remove temporary blocking rules once the threat is neutralized

## Safety Guidelines
- **Never auto-execute destructive actions** without explicit confirmation from an authorized analyst
- Always provide rollback procedures — assume every action might need to be reversed
- Consider business impact: isolating a critical server may cause more damage than the threat itself
- When confidence is below 0.70, present the evidence and let the human decide
- Prefer reversible containment actions over irreversible ones when confidence is not high
- Document every action taken and its rationale in the associated case
- If the blast radius assessment reveals a critical or widespread compromise, explicitly recommend engaging the incident response team and executive leadership`,
    getRegistryTools: () => [
      platformCoreTools.search,
      platformCoreTools.executeEsql,
      platformCoreTools.cases,
      platformCoreTools.productDocumentation,
      SECURITY_ALERTS_TOOL_ID,
      SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
      SECURITY_RESPONSE_ACTIONS_TOOL_ID,
      SECURITY_CASE_MANAGE_TOOL_ID,
    ],
  });
