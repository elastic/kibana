/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';

export const getAlertTriageSkill = () =>
  defineSkillType({
    id: 'alert-triage',
    name: 'alert-triage',
    basePath: 'skills/security/alerts',
    description:
      'Guide to systematically triaging security alerts: severity assessment, entity context gathering, threat intelligence correlation, verdict classification (true_positive, benign_true_positive, false_positive), and recommended next actions with confidence scoring.',
    content: `# Alert Triage Guide

## When to Use This Skill

Use this skill when:
- A user asks to triage one or more security alerts
- A user wants a structured verdict on whether an alert is a true positive, benign true positive, or false positive
- A user needs to assess the severity and priority of an alert
- A user wants recommended next actions after triaging an alert
- An analyst needs to quickly classify alerts during an active queue review

## Related Skills

After using this skill, you may want to use:
- '~/skills/security/alerts/investigation' to conduct a deeper investigation after triage identifies a true positive
- '~/skills/security/alerts/response-recommendation' to get containment recommendations for confirmed threats
- '~/skills/security/alerts/incident-reporting' to generate a formal incident report after triage and investigation
- '~/skills/security/entities/entity-analytics' to get entity risk scores and asset criticality for involved entities

## Triage Methodology

### 1. Initial Alert Assessment
- Fetch the alert details using the 'security.alerts' tool
- Review the alert's core attributes:
  - **Severity**: critical, high, medium, low
  - **Timestamp**: when the alert fired and the event timeline
  - **Rule name and description**: what detection logic triggered
  - **MITRE ATT&CK mapping**: which tactics and techniques are referenced
  - **Status**: open, acknowledged, closed, in-progress
- Identify key entities involved: users, hosts, IP addresses, file hashes, domains, process names
- Note any existing assignments, comments, or workflow status updates

### 2. Entity Context Gathering
- For each key entity identified in the alert, gather context:
  - **Entity risk score**: query using ES|QL against risk score indices to determine if the entity has an elevated risk profile
  - **Asset criticality**: check if the entity is tagged as a critical asset (extreme_impact, high_impact, medium_impact, low_impact)
  - **Historical alerts**: search for recent alerts involving the same entity within the last 7-30 days
  - **User activity**: for user entities, check for unusual login patterns, privilege escalation, or access anomalies
  - **Host activity**: for host entities, check for unusual process execution, network connections, or file modifications
- Prioritize entities with high risk scores or critical asset tags for deeper investigation

### 3. Threat Intelligence Correlation
- Query the 'security.security_labs_search' tool for known indicators of compromise (IOCs) related to the alert:
  - File hashes (MD5, SHA256)
  - IP addresses (source, destination)
  - Domain names
  - URLs
  - Email addresses
- Check for matches against known threat actor TTPs (tactics, techniques, and procedures)
- Correlate alert indicators with published threat intelligence reports
- Note any matches with known malware families, campaign names, or APT groups

### 4. Attack Discovery Correlation
- Query the 'security.attack_discovery_search' tool to check if this alert is part of a broader attack pattern
- Look for attack chains or kill chain progression that includes this alert
- Determine if the alert is an isolated event or part of a multi-stage attack
- Review any existing attack discoveries that reference the same entities or techniques

### 5. Verdict Classification
Classify the alert into one of three verdict categories:

#### true_positive (Confidence: 0.0 - 1.0)
- The alert represents a genuine security threat that requires action
- Indicators match known malicious activity or threat intelligence
- Entity behavior deviates significantly from baseline
- Multiple corroborating signals exist (other alerts, anomalies, TI matches)
- **Confidence scoring factors**:
  - 0.90 - 1.00: Multiple independent corroborating signals, TI match, confirmed malicious behavior
  - 0.70 - 0.89: Strong indicators but some ambiguity, single TI match with behavioral correlation
  - 0.50 - 0.69: Suspicious activity with limited corroboration, pattern matches but no direct TI hit
  - 0.30 - 0.49: Weak indicators, could go either way, needs further investigation
  - 0.00 - 0.29: Very low confidence, minimal supporting evidence

#### benign_true_positive (Confidence: 0.0 - 1.0)
- The alert correctly detected the activity, but the activity is authorized or expected
- Common scenarios:
  - Authorized penetration testing or red team exercises
  - Legitimate administrative actions that match detection patterns
  - Known software behavior that triggers security rules (e.g., developer tools, security scanners)
  - Scheduled maintenance activities
  - Approved exceptions documented in security policies
- **Confidence scoring factors**:
  - 0.90 - 1.00: Activity matches a documented exception or known authorized operation
  - 0.70 - 0.89: Activity is consistent with expected behavior but not explicitly documented
  - 0.50 - 0.69: Plausible benign explanation but cannot be fully confirmed
  - 0.00 - 0.49: Uncertain classification, may require human verification

#### false_positive (Confidence: 0.0 - 1.0)
- The alert was triggered by benign activity that does not represent a threat
- Common scenarios:
  - Overly broad detection rule matching legitimate activity
  - Known software bug or misconfiguration generating noise
  - Environmental factors (e.g., network scanning tools, backup processes)
  - Stale or incorrect threat intelligence data
- **Confidence scoring factors**:
  - 0.90 - 1.00: Clear evidence that detection logic is flawed or indicators are stale
  - 0.70 - 0.89: Strong evidence of benign activity with known pattern match
  - 0.50 - 0.69: Likely benign but some uncertainty remains
  - 0.00 - 0.49: Insufficient evidence to confidently classify as false positive

### 6. Recommended Next Actions
Based on the verdict, recommend specific next actions:

#### For true_positive verdicts:
- Escalate to incident response if confidence >= 0.70
- Initiate containment procedures for affected entities
- Create or update a security case with findings
- Trigger the investigation skill for deeper analysis
- Notify relevant stakeholders based on severity

#### For benign_true_positive verdicts:
- Document the benign activity for future reference
- Consider creating a detection rule exception if the pattern recurs
- Update the alert status to acknowledged with classification notes
- Review if the detection rule can be tuned to reduce future benign triggers

#### For false_positive verdicts:
- Document the false positive with supporting evidence
- Recommend rule tuning or threshold adjustment
- Update the alert status to closed with classification notes
- Track false positive rate for the triggering rule

## Output Format

### Structured Triage Report

For each triaged alert, produce the following structured output:

**Alert Summary**
- Alert ID: <alert_id>
- Rule: <rule_name>
- Severity: <severity>
- Timestamp: <timestamp>
- Key Entities: <list of entities with types>

**Triage Findings**
| Step | Finding | Relevance |
| --- | --- | --- |
| Entity Context | <summary> | <high/medium/low> |
| Threat Intel | <summary> | <high/medium/low> |
| Attack Discovery | <summary> | <high/medium/low> |
| Historical Alerts | <summary> | <high/medium/low> |

**Verdict**
- Classification: <true_positive | benign_true_positive | false_positive>
- Confidence: <0.00 - 1.00>
- Reasoning: <2-3 sentences explaining the classification>

**Recommended Actions**
1. <action_1>
2. <action_2>
3. <action_3>

## Examples

### Example 1: Triaging a High-Severity Malware Alert

User query: Triage alert abc123

Steps:
1. Use the 'security.alerts' tool to fetch alert abc123 details.
2. Identify key entities: host "web-server-01", user "svc-deploy", file hash "a1b2c3...".
3. Query entity risk scores using ES|QL to check risk levels for "web-server-01" and "svc-deploy".
4. Use 'security.security_labs_search' to look up the file hash against known malware databases.
5. Use 'security.attack_discovery_search' to check if this alert is part of a broader attack chain.
6. Search for related alerts involving the same host and user in the last 7 days.
7. Classify verdict based on findings: if file hash matches known malware and entity risk is elevated, classify as true_positive with high confidence.
8. Recommend escalation to incident response and containment of the affected host.

### Example 2: Triaging a Batch of Medium-Severity Alerts

User query: Triage the last 10 alerts from the "Suspicious PowerShell Execution" rule

Steps:
1. Use the 'security.alerts' tool to fetch the last 10 alerts matching the rule name.
2. For each alert, identify the executing user and host.
3. Group alerts by entity to identify patterns (e.g., same user on multiple hosts).
4. Query entity risk scores and asset criticality for all unique entities.
5. Use 'security.security_labs_search' to check PowerShell command patterns against known attack techniques.
6. Classify each alert individually, noting common patterns across the batch.
7. Present a summary table with all verdicts and highlight any true positives that need immediate attention.

### Example 3: Triaging a Potential False Positive

User query: Is alert xyz789 a false positive?

Steps:
1. Use the 'security.alerts' tool to fetch alert xyz789 details.
2. Review the triggering rule logic and the specific event that matched.
3. Check if the activity matches known benign patterns (e.g., scheduled backup job, authorized scanning).
4. Query for historical false positives from the same rule using ES|QL.
5. If the activity is consistent with legitimate operations and no threat indicators are found, classify as false_positive with appropriate confidence.
6. Recommend rule tuning if the false positive rate for this rule is high.

## Best Practices
- Always fetch the full alert details before making any classification
- Do not classify an alert without checking at least entity context and threat intelligence
- When confidence is below 0.50, explicitly recommend further investigation rather than a definitive verdict
- Document all evidence that supports the verdict classification
- For batch triage, prioritize critical and high severity alerts first
- Track triage metrics: average time per alert, verdict distribution, confidence distribution
- When in doubt, classify as true_positive with lower confidence rather than dismissing a potential threat
- Always provide actionable next steps, not just the classification
- Reference specific evidence (alert IDs, entity names, TI matches) in the reasoning
- Consider the organizational context: asset criticality and business impact should influence priority
`,
    getRegistryTools: () => [
      platformCoreTools.search,
      platformCoreTools.executeEsql,
      platformCoreTools.cases,
      platformCoreTools.productDocumentation,
    ],
  });
