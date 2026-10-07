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
host by hostname or agent ID (status, healthy, unhealthy, updating, offline,
inactive, unenrolled; unknown when not yet reported — isolated or not), or look
up a previously dispatched response action by its action ID. Not for diagnosing
why a host is unhealthy, offline, or missing, or why an isolation or other
response action failed — that routes to the elastic-defend-configuration-troubleshooting
skill.

This skill is **read-only**. It cannot isolate, release, scan, or otherwise
change the state of an endpoint. If the analyst asks for a state-changing
action (isolate, release/unisolate, scan, running processes, execute,
kill-process, get-file, upload, runscript, memory-dump), say it is not
available from chat and point them to the Response Actions UI — never
improvise one with another tool.

## Process

0. If the question asks WHY a host is unhealthy, offline, or missing, or WHY a response action (e.g. isolation) failed, stop: do not call this skill's tools; load elastic-defend-configuration-troubleshooting and follow it.

1. **Route intent to the right tool**
   - list / available hosts → \`list_endpoints\`
   - status / is it isolated → \`get_endpoint_status\`
   - prior action status / action ID → \`get_response_action_status\`

2. **Report** — include host identity and state, or the action ID, status, and
   output. See \`./reference\` for error codes and best practices.

## Guardrails

- For status and response action lookups, use the tools above instead of
  \`platform.core.search\` or raw Elasticsearch queries. This does not restrict
  diagnostic queries made by other loaded skills.
- Never claim an endpoint was isolated, released, or scanned. This skill only
  reads state.
- Branch on the typed signals the tools return: a missing host or action is
  \`found: false\` with \`reason: endpoint_not_found\` / \`reason: action_not_found\`
  (and \`reason: ambiguous_hostname\` when several endpoints share the name);
  \`error: invalid_argument\` means the request itself was out of range (narrow
  filters instead of paging further), while \`error: insufficient_privileges\`
  and \`error: unknown_error\` mean the lookup itself could not run. Details in
  \`./reference\`.`;

export const createEndpointResponseActionsSkill = (
  endpointAppContextService: EndpointAppContextService
): SkillDefinition<typeof NAME, typeof BASE_PATH> => {
  return defineSkillType({
    id: ID,
    name: NAME,
    basePath: BASE_PATH,
    description:
      'List enrolled Elastic Defend endpoints, check a host status by hostname or agent ID and its isolation state, and look up a previously dispatched response action by ID. Read-only — it does not isolate, release, or scan endpoints. For root-cause diagnosis of unhealthy hosts or failed actions, use elastic-defend-configuration-troubleshooting.',
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
