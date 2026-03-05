/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
  SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID,
} from '../../tools';

export const detectionEngineeringSkill = defineSkillType({
  id: 'detection-engineering',
  name: 'detection-engineering',
  basePath: 'skills/security/alerts/rules',
  description:
    'Convert threat hunting findings into detection rules and manage rule exceptions. ' +
    'Covers rule type selection (KQL, EQL, ES|QL, threshold), MITRE ATT&CK mapping, ' +
    'severity/risk score assignment, coverage gap analysis, and exception management. ' +
    'Use when creating new detection rules, tuning existing rules, or managing exceptions to reduce false positives.',
  content: `# Detection Engineering Guide

## When to Use This Skill

Use this skill when:
- Converting threat hunting findings into production detection rules
- Creating new detection rules from scratch based on a threat scenario
- Analyzing detection coverage gaps against MITRE ATT&CK framework
- Tuning existing rules that are generating too many false positives
- Creating exceptions to suppress known-good patterns without modifying the rule query
- Reviewing attack discovery results to identify rules that need to be created

## Rule Type Selection

Choose the appropriate rule type based on the detection pattern:

| Rule Type | Best For | Example |
|-----------|----------|---------|
| **KQL** | Simple field-matching detections; fast and readable | process.name: "mimikatz.exe" |
| **EQL** | Multi-step attack patterns, sequences, process trees | sequence by host.name [process where ...] [file where ...] |
| **ES\\|QL** | Aggregation-based detections, statistical anomalies | STATS count BY source.ip \\| WHERE count > threshold |
| **Threshold** | Count-based alerting (brute force, spray) | 10+ failed logins from same source.ip in 5 minutes |

## Rule Creation Process

### 1. Define the Threat Scenario
- Identify the specific attack technique (MITRE ATT&CK sub-technique when available)
- Determine the expected data sources and relevant index patterns
- Review existing coverage using 'security.attack_discovery_search' to check for gaps
- Check existing alerts using 'security.alerts' to understand the current detection landscape

### 2. Write the Detection Query
- Prefer ECS field names for portability across data sources
- For EQL sequences, always include a \`maxspan\` to bound correlation windows
- For KQL, use AND/OR explicitly — implicit AND can be confusing
- For threshold rules, pick group-by fields that produce actionable groupings

### 3. Assign MITRE Mapping and Severity
- Map to the most specific technique (sub-technique when available)
- Multiple tactics per rule are valid when behavior spans phases
- Severity: **critical** = confirmed destructive, **high** = strong signal, **medium** = needs context, **low** = informational
- Risk score correlation: critical 75-100, high 50-74, medium 25-49, low 1-24

### 4. Create the Rule
- Use 'security.create_detection_rule' with a natural language description of the rule
- The tool will analyze the query, identify relevant data sources, generate ES|QL queries, and produce a complete rule
- Set \`from: now-6m\` for 5-minute interval rules (1 minute overlap prevents gaps)

### 5. Test and Tune
- Query against production data to estimate alert rate before enabling
- If the rule is too noisy, consider:
  - Narrowing the query scope with additional conditions
  - Adding exceptions for known-good patterns using 'security.manage_rule_exceptions'
  - Switching to a more specific rule type (e.g., from KQL to EQL sequence)

## Exception Management

### When to Create Exceptions
- The alert is a **benign true positive**: technically correct but the activity is known-good
- Examples: admin tools, scheduled tasks, CI/CD pipelines, security scanning tools
- **Never** create exceptions to suppress symptoms of a noisy rule — fix the query instead

### How to Create Exceptions
- Use 'security.manage_rule_exceptions' to add exception items to rules
- Provide the rule_id, a descriptive name, clear reason, and entry conditions
- Exception entry types: match (exact), match_any (list), exists (field presence), wildcard (pattern)
- All entries within an item are AND-ed together
- Add tags for traceability and review

### Exception Best Practices
- Scope exceptions to the specific rule unless the pattern is universally benign
- Document why the exception was created and who approved it
- Review exceptions quarterly — remove any that no longer apply

## Rule Templates

Reference the templates in the ./templates directory for common detection patterns:
- kql-rule: Parameterized KQL detection rule template
- eql-sequence: Parameterized EQL sequence rule template with maxspan/by clause
- threshold-rule: Parameterized threshold rule template

## Cross-References
- Use the threat-hunting skill to explore data and formulate detection hypotheses
- Use the alert-analysis skill to investigate alerts generated by your rules`,
  referencedContent: [
    {
      relativePath: './templates',
      name: 'kql-rule',
      content: `# KQL Detection Rule Template

## Simple Field Match
\`\`\`
process.name: "PROCESS_NAME" AND event.action: "start"
\`\`\`

## Multi-Condition with NOT
\`\`\`
process.name: "powershell.exe"
  AND process.args: ("-enc" OR "-encodedcommand" OR "-e")
  AND NOT process.parent.name: ("jenkins.exe" OR "agent.exe")
\`\`\`

## Network Connection to Rare Destination
\`\`\`
event.category: "network"
  AND destination.ip: "SUSPICIOUS_IP"
  AND NOT process.name: ("chrome.exe" OR "firefox.exe" OR "msedge.exe")
\`\`\`

## Configuration
- **Index**: logs-endpoint.events.process-*, winlogbeat-*
- **Interval**: 5m
- **From**: now-6m (1 minute overlap)
- **Severity**: Set based on detection confidence and impact`,
    },
    {
      relativePath: './templates',
      name: 'eql-sequence',
      content: `# EQL Sequence Rule Template

## Process Injection Sequence
\`\`\`eql
sequence by host.name with maxspan=5m
  [process where event.action == "start"
    and process.name in ("rundll32.exe", "regsvr32.exe")]
  [file where event.action in ("creation", "modification")
    and file.extension in ("dll", "exe")]
\`\`\`

## Credential Access via LSASS
\`\`\`eql
sequence by host.name with maxspan=1m
  [process where event.action == "start"
    and process.name in ("procdump.exe", "mimikatz.exe", "taskmgr.exe")]
  [process where event.action == "start"
    and process.parent.name == "lsass.exe"]
\`\`\`

## Lateral Movement via Remote Service
\`\`\`eql
sequence by user.name with maxspan=10m
  [authentication where event.outcome == "success"
    and source.ip != "127.0.0.1"]
  [process where event.action == "start"
    and process.name in ("psexec.exe", "wmic.exe")]
\`\`\`

## Configuration
- Always include \`maxspan\` to bound the correlation window
- Use \`by\` clause on the entity that ties the sequence together
- Index: logs-endpoint.events.process-*, winlogbeat-*`,
    },
    {
      relativePath: './templates',
      name: 'threshold-rule',
      content: `# Threshold Detection Rule Template

## Brute Force Login
- **Query**: event.category: "authentication" AND event.outcome: "failure"
- **Threshold**: count >= 10
- **Group by**: source.ip, user.name
- **Interval**: 5m
- **From**: now-6m
- **Severity**: medium (escalate to high if source.ip is external)

## Port Scanning
- **Query**: event.category: "network" AND event.action: "connection_attempted"
- **Threshold**: count_distinct(destination.port) >= 20
- **Group by**: source.ip, destination.ip
- **Interval**: 5m
- **From**: now-6m
- **Severity**: medium

## Data Exfiltration (Volume-Based)
- **Query**: event.category: "network" AND network.direction: "outbound"
- **Threshold**: sum(network.bytes) >= 100000000
- **Group by**: source.ip, process.name
- **Interval**: 15m
- **From**: now-16m
- **Severity**: high`,
    },
  ],
  getRegistryTools: () => [
    SECURITY_ALERTS_TOOL_ID,
    SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
    SECURITY_CREATE_DETECTION_RULE_TOOL_ID,
    SECURITY_MANAGE_RULE_EXCEPTIONS_TOOL_ID,
  ],
});
