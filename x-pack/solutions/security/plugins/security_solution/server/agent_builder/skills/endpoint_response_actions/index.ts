/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { getEndpointStatusTool, listEndpointsTool, getResponseActionStatusTool } from './tools';
import { ENDPOINT_RESPONSE_ACTIONS_REFERENCE } from './skill_reference';

const ID = 'endpoint-response-actions';
const NAME = 'endpoint-response-actions';
const BASE_PATH = 'skills/security/endpoint';
function toolName(name: string) {
  return `${ID}.${name}`;
}
export const GET_ENDPOINT_STATUS_TOOL_ID = toolName('get_endpoint_status');
export const LIST_ENDPOINTS_TOOL_ID = toolName('list_endpoints');
export const GET_RESPONSE_ACTION_STATUS_TOOL_ID = toolName('get_response_action_status');

const SYSTEM_INSTRUCTIONS = `# Endpoint Response Actions Skill

## When to Use This Skill

Use when the analyst wants to list enrolled endpoints, check the status of a
host (online/offline, isolated or not), or look up a previously dispatched
response action by its action ID.

This skill is **read-only**. It cannot isolate, release, scan, or otherwise
change the state of an endpoint. If the analyst asks for a state-changing
action (isolate, release/unisolate, scan, running processes, execute,
kill-process, get-file, upload, runscript, memory-dump), say it is not
available from chat and point them to the Response Actions UI — never
improvise one with another tool.

## Process

1. **Route intent to the right tool**
   - list / available hosts → \`list_endpoints\`
   - status / is it isolated → \`get_endpoint_status\`
   - prior action status / action ID → \`get_response_action_status\`

2. **Report** — include host identity and state, or the action ID, status, and
   output. See \`./reference\` for error codes and best practices.

## Guardrails

- Never use \`platform.core.search\` or raw Elasticsearch queries for endpoint
  or response action state — use the tools above.
- Never claim an endpoint was isolated, released, or scanned. This skill only
  reads state.
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
      'Read endpoint response action context from chat conversations: list enrolled endpoints, check a host status (online/offline and isolation state), and look up a previously dispatched response action by ID. Resolves hostnames to endpoint identities via the Elastic Defend Response Actions service. Read-only — it does not isolate, release, or scan endpoints.',
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
      getEndpointStatusTool(endpointAppContextService),
      getResponseActionStatusTool(endpointAppContextService),
    ],
  });
};
