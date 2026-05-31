/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const endpointResponseActionsSkill = defineSkillType({
  id: 'endpoint-response-actions',
  name: 'endpoint-response-actions',
  basePath: 'skills/security/endpoint',
  description:
    'Execute endpoint response actions (isolate, unisolate, kill process, execute script, etc.) ' +
    'from chat conversations. Resolves hostnames to endpoint identities, confirms impact with the ' +
    'analyst, and dispatches actions through the Elastic Defend Response Actions service. ' +
    'Use when the analyst asks to contain, remediate, or investigate an endpoint.',
  experimental: true,
  content: `# Endpoint Response Actions Skill

## When to Use This Skill

Use this skill when the analyst requests any of the following in natural language:
- Isolate or un-isolate a host
- Kill or suspend a process
- Execute a script or command on an endpoint
- Retrieve a file from an endpoint
- Check running processes on a host
- Query action history or status

## Conversation Flow

### 1. Parse Intent
Identify the action type from the analyst's message:
- **isolate** / **quarantine** / **disconnect** → isolate host
- **unisolate** / **release** / **reconnect** → unisolate host
- **kill** / **terminate** + process name → kill-process
- **suspend** + process name → suspend-process
- **running processes** / **list processes** → running-processes
- **execute** / **run** + script/command → execute
- **get file** / **upload** / **retrieve file** → file operations

Extract the target hostname or IP address from the message using the endpoint metadata service.

### 2. Resolve Host Identity
- Query Fleet/Endpoint metadata to match the hostname to an agent ID
- If multiple hosts match, present a numbered list and ask for clarification
- If no host matches, ask the analyst to verify the hostname
- Check the endpoint's current isolation status before recommending duplicate actions

### 3. Confirm Before Acting (Write Actions Only)
For any state-changing action (isolate, unisolate, kill, suspend, execute, file upload):
- Present the target host name and agent ID
- State the expected impact clearly
- Wait for explicit analyst confirmation before dispatching
- Never execute a write action without confirmation

Read-only queries (running-processes, action history) may proceed without confirmation.

### 4. Execute and Report
- Dispatch the action via the Response Actions service
- Poll for completion status
- Report the result inline: status, action ID, timestamp, and any output
- If the action fails, provide the error message and action ID for manual follow-up
- If the action times out after 30s, provide a link to the Response Console for status check

## Error Handling

| Scenario | Response |
|----------|----------|
| Host not found | Ask analyst to clarify; present top-3 candidates |
| Already isolated/unisolated | Report current status; do not dispatch duplicate |
| Action timeout | "Action timed out. Check status in Response Console with ID: {actionId}" |
| Action failed | Report error message and action ID |
| Insufficient privileges | Inform analyst they lack permission; suggest contacting admin |
| Rate limit (5 concurrent) | Ask analyst to retry in a moment |
| Offline endpoint | Warn that action will queue until endpoint reconnects |

## Best Practices
- Always confirm host identity before executing write actions
- Never guess which host when multiple match
- Keep the analyst informed with progress updates during polling
- Provide actionable next steps on failure (manual lookup URL, alternative actions)
`,
});
