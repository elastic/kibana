/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SECURITY_ENDPOINT_RESPONSE_ACTIONS_SKILL = defineSkillType({
  id: 'security.endpoint_response_actions',
  name: 'endpoint-response-actions',
  basePath: 'skills/security/endpoints',
  description:
    'Execute endpoint response actions: isolate/release hosts, kill/suspend processes, retrieve files, execute commands, scan for malware, run scripts. Supports Elastic Defend, CrowdStrike, SentinelOne, and Microsoft Defender.',
  content: `# Endpoint Response Actions

## When to Use This Skill

Use this skill when the user needs to:
- Isolate or release a compromised host
- Kill or suspend a malicious process
- List running processes on an endpoint
- Retrieve a file from an endpoint for analysis
- Execute a shell command on an endpoint
- Scan a file or directory for malware
- Run a script on one or more endpoints
- Check the status of a previously submitted response action

## Multi-Vendor Support

This skill supports multiple endpoint agent types:
- **endpoint** (Elastic Defend) — full support for all operations
- **sentinel_one** — supports isolate, release, get_file, runscript
- **crowdstrike** — supports isolate, release, runscript
- **microsoft_defender_endpoint** — supports isolate, release, runscript

When the user mentions a specific vendor, set the \`agent_type\` parameter accordingly.
If not specified, defaults to \`endpoint\` (Elastic Defend).

## Response Action Workflow

### 1. Identify the Target
- Get the endpoint ID(s) from alert data, entity analytics, or user input
- Confirm the endpoint agent type if multi-vendor

### 2. Execute the Action
- Use the \`security.endpoint_response_actions\` tool with the appropriate operation
- All write operations require \`confirm: true\` — always ask the user first
- Include a \`comment\` describing why the action is being taken

### 3. Track the Action
- After submitting, use \`get_action_status\` to check completion
- Response actions are asynchronous — they may take time to complete

### 4. Link to Cases/Alerts
- Optionally pass \`alert_ids\` and/or \`case_ids\` to associate the action with investigations

## Available Operations

### Host Isolation
- \`isolate\` — Disconnect a host from the network (except Elastic Defend comms)
- \`release\` — Restore network connectivity to an isolated host

### Process Management
- \`kill_process\` — Terminate a process by PID or entity_id
- \`suspend_process\` — Suspend (pause) a process by PID or entity_id
- \`running_processes\` — List all running processes on the endpoint

### File Operations
- \`get_file\` — Download a file from the endpoint for analysis
- \`scan\` — Scan a file or directory path for malware

### Command Execution
- \`execute\` — Run a shell command on the endpoint (Elastic Defend only)
- \`runscript\` — Run a script on the endpoint (supports all vendors)

### Status
- \`get_action_status\` — Check the status of a submitted response action (read-only, no confirmation needed)

## Guardrails
- ALWAYS ask for user confirmation before executing any write operation
- Include clear reasoning in the \`comment\` field for audit trail
- For isolate actions, warn the user that the host will lose network connectivity
- For kill_process, verify the process is actually malicious before killing it
- Never execute commands on production systems without explicit user approval

## Examples

### Isolate a compromised host
\`\`\`
security.endpoint_response_actions({
  operation: "isolate",
  endpoint_ids: ["endpoint-id-here"],
  comment: "Isolating host due to active malware infection detected in alert ABC-123",
  alert_ids: ["alert-id"],
  confirm: true
})
\`\`\`

### Kill a malicious process
\`\`\`
security.endpoint_response_actions({
  operation: "kill_process",
  endpoint_ids: ["endpoint-id-here"],
  parameters: { pid: 12345 },
  comment: "Killing suspicious process identified during triage",
  confirm: true
})
\`\`\`

### Check action status
\`\`\`
security.endpoint_response_actions({
  operation: "get_action_status",
  action_id: "action-id-here"
})
\`\`\`
`,
  getRegistryTools: () => ['security.endpoint_response_actions'],
});
