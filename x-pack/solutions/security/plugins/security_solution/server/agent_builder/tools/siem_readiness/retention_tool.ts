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
import { fetchRetention } from '../../../lib/siem_readiness/fetch_retention';
import { fetchCategories } from '../../../lib/siem_readiness/fetch_categories';
import { compileRetentionData } from '../../../lib/siem_readiness/compile_retention';

export const SECURITY_SIEM_READINESS_RETENTION_TOOL_ID = securityTool('siem_readiness_retention');

const retentionSchema = z.object({
  category: z
    .enum(['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'])
    .optional()
    .describe(
      'Filter results to a specific SIEM Readiness category. If omitted, all five categories are returned.'
    ),
  statusFilter: z
    .enum(['non-compliant', 'healthy', 'all'])
    .optional()
    .default('all')
    .describe(
      'Filter by retention compliance status. "non-compliant" returns only indices with retention configured below 365 days.'
    ),
});

export const siemReadinessRetentionTool = (
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger,
  isServerless: boolean
): BuiltinToolDefinition<typeof retentionSchema> => {
  return {
    id: SECURITY_SIEM_READINESS_RETENTION_TOOL_ID,
    type: ToolType.builtin,
    description: `Reports data retention configuration for SIEM data streams and indices, grouped by SIEM Readiness category.

For each data stream or index it shows:
- How retention is managed: ILM policy, DSL (data stream lifecycle), or not configured
- The configured retention period (e.g. "365d", "90d")
- Compliance status: "healthy" if retention is 365 days or more (FedRAMP requirement), or "non-compliant" if below that. Indices with no retention limit are always healthy.

${
  isServerless
    ? 'Note: ILM is not available in serverless mode. Retention is managed via DSL only.'
    : ''
}

Use this tool when asked about data retention, compliance, ILM policies, or how long data is kept.`,
    schema: retentionSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) =>
        getAgentBuilderResourceAvailability({ core, request, logger }),
    },
    handler: async ({ category, statusFilter = 'all' }, { esClient }) => {
      try {
        const [retentionItems, categoriesData] = await Promise.all([
          fetchRetention(esClient.asCurrentUser, isServerless),
          fetchCategories(esClient.asCurrentUser),
        ]);

        const data = compileRetentionData(retentionItems, categoriesData, isServerless, {
          category,
          statusFilter,
        });

        logger.debug(
          `SIEM Readiness retention tool: ${data.summary.totalIndices} indices, ${data.summary.nonCompliantCount} non-compliant`
        );

        return { results: [{ type: ToolResultType.other, data }] };
      } catch (error) {
        logger.error(`SIEM Readiness retention tool failed: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch SIEM Readiness retention data: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'siem-readiness', 'retention', 'ilm'],
  };
};
