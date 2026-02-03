/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { platformCoreTools, ToolResultType } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import { entityElement } from '@kbn/agent-builder-common/tools/tool_result';
import { THREAT_HUNTING_AGENT_ID } from '../../../common/constants';
import {
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../tools';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

const PLATFORM_TOOL_IDS = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.cases,
  platformCoreTools.productDocumentation,
  platformCoreTools.generateEsql,
  platformCoreTools.executeEsql,
];

const SECURITY_TOOL_IDS = [
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_ATTACK_DISCOVERY_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
];

export const THREAT_HUNTING_AGENT_TOOL_IDS = [...PLATFORM_TOOL_IDS, ...SECURITY_TOOL_IDS];

function renderEntityResultPrompt() {
  const { entity } = ToolResultType;
  const { tagName, attributes } = entityElement;
  return `### RENDERING ENTITIES (REQUIRED)

When a tool call returns a result of type "${entity}", you MUST render the entity in the UI by emitting a custom XML element:

<${tagName} ${attributes.toolResultId}="TOOL_RESULT_ID_HERE" />

**Critical rules (highest priority)**
* If more than one "${entity}" tool result exists in the conversation, your response MUST include exactly ONE \`<${tagName}>\` element for EACH "${entity}" tool result.
* Never wrap the \`<${tagName}>\` element in backticks or code blocks. Emit it as plain text on its own line.

**Rules**
* For EACH entity, the \`<${tagName}>\` element must only be used to render tool results of type \`${entity}\`.
* For EACH entity, you must copy the \`tool_result_id\` from the tool's response into the \`${attributes.toolResultId}\` element attribute verbatim.
* Do not invent, alter, or guess \`tool_result_id\`. You must use the exact id provided in the tool response.
* You must not include any other attributes or content within the \`<${tagName}>\` element.

**Example Usage:**

Tool response includes:
{
  "tool_result_id": "abc123-host-1",
  "type": "${entity}",
  "data": {
    "id": "host-abc-2",
    "type": "host",
    "score": 72.3
  }
}
{
  "tool_result_id": "abc123-user-2",
  "type": "${entity}",
  "data": {
    "id": "user-123",
    "type": "user",
    "score": 98.3
  }
}

To render these entities your reply should include:
<${tagName} ${attributes.toolResultId}="abc123-host-1" /> AND <${tagName} ${attributes.toolResultId}="abc123-user-2" />

You may also add a brief message about the entities, for example:
"These entities may be related:"
<${tagName} ${attributes.toolResultId}="abc123-host-1" /> <${tagName} ${attributes.toolResultId}="abc123-user-2" />`;
}

export const createThreatHuntingAgent = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltInAgentDefinition => {
  return {
    id: THREAT_HUNTING_AGENT_ID,
    avatar_icon: 'logoSecurity',
    name: 'Threat Hunting Agent',
    description:
      'Agent specialized in security alert analysis tasks, including alert investigation and security documentation.',
    labels: ['security'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    configuration: {
      instructions: `You are a security analyst and expert in resolving security incidents. Your role is to assist by answering questions about Elastic Security.`,
      answer: {
        instructions: renderEntityResultPrompt(),
      },
      tools: [
        {
          tool_ids: THREAT_HUNTING_AGENT_TOOL_IDS,
        },
      ],
    },
  };
};
