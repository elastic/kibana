/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../plugin_contract';
import { securityTool } from '../constants';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { fetchPipelines } from '../../../lib/siem_readiness/fetch_pipelines';
import { fetchCategories } from '../../../lib/siem_readiness/fetch_categories';
import { compileContinuityData } from '../../../lib/siem_readiness/compile_continuity';

export const SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID = securityTool('siem_readiness_continuity');

const continuitySchema = z.object({
  category: z
    .enum(['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'])
    .optional()
    .describe(
      'Filter results to a specific SIEM Readiness category. If omitted, all five categories are returned.'
    ),
  criticalOnly: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'When true, return only pipelines whose failure rate is at or above the critical threshold (1%).'
    ),
});

export const siemReadinessContinuityTool = (
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger,
  isServerless: boolean
): BuiltinToolDefinition<typeof continuitySchema> => {
  return {
    id: SECURITY_SIEM_READINESS_CONTINUITY_TOOL_ID,
    type: ToolType.builtin,
    description: `Reports ingest pipeline health for SIEM data streams, grouped by SIEM Readiness category.

For each pipeline it shows:
- Total documents processed (cumulative since last node restart)
- Number of failed documents
- Failure rate as a percentage — pipelines at or above 1% are flagged as critical
- Which indices the pipeline writes to

${
  isServerless
    ? 'Note: pipeline ingestion stats (doc counts, failure rates) are not available in serverless mode. Only the pipeline-to-index mapping is returned.'
    : ''
}

Use this tool when asked about pipeline failures, ingestion health, failure rates, or data flow issues.`,
    schema: continuitySchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) =>
        getAgentBuilderResourceAvailability({ core, request, logger }),
    },
    handler: async ({ category, criticalOnly = false }, { esClient }) => {
      try {
        const [pipelines, categoriesData] = await Promise.all([
          fetchPipelines(esClient.asCurrentUser, isServerless),
          fetchCategories(esClient.asCurrentUser),
        ]);

        const data = compileContinuityData(pipelines, categoriesData, isServerless, {
          category,
          criticalOnly,
        });

        logger.debug(
          `SIEM Readiness continuity tool: ${data.summary.totalPipelines} pipelines, ${data.summary.criticalPipelines} critical`
        );

        return { results: [{ type: ToolResultType.other, data }] };
      } catch (error) {
        logger.error(`SIEM Readiness continuity tool failed: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch SIEM Readiness continuity data: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'siem-readiness', 'continuity', 'pipelines'],
  };
};
