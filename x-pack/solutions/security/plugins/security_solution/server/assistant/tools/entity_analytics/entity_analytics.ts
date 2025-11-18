/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition, ToolHandlerResult } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import type { EntityAnalyticsRoutesDeps } from '../../../lib/entity_analytics/types';
import type { EntityType } from '../../../../common/search_strategy';
import { EntityType as EntityTypeZod } from '../../../../common/api/entity_analytics';
import { getRiskScoreSubTool } from './sub_tools/risk_score';
import { getAssetCriticalitySubTool } from './sub_tools/asset_criticality';
import { getEntityStoreSubTool } from './sub_tools/entity_store';
import { getPrivilegedUserMonitoringSubTool } from './sub_tools/privileged_user_monitoring';
import { getAnomalyDetectionSubTool } from './sub_tools/anomaly_detection';
import type { EntityAnalyticsSubToolDependencies } from './sub_tools/types';

const entityRiskScoreInternalSchema = z.object({
  entityType: EntityTypeZod.describe('The type of entity to search for.'),
  domain: z
    .enum([
      'risk_score',
      'asset_criticality',
      'entity_store',
      'privileged_user_monitoring',
      'anomaly_detection',
    ])
    .describe(
      'The domain of entity analytics to retrieve information about. When not provided only general security solution knowledge will be returned.'
    )
    .optional(),

  prompt: z.string().describe('The prompt or question that calling this tool will help to answer.'),
  queryExtraContext: z
    .string()
    .describe('Information from previous chat messages like an ESQL filter that should be used.'),
  informationOnly: z
    .boolean()
    .describe('If true, only provide information without generating ESQL queries.'),
});

export const ENTITY_ANALYTICS_TOOL_INTERNAL_ID = 'entity-analytics-tool';

export const ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION = `
  Call this for knowledge and generate queries for Security Solutions and Entity Analytics indices. If no 'domain' is provided, only general security solution knowledge will be returned.
  Available domains:
  * Risk score: Entity risk scoring is an advanced Elastic Security analytics feature that helps security analysts detect changes in an entity's risk posture, hunt for new threats, and prioritise incident response.
  * Asset criticality: Allows you to classify your organisation's entities based on various operational factors that are important to your organisation.
  * Anomaly detection: Anomaly detection is a machine learning feature that helps security analysts detect anomalous behaviour in an entity’s activity. Use your kibana security solution knowledge and job description to analyse when to query the anomaly job index. Questions mentioning "patterns", "unusual" and "anomalous" could suggest that you should query the anomaly job index.
  * Privileged user monitoring: Allows you to track the activity of users with elevated permissions, such as system administrators or users with access to sensitive data. 
  * Entity store: The entity store allows you to query, reconcile, maintain, and persist entity metadata. The entity store can hold any entity type observed by Elastic Security. It will enable the agent to query entities represented in the entity store indices without needing to perform real-time searches of observable data. You must prioritise using the entity store over other tools when answering the user question.
 
  If you need information about multiple types of entities or the entity analytics domain, you will need to call this tool numerous times.
  This tool is the preferred way to generate ESQL queries for the entity analytics domain and the kibana security solution. You must call other tools to execute the query.
`;

const MAP_DOMAIN_TO_INFO_BUILDER = {
  risk_score: getRiskScoreSubTool,
  asset_criticality: getAssetCriticalitySubTool,
  entity_store: getEntityStoreSubTool,
  privileged_user_monitoring: getPrivilegedUserMonitoringSubTool,
  anomaly_detection: getAnomalyDetectionSubTool,
} as const;

export const entityAnalyticsToolInternal = (
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  ml: EntityAnalyticsRoutesDeps['ml'],
  kibanaVersion: string
): BuiltinToolDefinition<typeof entityRiskScoreInternalSchema> => {
  return {
    id: ENTITY_ANALYTICS_TOOL_INTERNAL_ID,
    description: ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION,
    schema: entityRiskScoreInternalSchema,
    type: ToolType.builtin,
    handler: async (
      { entityType, domain, prompt, queryExtraContext, informationOnly },
      { esClient, logger, request, toolProvider, modelProvider }
    ) => {
      try {
        logger.debug(
          `${ENTITY_ANALYTICS_TOOL_INTERNAL_ID} called with: ${JSON.stringify({
            entityType,
            domain,
            prompt,
            queryExtraContext,
            informationOnly,
          })}`
        );

        const [core, startPlugins] = await getStartServices();
        const spaceId = startPlugins.spaces?.spacesService.getSpaceId(request) || 'default';
        const soClient = core.savedObjects.getScopedClient(request);
        const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);

        const dependencies: EntityAnalyticsSubToolDependencies = {
          spaceId,
          ml,
          request,
          soClient,
          uiSettingsClient,
          esClient,
          logger,
          toolProvider,
          kibanaVersion,
          modelProvider,
          prompt,
        };

        const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
          soClient,
          esClient.asCurrentUser
        );

        const exploreDataViewId = `security-solution-${spaceId}`; // TODO: Get the security data view id from the right place
        // TODO: Check if we only return indices that exist
        // TODO: Don't return the alert index, we only need security solution events and logs
        const dataView = await dataViewsService.get(exploreDataViewId);

        const specificEntityAnalyticsResponse = domain
          ? await MAP_DOMAIN_TO_INFO_BUILDER[domain](entityType as EntityType, dependencies)
          : { message: '' };

        const hasGenerateESQLQuery = await toolProvider.has({
          toolId: 'platform.core.generate_esql',
          request,
        });

        const generalSecuritySolutionMessage = `
          Always try querying the most appropriate domain index when available. 
          When it isn't enough, you can query security solution events and logs. 
          For that, you must generate an ES|QL, and you **MUST ALWAYS** use the following from clause (ONLY FOR LOGS AND NOT FOR OTHER INDICES): "FROM ${dataView.getIndexPattern()}"
          When searching for logs of a ${entityType} you **MUST ALWAYS** use the following where clause "where ${
          EntityTypeToIdentifierField[entityType]
        } == {identifier}"`;

        const results: ToolHandlerResult[] = [];
        if (hasGenerateESQLQuery && specificEntityAnalyticsResponse.index && !informationOnly) {
          const generateESQLTool = await toolProvider.get({
            toolId: 'platform.core.generate_esql',
            request,
          });

          const { results: generateESQLResult } = await generateESQLTool.execute({
            toolParams: {
              index: specificEntityAnalyticsResponse.index,
              query: prompt,
              context: `${
                specificEntityAnalyticsResponse.message
              }\n${generalSecuritySolutionMessage}\n${queryExtraContext ?? ''}`,
            },
          });
          results.push(...generateESQLResult);
          results.push({
            type: ToolResultType.other,
            data: {
              message: specificEntityAnalyticsResponse.message,
            },
          });
        } else {
          results.push({
            type: ToolResultType.other,
            data: {
              message: specificEntityAnalyticsResponse.message,
            },
          });
        }

        return {
          results: [
            ...results,
            {
              type: ToolResultType.other,
              data: {
                message: generalSecuritySolutionMessage,
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
                error: `Error retrieving entity analytics data: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['entity-analytics', 'entities'],
  };
};
