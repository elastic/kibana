/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const mitreMappingSchema = z.object({
  indicators: z
    .array(z.string().max(500))
    .min(1)
    .max(20)
    .describe(
      'An array of strings describing security behaviors, TTPs, or findings to map to MITRE ATT&CK techniques (e.g., "lateral movement via PsExec", "credential dumping from LSASS")'
    ),
  context: z
    .string()
    .optional()
    .describe(
      'Additional context about the environment, alert, or investigation to improve mapping accuracy'
    ),
});

export const SECURITY_MITRE_MAPPING_TOOL_ID = securityTool('mitre_mapping');

const MITRE_MAPPING_SYSTEM_PROMPT = `You are an expert threat intelligence analyst specializing in the MITRE ATT&CK framework.
Given a list of security behaviors, TTPs, or findings, map each one to the most relevant MITRE ATT&CK techniques and sub-techniques.

For each mapping, provide:
- technique_id: The MITRE ATT&CK technique or sub-technique ID (e.g., "T1059.001")
- technique_name: The human-readable name of the technique (e.g., "PowerShell")
- tactic: The tactic phase(s) this technique belongs to (e.g., "Execution")
- confidence: A confidence score from 0.0 to 1.0 indicating how well the behavior matches
- reasoning: A brief explanation of why this mapping was chosen

Return your response as a JSON object with this exact structure:
{
  "mappings": [
    {
      "indicator": "<the original input indicator>",
      "techniques": [
        {
          "technique_id": "T1059.001",
          "technique_name": "PowerShell",
          "tactic": "Execution",
          "confidence": 0.95,
          "reasoning": "The behavior directly describes PowerShell script execution"
        }
      ]
    }
  ]
}

Only return valid JSON, no additional text or markdown.`;

export const mitreMappingTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof mitreMappingSchema> => {
  return {
    id: SECURITY_MITRE_MAPPING_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Map security behaviors, alerts, or findings to MITRE ATT&CK techniques and sub-techniques. Returns technique IDs, names, tactic phases, and confidence scores.',
    schema: mitreMappingSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ indicators, context }, { modelProvider }) => {
      logger.debug(
        `${SECURITY_MITRE_MAPPING_TOOL_ID} tool called with ${indicators.length} indicators`
      );

      try {
        const model = await modelProvider.getDefaultModel();
        const chatModel = model.chatModel;

        const userMessage = [
          `Map the following security behaviors/findings to MITRE ATT&CK techniques:`,
          '',
          ...indicators.map((indicator, i) => `${i + 1}. ${indicator}`),
          ...(context ? ['', `Additional context: ${context}`] : []),
        ].join('\n');

        const response = await chatModel.invoke([
          { role: 'system', content: MITRE_MAPPING_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ]);

        const responseText =
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);

        // Extract JSON from the response, handling potential markdown code blocks
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: 'Failed to parse MITRE mapping response from model',
                },
              },
            ],
          };
        }

        const parsedResponse = JSON.parse(jsonMatch[0]);

        if (
          !parsedResponse.mappings ||
          !Array.isArray(parsedResponse.mappings)
        ) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message:
                    'Invalid MITRE mapping response structure: expected { mappings: [...] }',
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                mappings: parsedResponse.mappings,
                indicator_count: indicators.length,
                technique_count: parsedResponse.mappings.reduce(
                  (acc: number, m: { techniques?: unknown[] }) =>
                    acc + (Array.isArray(m.techniques) ? m.techniques.length : 0),
                  0
                ),
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in ${SECURITY_MITRE_MAPPING_TOOL_ID} tool: ${errorMessage}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error mapping to MITRE ATT&CK: ${errorMessage}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'mitre', 'threat-intelligence'],
  };
};
