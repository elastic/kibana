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
import { fetchQualityResults } from '../../../lib/siem_readiness/fetch_quality_results';
import { fetchCategories } from '../../../lib/siem_readiness/fetch_categories';
import { compileQualityData } from '../../../lib/siem_readiness/compile_quality';

export const SECURITY_SIEM_READINESS_QUALITY_TOOL_ID = securityTool('siem_readiness_quality');

const qualitySchema = z.object({
  category: z
    .enum(['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'])
    .optional()
    .describe(
      'Filter results to a specific SIEM Readiness category. If omitted, all five categories are returned.'
    ),
  statusFilter: z
    .enum(['incompatible', 'healthy', 'all'])
    .optional()
    .default('all')
    .describe(
      'Filter indices by ECS compatibility status. "incompatible" returns only indices with field mapping issues.'
    ),
});

export const siemReadinessQualityTool = (
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger
): BuiltinToolDefinition<typeof qualitySchema> => {
  return {
    id: SECURITY_SIEM_READINESS_QUALITY_TOOL_ID,
    type: ToolType.builtin,
    description: `Reports ECS (Elastic Common Schema) field compatibility for indices used by the SIEM.

For each index it shows:
- Whether the index is ECS-compatible ("healthy") or has mapping/value issues ("incompatible")
- How many fields are incompatible, same-family, custom, or ECS-compliant
- When the index was last checked

Results are grouped by SIEM Readiness category (Endpoint, Identity, Network, Cloud, Application/SaaS).

Important: results are only available for indices that have been checked by the ECS Data Quality Dashboard. Unchecked indices will not appear in the results. If an index is missing, the user may need to open the SIEM Readiness Quality tab to trigger a check.

Use this tool when asked about data quality, ECS compatibility, field mapping issues, or incompatible fields.`,
    schema: qualitySchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) =>
        getAgentBuilderResourceAvailability({ core, request, logger }),
    },
    handler: async ({ category, statusFilter = 'all' }, { esClient }) => {
      try {
        const [qualityResults, categoriesData] = await Promise.all([
          fetchQualityResults(esClient.asCurrentUser),
          fetchCategories(esClient.asCurrentUser),
        ]);

        const data = compileQualityData(qualityResults, categoriesData, { category, statusFilter });

        logger.debug(
          `SIEM Readiness quality tool: ${data.summary.totalChecked} checked, ` +
            `${data.summary.totalIncompatible} incompatible, ${data.summary.totalUnchecked} unchecked`
        );

        return { results: [{ type: ToolResultType.other, data }] };
      } catch (error) {
        logger.error(`SIEM Readiness quality tool failed: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to fetch SIEM Readiness quality data: ${error.message}` },
            },
          ],
        };
      }
    },
    tags: ['security', 'siem-readiness', 'quality', 'ecs'],
  };
};
