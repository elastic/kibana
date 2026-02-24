/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import { SECURITY_ENDPOINT_RESPONSE_ACTIONS_TOOL_ID } from '../tools/endpoint_response_actions_tool';
import { SECURITY_ENDPOINT_STATUS_TOOL_ID } from '../tools/endpoint_status_tool';
import { SECURITY_ENDPOINT_ACTION_HISTORY_TOOL_ID } from '../tools/endpoint_action_history_tool';

type SecuritySolutionPluginCoreSetupDependencies = CoreSetup<
  SecuritySolutionPluginStartDependencies,
  SecuritySolutionPluginStart
>;

const ID = 'elastic-defend';
const NAME = 'elastic-defend';
const BASE_PATH = 'skills/security/endpoint';

export const createElasticDefendSkill = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): SkillDefinition<typeof NAME, typeof BASE_PATH> =>
  defineSkillType({
    id: ID,
    name: NAME,
    basePath: BASE_PATH,
    description:
      'Interact with Elastic Defend endpoints: query endpoint status and metadata, execute response actions (isolate, kill process, get file, execute commands), and review action history.',
    content: `# Elastic Defend Endpoint Interactions

This skill enables you to interact with endpoints managed by Elastic Defend. You can query endpoint status, execute response actions, and review action history.

## Safety Protocol

**CRITICAL**: Response actions can have significant impact on endpoints and their users.

### Autonomous Actions (no confirmation needed)
- Querying endpoint status and metadata
- Listing managed endpoints
- Checking agent health
- Viewing action history and details
- Listing running processes on an endpoint

### Actions Requiring User Confirmation
Before executing ANY of the following, you MUST:
1. Present a clear summary: target endpoint(s) hostname + agent ID, the action, and why
2. Wait for explicit user approval
3. Only then call the tool

- **isolate** -- Network-isolate an endpoint (the host can only communicate with Elastic)
- **unisolate** -- Release an endpoint from network isolation
- **kill_process** -- Terminate a process on the endpoint
- **suspend_process** -- Suspend a process on the endpoint
- **execute** -- Run a shell command on the endpoint
- **get_file** -- Retrieve a file from the endpoint
- **scan** -- Scan a file path on the endpoint for malware

## Action Completion Behavior

Response actions are **asynchronous** -- the endpoint agent must pick up the action and execute it. The tool automatically polls for completion (up to 120 seconds) and returns the final result including any output data.

- **Fast actions** (get_processes, kill_process, suspend_process): Usually complete in 5-15 seconds
- **Medium actions** (isolate, unisolate, scan): Usually complete in 10-30 seconds
- **Slow actions** (execute, get_file): May take longer depending on the command or file size

If an action does not complete within 120 seconds, the tool returns the action_id with a "pending" status. In that case, use the \`endpoint_action_history\` tool with action "details" and the returned action_id to check the result later. Do NOT re-submit the same action -- it is still running.

## Workflow: Investigating an Alert

1. **Identify the endpoint**: Extract \`agent.id\` from the alert, or use the endpoint_status tool to search by hostname
2. **Check endpoint health**: Use endpoint_status "get" or "agent_status" to confirm the endpoint is online
3. **Gather context**: Use endpoint_status "list" to understand the environment, or ES|QL to query endpoint events
4. **List processes** (if needed): Use endpoint_response_actions "get_processes" to see what's running
5. **Take action** (with confirmation): Isolate the host, kill a suspicious process, retrieve a file for analysis, etc. The tool will wait for completion and return the result.
6. **Verify**: The action result is returned automatically. If it timed out, use endpoint_action_history "details" with the action_id to check later.

## Workflow: Responding to an Incident

1. **Scope the incident**: Use endpoint_status "list" with KQL filters to find affected endpoints
2. **Contain**: Isolate compromised endpoints (with user confirmation)
3. **Investigate**: Execute commands to gather forensic data, retrieve suspicious files
4. **Remediate**: Kill malicious processes, scan paths for malware
5. **Recover**: Unisolate endpoints once remediation is confirmed

## Tool Reference

### endpoint_status
- \`list\`: Find endpoints by hostname, OS, status. Use KQL like \`united.endpoint.host.hostname:SRVWIN*\`
- \`get\`: Get full metadata for a single endpoint by agent ID
- \`agent_status\`: Check if specific endpoints are online/healthy

### endpoint_response_actions
All actions automatically wait up to 120s for completion and return the result with any output data.
- \`isolate\` / \`unisolate\`: Network isolation control
- \`kill_process\` / \`suspend_process\`: Process control (provide pid or entity_id in parameters)
- \`get_processes\`: List running processes (read-only, no confirmation needed)
- \`execute\`: Run a command -- returns stdout/stderr directly in the result
- \`get_file\`: Retrieve a file from the endpoint
- \`scan\`: Scan a path for malware (provide path in parameters)

### endpoint_action_history
- \`list\`: View past actions with filters (agent, command type, status, date range)
- \`details\`: Get full output/result of a completed action
- \`status\`: Check pending action counts per endpoint

## Parameter Examples

Kill a process by PID:
\`\`\`json
{"action": "kill_process", "endpoint_ids": ["agent-id-here"], "parameters": "{\\"pid\\":\\"1234\\"}", "comment": "Killing suspicious process"}
\`\`\`

Execute a command:
\`\`\`json
{"action": "execute", "endpoint_ids": ["agent-id-here"], "parameters": "{\\"command\\":\\"ls -la /tmp\\",\\"timeout\\":600}", "comment": "Listing temp directory contents"}
\`\`\`

Retrieve a file:
\`\`\`json
{"action": "get_file", "endpoint_ids": ["agent-id-here"], "parameters": "{\\"path\\":\\"/etc/passwd\\"}", "comment": "Retrieving passwd file for analysis"}
\`\`\`

Scan a path:
\`\`\`json
{"action": "scan", "endpoint_ids": ["agent-id-here"], "parameters": "{\\"path\\":\\"/tmp/suspicious_binary\\"}", "comment": "Scanning suspicious file"}
\`\`\`
`,
    referencedContent: [
      {
        name: 'response-action-parameters',
        relativePath: './reference',
        content: `# Response Action Parameters

## isolate / unisolate
- endpoint_ids: string[] (required)
- comment: string (optional)

## kill_process / suspend_process
Parameters (JSON string):
- pid: string -- Process ID to target
- entity_id: string -- Alternative: Elastic entity_id from process events
One of pid or entity_id is required.

## get_processes
- endpoint_ids: string[] (required)
- No additional parameters needed

## execute
Parameters (JSON string):
- command: string (required) -- Shell command to execute
- timeout: number (optional) -- Timeout in seconds, default 600

## get_file
Parameters (JSON string):
- path: string (required) -- Full path to the file to retrieve

## scan
Parameters (JSON string):
- path: string (required) -- Full path to scan for malware

## Common Response Fields
All response actions return:
- action: string -- The action ID (use with action_history "details" to check results)
- data.command: string -- The command that was executed
- data.comment: string -- The comment provided
- agents: string[] -- Target agent IDs
`,
      },
    ],
    getRegistryTools: () => [
      SECURITY_ENDPOINT_RESPONSE_ACTIONS_TOOL_ID,
      SECURITY_ENDPOINT_STATUS_TOOL_ID,
      SECURITY_ENDPOINT_ACTION_HISTORY_TOOL_ID,
      platformCoreTools.executeEsql,
    ],
    getInlineTools: () => [],
  });
