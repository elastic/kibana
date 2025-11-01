/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import type { EntityAnalyticsRoutesDeps } from '../../../lib/entity_analytics/types';

const securitySolutionInternalSchema = z.object({
  // entityType: EntityTypeZod.describe('The type of entity to search for.'),
  // informationToRetrieve: z
  //   .enum(['risk_score', 'asset_criticality', 'entity_store', 'privileged_user_monitoring'])
  //   .describe('The information to retrieve.'),
});
export const SECURITY_SOLUTION_TOOL_INTERNAL_ID = 'security-solution-tool';

export const securitySolutionToolInternal = (
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
): BuiltinToolDefinition<typeof securitySolutionInternalSchema> => {
  return {
    id: SECURITY_SOLUTION_TOOL_INTERNAL_ID,
    description: '',
    schema: securitySolutionInternalSchema,
    type: ToolType.builtin,
    handler: async (_, { esClient, logger, request, toolProvider }) => {
      try {
        const [core, startPlugins] = await getStartServices();

        const spaceId = startPlugins.spaces?.spacesService.getSpaceId(request) || 'default';
        const soClient = core.savedObjects.getScopedClient(request);
        const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);
        // const securitySolutionIndices = await uiSettingsClient.get<string[]>(DEFAULT_INDEX_KEY);

        const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
          soClient,
          esClient
        );

        // TODO We should only return indices that exist

        // const securitySolutionDataViewId = appClient.getSourcererDataViewId();
        const exploreDataViewId = `security-solution-${spaceId}`; // TODO: get the data from the right place
        const dataView = await dataViewsService.get(exploreDataViewId);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `When generating ES|QL queries for logs, you **MUST ALWAYS** use the following from clause:
                "FROM ${dataView.getIndexPattern()}"`,
                // apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*,-*elastic-cloud-logs-*
              },
            },
          ],
        };
      } catch (error) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: `Error retrieving security solution data: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['security-solution'],
  };
};
