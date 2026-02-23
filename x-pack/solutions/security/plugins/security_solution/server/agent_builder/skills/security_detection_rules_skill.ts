/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SECURITY_DETECTION_RULES_SKILL = defineSkillType({
  id: 'security.detection_rules',
  name: 'detection-rules',
  basePath: 'skills/security/alerts/rules',
  description: 'Find/get, enable/disable, and create detection rules safely',
  content: `# Security Detection Rules

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- Detection rules (listing, finding, searching)
- Rule configuration or status
- Enabling/disabling rules
- Creating new rules

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain ONLY information from the tool results.

### When listing/finding rules:
- If rules found: "Found X detection rules:" then list rule names, IDs, and enabled status
- If no rules found: "No detection rules found matching your criteria."

### When getting a rule:
Show the rule details from tool results: name, ID, severity, risk score, enabled status.

## FORBIDDEN RESPONSES
- Do NOT explain what detection rules are
- Do NOT suggest how to create rules unless asked
- Do NOT add information not in tool results

## What this skill does
Helps you find, inspect, enable/disable, and create detection rules.

## When to use
- The user wants to locate a detection rule or inspect its configuration.
- The user explicitly requests enabling/disabling a specific rule.
- The user wants to create a new detection rule.

## Inputs to ask the user for
- **Rule id** (preferred) or identifying details (name, tag)
- For enable/disable/create: explicit user confirmation
- For create: rule name, description, type, query, severity, risk score

## Tools and operations
- Use \`security.detection_rules\`:
  - \`find\`, \`get\` (read-only)
  - \`set_enabled\` (**requires \`confirm: true\`**)
  - \`create\` (**requires \`confirm: true\`**)

## Safe workflow for enable/disable
1) Identify the exact rule(s).
2) If you need a specific rule, **always call \`find\` first** and pick an \`id\`.
3) Call \`get\` with \`params.id\` (required) to inspect the rule.
4) Summarize the impact of enable/disable.
5) Ask for explicit confirmation.
6) Call \`set_enabled\` with \`confirm: true\`.

## Safe workflow for create
1) Gather rule details from the user: name, description, type, query, severity, risk_score.
2) Summarize the rule configuration you will create.
3) Ask for explicit confirmation.
4) Call \`create\` with \`confirm: true\`.

## Supported rule types
- \`query\`: KQL or Lucene query rules
- \`eql\`: Event Query Language rules
- \`esql\`: ES|QL rules
- \`threshold\`: Threshold-based rules
- \`threat_match\`: Indicator match rules
- \`machine_learning\`: ML anomaly detection rules
- \`new_terms\`: New terms rules
- \`saved_query\`: Saved query rules

## Examples (correct parameter shapes)
Find rules:
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "find",
    params: { search: "Windows", page: 1, perPage: 50 }
  }
})
\`\`\`

Get a rule (requires \`params.id\`):
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "get",
    params: { id: "<rule_id>" }
  }
})
\`\`\`

Enable/disable a rule (requires \`confirm: true\`):
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "set_enabled",
    params: { id: "<rule_id>", enabled: false, confirm: true }
  }
})
\`\`\`

Create a query rule (requires \`confirm: true\`):
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "create",
    params: {
      name: "Suspicious PowerShell Execution",
      description: "Detects suspicious PowerShell commands that may indicate malicious activity",
      type: "query",
      query: "process.name: powershell.exe and process.args: (*-enc* or *-encoded* or *downloadstring*)",
      language: "kuery",
      severity: "high",
      risk_score: 75,
      index: ["logs-*", "winlogbeat-*"],
      tags: ["Windows", "PowerShell", "Execution"],
      confirm: true
    }
  }
})
\`\`\`

Create a threshold rule (requires \`confirm: true\`):
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "create",
    params: {
      name: "Multiple Failed Login Attempts",
      description: "Detects multiple failed login attempts from a single source",
      type: "threshold",
      query: "event.action: authentication_failure",
      language: "kuery",
      severity: "medium",
      risk_score: 50,
      threshold: { field: "source.ip", value: 5 },
      index: ["logs-*"],
      confirm: true
    }
  }
})
\`\`\`

Create an ES|QL rule (requires \`confirm: true\`):
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "create",
    params: {
      name: "High Network Traffic",
      description: "Detects hosts with unusually high outbound network traffic",
      type: "esql",
      query: "FROM logs-* | WHERE destination.bytes > 1000000000 | STATS count = COUNT(*) BY host.name | WHERE count > 10",
      language: "esql",
      severity: "medium",
      risk_score: 45,
      confirm: true
    }
  }
})
\`\`\`
`,
  getAllowedTools: () => ['security.detection_rules'],
});
