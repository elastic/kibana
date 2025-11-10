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
import type { EntityType } from '../../../../common/search_strategy';
import { EntityType as EntityTypeZod } from '../../../../common/api/entity_analytics';
import { getRiskScoreSubPlugin } from './sub_tools/risk_score';
import { getAssetCriticalitySubPlugin } from './sub_tools/asset_criticality';
import { getEntityStoreSubPlugin } from './sub_tools/entity_store';
import { getPrivilegedUserMonitoringSubPlugin } from './sub_tools/privileged_user_monitoring';
import { getAnomalyDetectionSubPlugin } from './sub_tools/anomaly_detection';
import type { EntityAnalyticsSubPluginsDependencies } from './sub_tools/types';

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
    .describe('The domain of entity analytics to retrieve information about.')
    .optional(),

  prompt: z.string().describe('The prompt or question that calling this tool will help to answer.'),
});

export const ENTITY_ANALYTICS_TOOL_INTERNAL_ID = 'entity-analytics-tool';

export const ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION = `Call this for knowledge Security solution and entity analytics indices and data. If no 'domain' is provided, only general security solution knowledge will be returned.
Available domains:
* Risk score: Entity risk scoring is an advanced Elastic Security analytics feature that helps security analysts detect changes in an entity’s risk posture, hunt for new threats, and prioritize incident response.
* Asset criticality: Allows you to classify your organization’s entities based on various operational factors that are important to your organization.
* Anomaly detection: Anomaly detection is a machine learning feature that helps security analysts detect anomalous behavior in an entity’s activity. Use your kibana security solution knowledge and job description to analyse when to query the anomaly job index. Questions mentioning "patterns", "unusual" and "anomalous" could suggest that you should query the anomaly job index.
* Privileged user monitoring: Allows you to track the activity of users with elevated permissions, such as system administrators or users with access to sensitive data.
* Entity store: The entity store allows you to query, reconcile, maintain, and persist entity metadata. The entity store can hold any entity type observed by Elastic Security. It allows you to view and query select entities represented in your indices without needing to perform real-time searches of observable data. 

If you need information about several type of entities or entity analytics domain, you must call this tool multiple times.
This tool provider crucial information about the entity analytics domain and kibana security solution but it does not query data. You must call other tools after this tool to query data from the environment.
`;

// TODO Add checks if user has the privileges and if the module is installed: risk score, entity store, anomaly detection, privileged user monitoring, asset criticality

const MAP_DOMAIN_TO_INFO_BUILDER = {
  risk_score: getRiskScoreSubPlugin,
  asset_criticality: getAssetCriticalitySubPlugin,
  entity_store: getEntityStoreSubPlugin,
  privileged_user_monitoring: getPrivilegedUserMonitoringSubPlugin,
  anomaly_detection: getAnomalyDetectionSubPlugin,
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
      { entityType, domain, prompt },
      { esClient, logger, request, toolProvider }
    ) => {
      try {
        logger.info(
          `---------------- ${ENTITY_ANALYTICS_TOOL_INTERNAL_ID} called with: ${JSON.stringify({
            entityType,
            domain,
            prompt,
          })}`
        );

        const [core, startPlugins] = await getStartServices();
        const spaceId = startPlugins.spaces?.spacesService.getSpaceId(request) || 'default';
        const soClient = core.savedObjects.getScopedClient(request);
        const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);

        const dependencies: EntityAnalyticsSubPluginsDependencies = {
          spaceId,
          ml,
          request,
          soClient,
          uiSettingsClient,
          esClient,
          logger,
          toolProvider,
          kibanaVersion,
        };

        const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
          soClient,
          esClient
        );

        const exploreDataViewId = `security-solution-${spaceId}`; // TODO: get the data from the right place
        // TODO We should only return indices that exist
        // TODO: Don't return the alert index
        const dataView = await dataViewsService.get(exploreDataViewId);

        const generalSecuritySolutionMessage = `
        Always try querying the most appropriate domain index when available. When it isn't enough, you can query security solution events and logs. For that you must generate an ES|QL and you **MUST ALWAYS** use the following from clause (ONLY FOR LOGS AND NOT FOR OTHER INDICES):
        "FROM ${dataView.getIndexPattern()}"
        `;

        const specificEntityAnalyticsMessage = domain
          ? await MAP_DOMAIN_TO_INFO_BUILDER[domain](entityType as EntityType, dependencies)
          : '';

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `General Security Solution knowledge: \n${generalSecuritySolutionMessage} \n\nSpecific Entity Analytics knowledge: \n${specificEntityAnalyticsMessage}`,
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
