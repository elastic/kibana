/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';

/**
 * Detection engineering skill for security operations.
 * Guides the agent through the full detection rule lifecycle: creation, monitoring,
 * tuning, investigation, and management.
 */
export const createDetectionRuleCreationSkill = (
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger
) =>
  defineSkillType({
  id: 'detection-engineering',
  name: 'detection-engineering',
  basePath: 'skills/security/detection',
  description:
    'Full detection engineering lifecycle for Elastic Security. Covers rule creation (all 8 types), rule management (read/update/delete), exception management (create/find/delete), execution history monitoring, alert investigation, MITRE ATT&CK mapping, and query validation. Use when the user asks about detection rules, exceptions, rule health, or detection tuning.',
  content: `# Detection Engineering Guide

## Overview

This skill guides you through the full detection engineering lifecycle in Elastic Security: creating rules, monitoring their execution, tuning with exceptions, investigating alerts, and managing rules.

## Workflow

### Phase 1: Rule Creation

#### 1. Understand the Threat

Before building a rule, clarify:
- What threat or behavior should be detected?
- What data sources are available (e.g., endpoint logs, network traffic, cloud audit logs)?
- What is the expected frequency and severity of the activity?
- Should the rule detect a single event, a sequence, a threshold, or a new behavior?

#### 2. Select the Rule Type

Choose the rule type based on the detection scenario:

| Scenario | Rule Type | When to Use |
|----------|-----------|-------------|
| Behavioral sequences / event correlation | \`eql\` | Detect ordered sequences of events (e.g., process A spawns process B within 5 minutes) |
| Simple field matching | \`query\` | Match events using KQL (e.g., \`process.name: "mimikatz.exe"\`) |
| General analytics / aggregations | \`esql\` | Complex aggregations, joins, or transformations using ES\|QL |
| Count / frequency-based | \`threshold\` | Alert when event count exceeds a threshold (e.g., >10 failed logins in 5 minutes) |
| Threat intel correlation | \`threat_match\` | Match events against threat intelligence indicators (IP, domain, hash) |
| Statistical anomaly | \`machine_learning\` | Detect anomalies using ML jobs (e.g., unusual process execution) |
| First-time activity | \`new_terms\` | Alert when a field value appears for the first time (e.g., new user accessing a system) |
| Saved search reuse | \`saved_query\` | Reuse an existing saved search as a detection rule |

#### 3. Discover Available Data

Use the bound tools to verify data sources exist:
- Call \`platform.core.list_indices\` to list available indices matching the expected data source pattern (e.g., \`logs-endpoint.*\`, \`filebeat-*\`, \`auditbeat-*\`)
- Call \`platform.core.get_index_mapping\` to inspect field names and types for the target index

#### 4. Generate the Rule

**For ES|QL rules:** Call the \`security.create_detection_rule\` tool with a natural language description. This tool uses an AI agent to generate the ES|QL query, name, description, tags, MITRE mappings, and schedule automatically. Note: this tool generates the rule configuration but does NOT create it. You must then call \`security.detection-rule-creation.create-rule\` with the generated configuration to persist it.

**For all other rule types:** Construct the rule JSON manually. Refer to the [rule-schemas](./reference/rule-schemas.md) reference for required fields per rule type. All rules require these base fields:
- \`name\` (string, min 1 char)
- \`description\` (string, min 1 char)
- \`risk_score\` (integer, 0-100)
- \`severity\` ("low", "medium", "high", or "critical")
- \`type\` (the rule type string)

Then add type-specific fields. For example, a \`query\` rule also needs \`query\` and \`language\`, while a \`threshold\` rule needs \`query\`, \`language\`, and a \`threshold\` object.

#### 5. Validate the Query

Before finalizing, test the query against live data:
- Use \`platform.core.execute_esql\` to run the query (or an equivalent ES|QL query) against the target indices
- Verify the query returns expected results and does not produce excessive false positives
- Check that field names and values match the actual index mappings

#### 6. Check for Overlapping Detections

Use \`security.alerts\` to search for existing alerts that cover similar scenarios. This prevents creating duplicate or redundant rules.

#### 7. Enrich with MITRE ATT&CK

Add MITRE ATT&CK mappings to the \`threat\` array. Refer to the [mitre-reference](./reference/mitre-reference.md) for the full list of tactics and the correct JSON structure.

#### 8. Set the Schedule

Configure the rule schedule:
- \`interval\`: How often the rule runs (e.g., "5m", "1h")
- \`from\`: How far back to look (e.g., "now-6m" for a 5m interval with 1m lookback buffer)
- \`to\`: Always "now"

#### 9. Create the Rule

Once the rule configuration is complete, call the \`security.detection-rule-creation.create-rule\` tool with the full rule JSON to create it in Elastic Security. The tool will return the created rule with its assigned ID.

### Phase 2: Monitoring & Tuning

#### 10. Review Execution History

After a rule has been running, check its health:
- Call \`security.get_rule_execution_history\` with the rule's ID to see recent executions
- Look for: execution status (succeeded/failed/partial failure), duration, alert counts, gaps, schedule delays
- If there are failures, check the error messages for query syntax issues, missing indices, or permission problems
- If there are gaps, the rule may need a longer lookback window or the cluster may be under load

#### 11. Tune with Exceptions

If the rule produces false positives, suppress them with exceptions:
- Call \`security.manage_rule_exceptions\` with action "create" to add exception items
- Exception entries match on field/value pairs: e.g., exclude process.name "chrome.exe" or source.ip "10.0.0.1"
- Supported entry types: "match" (exact), "match_any" (any of), "exists" (field exists), "wildcard" (pattern)
- Supported operators: "included" (must match to suppress) or "excluded" (must NOT match to suppress)
- Refer to the [exception-schemas](./reference/exception-schemas.md) reference for the full entry schema

To review existing exceptions:
- Call \`security.manage_rule_exceptions\` with action "find" and the exception list ID
- Use \`security.manage_detection_rules\` with action "read" to get the rule's \`exceptions_list\` field which contains linked exception list IDs

#### 12. Investigate Historical Alerts

To understand what a rule has detected:
- Call \`security.alerts\` with a natural language query like "alerts from rule <rule_name> in the last 7 days"
- Review alert severity, affected hosts/users, and timeline of detections
- Use findings to decide if the rule needs tuning (too noisy) or enhancement (missing detections)

### Phase 3: Rule Management

#### 13. Manage Rules

Use \`security.manage_detection_rules\` for ongoing rule lifecycle operations:
- **Read**: Get full rule details by ID (\`action: "read"\`)
- **Find**: Search for rules by name, tag, or other attributes (\`action: "find"\`)
- **Patch**: Update rule fields like \`enabled\`, \`tags\`, \`severity\`, \`query\`, etc. (\`action: "patch"\`)
- **Delete**: Remove a rule (\`action: "delete"\`)

Common operations:
- Enable/disable: \`patch_body: {"id": "...", "enabled": true/false}\`
- Update severity: \`patch_body: {"id": "...", "severity": "high", "risk_score": 73}\`
- Add tags: \`patch_body: {"id": "...", "tags": ["Domain: Endpoint", "Tactic: Persistence"]}\`

## Best Practices

- Prefer ES|QL for new rules when the detection logic involves aggregations or complex field transformations
- Use EQL for sequence-based detections where event ordering matters
- Set risk_score proportional to severity: low ~21, medium ~47, high ~73, critical ~99
- Always add relevant tags for categorization (e.g., "Domain: Endpoint", "OS: Windows", "Use Case: Threat Detection")
- Include an investigation guide in the \`note\` field to help analysts respond to alerts
- Set \`enabled: false\` initially for new rules so they can be reviewed before activation
- Monitor execution history regularly -- failed rules provide no detection coverage
- Add exceptions rather than modifying queries to handle known false positives
- Use time-based exception expiry for temporary suppressions`,
  referencedContent: [
    {
      relativePath: './reference',
      name: 'rule-schemas',
      content: `# Detection Rule Schemas

## Base Required Fields (all rule types)

| Field | Type | Description |
|-------|------|-------------|
| \`name\` | string (min 1) | Rule name |
| \`description\` | string (min 1) | Rule description |
| \`risk_score\` | integer (0-100) | Numerical risk score |
| \`severity\` | "low" \\| "medium" \\| "high" \\| "critical" | Severity level |
| \`type\` | string | Rule type discriminator |

## Base Optional Fields (all rule types)

| Field | Type | Default |
|-------|------|---------|
| \`enabled\` | boolean | true |
| \`tags\` | string[] | [] |
| \`interval\` | string | "5m" |
| \`from\` | string (datemath) | "now-6m" |
| \`to\` | string | "now" |
| \`max_signals\` | integer (min 1) | 100 |
| \`threat\` | Threat[] | [] |
| \`note\` | string | (investigation guide) |
| \`references\` | string[] | [] |
| \`false_positives\` | string[] | [] |
| \`author\` | string[] | [] |
| \`rule_id\` | string | (auto-generated) |
| \`actions\` | RuleAction[] | [] |
| \`exceptions_list\` | RuleExceptionList[] | [] |
| \`setup\` | string | "" |
| \`related_integrations\` | RelatedIntegration[] | [] |
| \`required_fields\` | RequiredFieldInput[] | [] |
| \`investigation_fields\` | { field_names: string[] } | - |
| \`building_block_type\` | string | - |
| \`response_actions\` | ResponseAction[] | - |

## Per-Type Required Fields

### query (KQL/Lucene)

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | "query" | Required |
| \`query\` | string | KQL or Lucene query (defaults to empty) |
| \`language\` | "kuery" \\| "lucene" | Defaults to "kuery" |
| \`index\` | string[] | Optional index patterns |
| \`data_view_id\` | string | Optional data view |
| \`filters\` | object[] | Optional filters |
| \`alert_suppression\` | object | Optional |

Example:
\`\`\`json
{
  "type": "query",
  "name": "Detect root and admin users",
  "description": "Detects activity from root or admin user accounts",
  "query": "user.name: root or user.name: admin",
  "language": "kuery",
  "severity": "high",
  "risk_score": 55,
  "index": ["auditbeat-*"],
  "tags": ["Domain: IAM", "Use Case: Threat Detection"]
}
\`\`\`

### eql (Event Query Language)

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | "eql" | Required |
| \`query\` | string | EQL query (required) |
| \`language\` | "eql" | Required, must be "eql" |
| \`index\` | string[] | Optional index patterns |
| \`event_category_override\` | string | Optional |
| \`tiebreaker_field\` | string | Optional |
| \`timestamp_field\` | string | Optional |

Example:
\`\`\`json
{
  "type": "eql",
  "name": "Suspicious regsvr32 execution",
  "description": "Detects execution of regsvr32.exe which may indicate DLL side-loading",
  "query": "process where process.name == \\"regsvr32.exe\\"",
  "language": "eql",
  "severity": "high",
  "risk_score": 55,
  "index": ["auditbeat-*", "logs-endpoint.events.*"]
}
\`\`\`

### esql (ES|QL)

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | "esql" | Required |
| \`query\` | string | ES\\|QL query (required) |
| \`language\` | "esql" | Required, must be "esql" |

Example:
\`\`\`json
{
  "type": "esql",
  "name": "Detect root and admin users via ES|QL",
  "description": "Uses ES|QL to detect activity from privileged accounts",
  "query": "from auditbeat-* | where user.name==\\"root\\" or user.name==\\"admin\\"",
  "language": "esql",
  "severity": "high",
  "risk_score": 55,
  "interval": "5m",
  "from": "now-6m"
}
\`\`\`

### threshold

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | "threshold" | Required |
| \`query\` | string | KQL/Lucene query (required) |
| \`language\` | "kuery" \\| "lucene" | Defaults to "kuery" |
| \`threshold\` | object | Required: { field: string \\| string[], value: integer, cardinality?: { field: string, value: integer }[] } |
| \`index\` | string[] | Optional |

Example:
\`\`\`json
{
  "type": "threshold",
  "name": "Brute force login attempts",
  "description": "Detects excessive failed login attempts from a single source",
  "query": "event.action: \\"authentication_failure\\"",
  "language": "kuery",
  "threshold": {
    "field": ["source.ip"],
    "value": 10,
    "cardinality": [{ "field": "user.name", "value": 3 }]
  },
  "severity": "medium",
  "risk_score": 47,
  "index": ["auditbeat-*", "filebeat-*"]
}
\`\`\`

### threat_match (Indicator Match)

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | "threat_match" | Required |
| \`query\` | string | KQL/Lucene query for source events (required) |
| \`language\` | "kuery" \\| "lucene" | Defaults to "kuery" |
| \`threat_query\` | string | Query for threat indicator index (required) |
| \`threat_index\` | string[] | Threat indicator indices (required) |
| \`threat_mapping\` | array | Field mappings between source and indicator (required): [{ entries: [{ field: string, value: string, type: "mapping" }] }] |
| \`threat_indicator_path\` | string | Optional, defaults to "threat.indicator" |
| \`threat_language\` | "kuery" \\| "lucene" | Optional |
| \`concurrent_searches\` | integer | Optional |
| \`items_per_search\` | integer | Optional |
| \`index\` | string[] | Optional |

Example:
\`\`\`json
{
  "type": "threat_match",
  "name": "Threat intel IP match",
  "description": "Matches network events against known malicious IP indicators",
  "query": "event.category: network",
  "language": "kuery",
  "threat_query": "*:*",
  "threat_index": ["filebeat-threatintel-*"],
  "threat_indicator_path": "threat.indicator",
  "threat_mapping": [
    { "entries": [{ "field": "destination.ip", "value": "threat.indicator.ip", "type": "mapping" }] }
  ],
  "severity": "critical",
  "risk_score": 99,
  "index": ["packetbeat-*", "filebeat-*"]
}
\`\`\`

### machine_learning

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | "machine_learning" | Required |
| \`anomaly_threshold\` | integer (min 0) | Required |
| \`machine_learning_job_id\` | string \\| string[] | Required |

Example:
\`\`\`json
{
  "type": "machine_learning",
  "name": "Unusual process execution",
  "description": "Detects anomalous process execution patterns using ML",
  "anomaly_threshold": 50,
  "machine_learning_job_id": "v3_linux_anomalous_process_all_hosts",
  "severity": "low",
  "risk_score": 21
}
\`\`\`

### new_terms

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | "new_terms" | Required |
| \`query\` | string | KQL/Lucene query (required) |
| \`language\` | "kuery" \\| "lucene" | Defaults to "kuery" |
| \`new_terms_fields\` | string[] | 1-3 fields to monitor for new values (required) |
| \`history_window_start\` | string | Datemath for history baseline (required, e.g., "now-7d") |
| \`index\` | string[] | Optional |

Example:
\`\`\`json
{
  "type": "new_terms",
  "name": "First time user login to host",
  "description": "Detects when a user logs into a host for the first time",
  "query": "event.action: \\"authentication_success\\"",
  "language": "kuery",
  "new_terms_fields": ["user.name", "host.name"],
  "history_window_start": "now-7d",
  "severity": "medium",
  "risk_score": 47,
  "index": ["auditbeat-*"]
}
\`\`\`

### saved_query

| Field | Type | Notes |
|-------|------|-------|
| \`type\` | "saved_query" | Required |
| \`saved_id\` | string | ID of a saved search (required) |
| \`query\` | string | Optional override query |
| \`language\` | "kuery" \\| "lucene" | Defaults to "kuery" |
| \`index\` | string[] | Optional |

Example:
\`\`\`json
{
  "type": "saved_query",
  "name": "Detection from saved search",
  "description": "Uses an existing saved search to detect threats",
  "saved_id": "my-saved-search-id",
  "severity": "high",
  "risk_score": 55
}
\`\`\``,
    },
    {
      relativePath: './reference',
      name: 'mitre-reference',
      content: `# MITRE ATT&CK Reference

## Threat Array Structure

Each entry in the rule's \`threat\` array must follow this structure:

\`\`\`json
{
  "framework": "MITRE ATT&CK",
  "tactic": {
    "id": "TA0001",
    "name": "Initial Access",
    "reference": "https://attack.mitre.org/tactics/TA0001/"
  },
  "technique": [
    {
      "id": "T1566",
      "name": "Phishing",
      "reference": "https://attack.mitre.org/techniques/T1566/",
      "subtechnique": [
        {
          "id": "T1566.001",
          "name": "Spearphishing Attachment",
          "reference": "https://attack.mitre.org/techniques/T1566/001/"
        }
      ]
    }
  ]
}
\`\`\`

- \`framework\` is always "MITRE ATT&CK"
- \`tactic\` is required
- \`technique\` is optional (array of techniques under the tactic)
- \`subtechnique\` is optional (array of subtechniques under a technique)
- A rule can have multiple entries in the \`threat\` array (one per tactic)

## URL Patterns

- Tactics: \`https://attack.mitre.org/tactics/{id}/\`
- Techniques: \`https://attack.mitre.org/techniques/{id}/\`
- Subtechniques: \`https://attack.mitre.org/techniques/{parentId}/{subId}/\`

## MITRE ATT&CK Tactics

| ID | Name |
|----|------|
| TA0043 | Reconnaissance |
| TA0042 | Resource Development |
| TA0001 | Initial Access |
| TA0002 | Execution |
| TA0003 | Persistence |
| TA0004 | Privilege Escalation |
| TA0005 | Defense Evasion |
| TA0006 | Credential Access |
| TA0007 | Discovery |
| TA0008 | Lateral Movement |
| TA0009 | Collection |
| TA0011 | Command and Control |
| TA0010 | Exfiltration |
| TA0040 | Impact |

## Common Technique Examples

### Initial Access (TA0001)
- T1566 Phishing (T1566.001 Spearphishing Attachment, T1566.002 Spearphishing Link)
- T1078 Valid Accounts (T1078.001 Default Accounts, T1078.003 Local Accounts, T1078.004 Cloud Accounts)
- T1190 Exploit Public-Facing Application

### Execution (TA0002)
- T1059 Command and Scripting Interpreter (T1059.001 PowerShell, T1059.003 Windows Command Shell, T1059.004 Unix Shell)
- T1204 User Execution (T1204.001 Malicious Link, T1204.002 Malicious File)

### Persistence (TA0003)
- T1053 Scheduled Task/Job (T1053.005 Scheduled Task)
- T1547 Boot or Logon Autostart Execution (T1547.001 Registry Run Keys)
- T1136 Create Account (T1136.001 Local Account, T1136.003 Cloud Account)

### Privilege Escalation (TA0004)
- T1548 Abuse Elevation Control Mechanism (T1548.002 Bypass User Account Control)
- T1068 Exploitation for Privilege Escalation

### Defense Evasion (TA0005)
- T1070 Indicator Removal (T1070.001 Clear Windows Event Logs, T1070.004 File Deletion)
- T1036 Masquerading (T1036.005 Match Legitimate Name or Location)
- T1562 Impair Defenses (T1562.001 Disable or Modify Tools)

### Credential Access (TA0006)
- T1003 OS Credential Dumping (T1003.001 LSASS Memory, T1003.008 /etc/passwd and /etc/shadow)
- T1110 Brute Force (T1110.001 Password Guessing, T1110.003 Password Spraying)

### Discovery (TA0007)
- T1087 Account Discovery (T1087.001 Local Account, T1087.002 Domain Account)
- T1082 System Information Discovery
- T1518 Software Discovery

### Lateral Movement (TA0008)
- T1021 Remote Services (T1021.001 Remote Desktop Protocol, T1021.002 SMB/Windows Admin Shares)
- T1570 Lateral Tool Transfer

### Collection (TA0009)
- T1005 Data from Local System
- T1114 Email Collection

### Command and Control (TA0011)
- T1071 Application Layer Protocol (T1071.001 Web Protocols)
- T1105 Ingress Tool Transfer
- T1572 Protocol Tunneling

### Exfiltration (TA0010)
- T1041 Exfiltration Over C2 Channel
- T1567 Exfiltration Over Web Service

### Impact (TA0040)
- T1486 Data Encrypted for Impact
- T1489 Service Stop
- T1490 Inhibit System Recovery`,
    },
    {
      relativePath: './reference',
      name: 'exception-schemas',
      content: `# Exception Entry Schemas

## Exception Item Structure

When creating exceptions via \`security.manage_rule_exceptions\`, each item in the \`exception_items\` array must follow this structure:

\`\`\`json
{
  "type": "simple",
  "name": "Exception name",
  "description": "Why this exception exists",
  "entries": [
    {
      "field": "process.name",
      "operator": "included",
      "type": "match",
      "value": "chrome.exe"
    }
  ],
  "namespace_type": "single",
  "os_types": [],
  "tags": [],
  "expire_time": "2025-12-31T00:00:00Z",
  "comments": [{ "comment": "Added to suppress known false positive" }]
}
\`\`\`

## Entry Types

| Type | Description | Value Field |
|------|------------|-------------|
| \`match\` | Exact field value match | \`value\`: string |
| \`match_any\` | Match any of multiple values | \`value\`: string[] |
| \`exists\` | Field exists (no value needed) | - |
| \`wildcard\` | Wildcard pattern match | \`value\`: string (supports * and ?) |
| \`nested\` | Match on nested object fields | \`entries\`: Entry[] (sub-entries) |
| \`list\` | Match against a value list | \`list\`: { id, type } |

## Operators

| Operator | Effect |
|----------|--------|
| \`included\` | Alert is suppressed when the entry matches |
| \`excluded\` | Alert is suppressed when the entry does NOT match |

## Examples

### Suppress alerts for a specific process
\`\`\`json
{
  "type": "simple",
  "name": "Exclude Chrome updates",
  "description": "Chrome update process triggers false positives",
  "entries": [
    { "field": "process.name", "operator": "included", "type": "match", "value": "GoogleUpdate.exe" },
    { "field": "process.parent.name", "operator": "included", "type": "match", "value": "chrome.exe" }
  ]
}
\`\`\`

### Suppress alerts for internal IP ranges
\`\`\`json
{
  "type": "simple",
  "name": "Exclude internal scanner",
  "description": "Internal vulnerability scanner triggers network alerts",
  "entries": [
    { "field": "source.ip", "operator": "included", "type": "match_any", "value": ["10.0.0.50", "10.0.0.51"] }
  ]
}
\`\`\`

### Temporary exception with expiry
\`\`\`json
{
  "type": "simple",
  "name": "Temporary maintenance window",
  "description": "Suppress during scheduled maintenance",
  "entries": [
    { "field": "host.name", "operator": "included", "type": "match", "value": "server-01" }
  ],
  "expire_time": "2025-03-01T00:00:00Z"
}
\`\`\``,
    },
  ],
  getRegistryTools: () => [
    'security.create_detection_rule',
    'security.alerts',
    'security.manage_rule_exceptions',
    'security.get_rule_execution_history',
    'security.manage_detection_rules',
    'platform.core.execute_esql',
    'platform.core.get_index_mapping',
  ],
  getInlineTools: () => [],
});
