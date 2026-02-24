/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

export const SECURITY_PERSIST_DETECTION_RULE_TOOL_ID = securityTool('persist_detection_rule');

const persistDetectionRuleSchema = z.object({
  rule_config: z
    .string()
    .describe(
      'The complete detection rule configuration as a JSON string. Must include required fields: name, description, risk_score (0-100), severity (low/medium/high/critical), type (query/eql/esql/threshold/threat_match/machine_learning/new_terms/saved_query), and any type-specific fields. Refer to the Elastic Security detection engine API documentation for the full schema.'
    ),
});

export const persistDetectionRuleTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof persistDetectionRuleSchema> => {
  return {
    id: SECURITY_PERSIST_DETECTION_RULE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Create and persist a detection rule in Elastic Security. Accepts a complete rule configuration JSON for any of the 8 rule types (query, eql, esql, threshold, threat_match, machine_learning, new_terms, saved_query) and creates it via the Detection Engine API. The rule_config must be a valid JSON string containing at minimum: name, description, risk_score, severity, and type. Returns the created rule with its assigned ID.',
    schema: persistDetectionRuleSchema,
    tags: ['security', 'detection', 'rule-creation', 'siem'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async ({ rule_config: ruleConfigStr }, { request }) => {
      try {
        const ruleConfig = JSON.parse(ruleConfigStr);

        const { protocol, hostname, port } = core.http.getServerInfo();
        const basePath = core.http.basePath.serverBasePath;
        const url = `${protocol}://${hostname}:${port}${basePath}/api/detection_engine/rules`;

        const authHeader = request.headers.authorization;
        if (!authHeader) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: 'No authorization header found on the request' },
              },
            ],
          };
        }

        logger.debug(
          `Persisting detection rule via API: ${ruleConfig.name} (type: ${ruleConfig.type})`
        );

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true',
            'elastic-api-version': '2023-10-31',
            Authorization: authHeader as string,
          },
          body: JSON.stringify(ruleConfig),
        });

        const result = await response.json();

        if (!response.ok) {
          logger.error(`Failed to persist detection rule: ${JSON.stringify(result)}`);
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to create rule: ${result.message || response.statusText}`,
                  statusCode: response.status,
                  details: result,
                },
              },
            ],
          };
        }

        logger.debug(`Successfully created detection rule: ${result.name} (id: ${result.id})`);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                message: `Detection rule "${result.name}" created successfully in Elastic Security`,
                rule: result,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in persist_detection_rule tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error creating detection rule: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
