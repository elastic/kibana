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
export const RUNNING_PROCESSES_TOOL_ID = toolName('get_running_processes');
export const SCAN_TOOL_ID = toolName('scan_host');
export const GET_RESPONSE_ACTION_STATUS_TOOL_ID = toolName('get_response_action_status');

const SYSTEM_INSTRUCTIONS = `# Endpoint Response Actions Skill

## When to Use This Skill

Use when the analyst wants to list enrolled endpoints, check the status of a
host by hostname or agent ID (status, healthy, unhealthy, updating, offline,
inactive, unenrolled; unknown when not yet reported — isolated or not), isolate
or release (unisolate) a host, list a host's running processes, run a malware
scan on a host path, or look up a previously dispatched response action by its
action ID. Not for diagnosing why a host is unhealthy, offline, or missing, or
why an isolation or other response action failed — that routes to the elastic-defend-configuration-troubleshooting
skill.

The response actions available are isolate, release (unisolate), scan, and
running processes; each runs solely through this skill's tools (\`isolate_host\`,
\`unisolate_host\`, \`scan_host\`, \`get_running_processes\`), and all four pause for
the analyst's confirmation. Never improvise one with another
tool, such as a raw API call. Other response actions (execute, kill-process,
suspend-process, get-file, upload, runscript, memory-dump) are not available
from chat: say so and point the analyst to the Response Actions UI.

## Process

0. If the question asks WHY a host is unhealthy, offline, or missing, or WHY a response action (e.g. isolation) failed, stop: do not call this skill's tools; load elastic-defend-configuration-troubleshooting and follow it.

1. **Route intent to the right tool**
   - list / available hosts → \`list_endpoints\`
   - isolate / quarantine / contain → \`isolate_host\` (write, platform-confirmed)
   - release / unisolate / reconnect → \`unisolate_host\` (write, platform-confirmed)
   - status / is isolated → \`get_endpoint_status\`
   - running processes → \`get_running_processes\` (write, platform-confirmed)
   - scan path → \`scan_host\` (write, platform-confirmed)
   - prior action status / action ID → \`get_response_action_status\`

2. **Write tools** — call directly; Agent Builder shows the confirmation card.
   Do not ask for chat confirmation first. If declined, report cancelled.

3. **Report** — always include action ID, status, and output. For pending actions,
   offer \`get_response_action_status\` follow-up. See \`./reference\` for error
   codes and best practices.

## Guardrails

- For status and response action lookups, use the tools above instead of
  \`platform.core.search\` or raw Elasticsearch queries. This does not restrict
  diagnostic queries made by other loaded skills.
- Never claim an endpoint was isolated, released, or scanned, or that its
  process list was retrieved, until the tool result reports it. A write tool pauses for the analyst's confirmation first;
  until then say the action is awaiting confirmation, and if declined report it
  as cancelled.
- Call a write tool directly with the hostname the analyst gave. The tool
  resolves the host itself and returns \`reason: endpoint_not_found\` or
  \`reason: ambiguous_hostname\` or \`reason: ambiguous_ip\` instead of acting on a guess, so no
  \`get_endpoint_status\` pre-check is needed. On either ambiguity result, ask which
  agent ID is meant, then call the same tool again with that \`agentId\`; never
  pick a candidate.
- Branch on the typed signals the tools return: a missing host or action is
  \`found: false\` with \`reason: endpoint_not_found\` / \`reason: action_not_found\`
  (and \`reason: ambiguous_hostname\` / \`reason: ambiguous_ip\` when several endpoints share the supplied identity);
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
      'List enrolled Elastic Defend endpoints, check a host status by hostname or agent ID and its isolation state, isolate or release (unisolate) a host, list running processes, run a malware scan on a host path, and look up a previously dispatched response action by ID. Write actions pause for analyst confirmation; execute, kill-process, get-file, upload, runscript, and memory-dump are not available. For root-cause diagnosis of unhealthy hosts or failed actions, use elastic-defend-configuration-troubleshooting.',
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
