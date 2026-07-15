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
  getResponseActionStatusTool,
} from './tools';
import { ENDPOINT_RESPONSE_ACTIONS_REFERENCE } from './skill_reference';

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
export const GET_RESPONSE_ACTION_STATUS_TOOL_ID = toolName('get_response_action_status');

const SYSTEM_INSTRUCTIONS = `# Endpoint Response Actions Skill

## When to Use This Skill

Use when the analyst wants to list endpoints, isolate or release a host, check
host status, list running processes, scan a path for malware, or look up a prior
response action by ID. Slice 1 only — do not attempt execute, kill-process,
get-file, upload, runscript, or memory-dump.

## Process

1. **Route intent to the right tool**
   - list / available hosts → \`list_endpoints\`
   - isolate / quarantine / contain → \`isolate_host\` (write, platform-confirmed)
   - release / unisolate / reconnect → \`unisolate_host\` (write, platform-confirmed)
   - status / is isolated → \`get_endpoint_status\`
   - running processes → \`running_processes\`
   - scan path → \`scan\` (write, platform-confirmed)
   - prior action status / action ID → \`get_response_action_status\`

2. **Write tools** — call directly; Agent Builder shows the confirmation card.
   Do not ask for chat confirmation first. If declined, report cancelled.

3. **Report** — always include action ID, status, and output. For pending actions,
   offer \`get_response_action_status\` follow-up. See \`./reference\` for error
   codes and best practices.

## Guardrails

- Verify host with \`get_endpoint_status\` before isolate/release.
- Never use \`platform.core.search\` for response action status.
- Branch on typed tool errors (\`insufficient_privileges\`, \`endpoint_not_found\`,
  \`action_not_found\`, \`unknown_error\`) — details in \`./reference\`.`;

export const createEndpointResponseActionsSkill = (
  endpointAppContextService: EndpointAppContextService
): SkillDefinition<typeof NAME, typeof BASE_PATH> => {
  return defineSkillType({
    id: ID,
    name: NAME,
    basePath: BASE_PATH,
    description:
      'Execute endpoint response actions (isolate, release, check status, list running processes, scan for malware, look up prior action status) from chat conversations. Resolves hostnames to endpoint identities and dispatches actions through the Elastic Defend Response Actions service. Write actions require analyst confirmation.',
    content: SYSTEM_INSTRUCTIONS,
    referencedContent: [
      {
        relativePath: '.',
        name: 'reference',
        content: ENDPOINT_RESPONSE_ACTIONS_REFERENCE,
      },
    ],
    getInlineTools: () => [
      listEndpointsTool(endpointAppContextService),
      isolateHostTool(endpointAppContextService),
      unisolateHostTool(endpointAppContextService),
      getEndpointStatusTool(endpointAppContextService),
      getRunningProcessesTool(endpointAppContextService),
      scanHostTool(endpointAppContextService),
      getResponseActionStatusTool(endpointAppContextService),
    ],
  });
};
