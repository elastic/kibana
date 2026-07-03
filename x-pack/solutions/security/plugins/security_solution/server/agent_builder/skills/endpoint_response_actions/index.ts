/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  isolateHostTool,
  unisolateHostTool,
  getEndpointStatusTool,
  listEndpointsTool,
  getRunningProcessesTool,
  scanHostTool,
} from './tools';

const ID = 'endpoint-response-actions';
const NAME = 'endpoint-response-actions';
const BASE_PATH = 'skills/security/endpoint';
function toolName(name: string) {
  return `${ID}.${name}`;
}
export const ISOLATE_TOOL_ID = toolName('isolate_host');
export const UNISOLATE_TOOL_ID = toolName('unisolate_host');
export const GET_ENDPOINT_STATUS_TOOL_ID = toolName('get_endpoint_status');
export const LIST_ENDPOINTS_TOOL_ID = toolName('list_endpoints');
export const RUNNING_PROCESSES_TOOL_ID = toolName('running_processes');
export const SCAN_TOOL_ID = toolName('scan');

const SYSTEM_INSTRUCTIONS = `# Endpoint Response Actions Skill

## When to Use This Skill

Use this skill when the analyst requests any of the following in natural language:
- List available endpoints that response actions can target
- Isolate (contain) or release (reconnect) a host
- Check the status of a host (isolation state, last seen, online/offline)
- List the running processes on a host (read-only inspection)
- Scan a file or folder path on a host for malware (uses the existing Defend policy)

This is Slice 1 of the Endpoint Response Actions skill: containment, read-only,
and low-risk inspection only. High-risk execution actions (execute, kill-process,
suspend-process, get-file, upload, runscript, memory-dump) are intentionally NOT
part of this skill yet — do not attempt them.

## Conversation Flow

### 1. Parse Intent
Identify the action type from the analyst's message:
- **list** / **show** / **which endpoints** / **available hosts** → use \`list_endpoints\` tool (read-only)
- **isolate** / **quarantine** / **contain** / **disconnect** → use \`isolate_host\` tool (WRITE — platform-confirmed)
- **release** / **unisolate** / **reconnect** → use \`unisolate_host\` tool (WRITE — platform-confirmed)
- **status** / **check** / **is isolated** → use \`get_endpoint_status\` tool (read-only)
- **processes** / **running processes** / **what is running** → use \`running_processes\` tool (read-only)
- **scan** / **scan for malware** / **check path** → use \`scan\` tool (WRITE — platform-confirmed)

### 2. Write Actions Are Confirmed by the Platform
Write actions (\`isolate_host\`, \`unisolate_host\`, \`scan\`) are gated by an
automatic confirmation prompt enforced by Agent Builder: when you call one of
these tools the analyst is shown a confirmation card and the action dispatches
only if they accept. You do NOT need to run your own confirmation step or wait
for a "yes" in chat — call the tool directly with the resolved host (and, for
\`scan\`, the path), and let the platform gate the dispatch. If the analyst
declines, report that the action was cancelled.

Read-only actions (\`list_endpoints\`, \`get_endpoint_status\`, \`running_processes\`)
are not gated and execute immediately.

### 3. Execute and Report
- Call the appropriate tool
- Report the result inline: action ID, status, and any output
- The action ID is the audit anchor — always surface it so the operator can
  reconstruct the action in the Response Actions history view, linked to the
  initiating user and this agent session, even after the chat thread is closed
- If the action fails, provide the error message and action ID for manual follow-up

## Error Handling

| Scenario | Response |
|----------|----------|
| No endpoints found | Report that no endpoints with Elastic Defend are enrolled |
| Host not found | Ask analyst to clarify; try alternative hostname |
| Already isolated/unisolated | Report current status from \`get_endpoint_status\` |
| Action timeout | "Action timed out. Check status in Response Console." |
| Action failed | Report error message and action ID |
| Insufficient privileges | Inform analyst they lack permission |

## Best Practices
- When the analyst asks to see available endpoints, use \`list_endpoints\` first
- Always verify host identity before executing write actions
- Always verify current status with \`get_endpoint_status\` before isolate/release
- Keep the analyst informed with progress updates`;

export const createEndpointResponseActionsSkill = (
  endpointAppContextService: EndpointAppContextService
): SkillDefinition<typeof NAME, typeof BASE_PATH> => {
  return defineSkillType({
    id: ID,
    name: NAME,
    basePath: BASE_PATH,
    description:
      'Execute endpoint response actions (isolate, release, check status, list running processes, scan for malware) from chat conversations. Resolves hostnames to endpoint identities and dispatches actions through the Elastic Defend Response Actions service. Write actions require analyst confirmation.',
    content: SYSTEM_INSTRUCTIONS,
    getInlineTools: () => [
      listEndpointsTool(endpointAppContextService),
      isolateHostTool(endpointAppContextService),
      unisolateHostTool(endpointAppContextService),
      getEndpointStatusTool(endpointAppContextService),
      getRunningProcessesTool(endpointAppContextService),
      scanHostTool(endpointAppContextService),
    ],
  });
};
