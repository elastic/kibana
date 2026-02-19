/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';

import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { getPackageConfigurationsTool, generateInsightTool } from './tools';
import { AVAILABLE_INDICES } from './data_sources';

const ID = 'automatic_troubleshooting';
const NAME = 'elastic_defend_configuration_troubleshooting';
const BASE_PATH = 'skills/security/endpoint';
function toolName(name: string) {
  return `${ID}.${name}`;
}
export const GET_PACKAGE_CONFIGURATIONS_TOOL_ID = toolName('get_package_configurations');
export const GENERATE_INSIGHT_TOOL_ID = toolName('generate_insight');

export const createAutomaticTroubleshootingSkill = (
  endpointAppContextService: EndpointAppContextService
): SkillDefinition<typeof NAME, typeof BASE_PATH> => {
  const systemInstructions = `# Elastic Defend Configuration Troubleshooting

This skill provides guidance for diagnosing and resolving Elastic Defend configuration issues on endpoints.

## When to use this skill

Use this skill when:
- When a user is having issues with Elastic Defend configuration on one or more endpoints.

## Available Indices

Reference './available_indices' for the list of indices available for troubleshooting queries. Only query indices listed there.

## Troubleshooting Tools

- **${platformCoreTools.integrationKnowledge}** - Retrieve Elastic Defend knowledge base context to inform the analysis
- **${platformCoreTools.search}** - Query raw data from available indices for troubleshooting evidence
- **${platformCoreTools.getDocumentById}** - Retrieve full document content by ID from query results
- **${GET_PACKAGE_CONFIGURATIONS_TOOL_ID}** - Inspect Elastic Defend package configuration details
- **${GENERATE_INSIGHT_TOOL_ID}** - Persist structured troubleshooting findings (mandatory final step)

## Troubleshooting Approach

1. **Gather context** - Use ${platformCoreTools.integrationKnowledge} to retrieve relevant Elastic Defend knowledge that informs the analysis approach.
2. **Investigate data** - Use ${platformCoreTools.search} to query relevant indices for evidence of errors, warnings, misconfigurations, or incompatibilities. Use ${platformCoreTools.getDocumentById} to retrieve full documents when needed. Use ${GET_PACKAGE_CONFIGURATIONS_TOOL_ID} to inspect Elastic Defend package configuration if relevant.
3. **Iterate** - Continue querying and gathering context until the root cause or relevant findings are understood.
4. **Persist findings** - Call ${GENERATE_INSIGHT_TOOL_ID} with a clear problem description, actionable remediation steps, affected endpoint IDs, and relevant raw documents.

## Constraints

- Only query indices listed in './available_indices.md'
- Always include document \`_id\` and \`_index\` fields in search queries
- Keep query result sets small enough to fit within context limits
- Base all conclusions on actual queried data, not assumptions
- **Always call ${GENERATE_INSIGHT_TOOL_ID}** to persist findings — this is mandatory and must not be skipped`;

  return defineSkillType({
    id: ID,
    name: NAME,
    basePath: BASE_PATH,
    description: 'Troubleshoot Elastic Defend endpoint configuration issues',
    content: systemInstructions,
    referencedContent: [
      {
        relativePath: '.',
        name: 'available_indices',
        content: JSON.stringify(AVAILABLE_INDICES, null, 2),
      },
    ],
    getRegistryTools: () => [
      platformCoreTools.search,
      platformCoreTools.getDocumentById,
      platformCoreTools.integrationKnowledge,
    ],
    getInlineTools: () => {
      return [getPackageConfigurationsTool(endpointAppContextService), generateInsightTool()];
    },
  });
};
