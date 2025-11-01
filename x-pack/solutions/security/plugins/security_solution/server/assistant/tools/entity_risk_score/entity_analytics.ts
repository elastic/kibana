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
import {
  getPrivilegedMonitorUsersIndex,
  getPrivilegedMonitorUsersJoin,
} from '../../../../common/entity_analytics/privileged_user_monitoring/utils';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { getAssetCriticalityIndex } from '../../../../common/entity_analytics/asset_criticality';
import type { EntityType } from '../../../../common/search_strategy';
import { EntityTypeToLevelField, EntityTypeToScoreField } from '../../../../common/search_strategy';
import {
  EntityType as EntityTypeZod,
  EntityTypeEnum,
} from '../../../../common/api/entity_analytics';
import {
  getRiskScoreLatestIndex,
  getRiskScoreTimeSeriesIndex,
} from '../../../../common/entity_analytics/risk_engine';

const entityRiskScoreInternalSchema = z.object({
  entityType: EntityTypeZod.describe('The type of entity to search for.'),
  informationToRetrieve: z
    .enum(['risk_score', 'asset_criticality', 'entity_store', 'privileged_user_monitoring'])
    .describe('The information to retrieve.'),
});

export const ENTITY_ANALYTICS_TOOL_INTERNAL_ID = 'entity-analytics-tool';

export const ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION = `Call this for knowledge about entity analytics, risk score, asset criticality, entity store, and other entity analytics related questions. 
Risk score: Entity risk scoring is an advanced Elastic Security analytics feature that helps security analysts detect changes in an entity’s risk posture, hunt for new threats, and prioritize incident response.
Asset criticality: Allows you to classify your organization’s entities based on various operational factors that are important to your organization.
Privileged user monitoring: Allows you to track the activity of users with elevated permissions, such as system administrators or users with access to sensitive data.
Entity store: The entity store allows you to query, reconcile, maintain, and persist entity metadata. The entity store can hold any entity type observed by Elastic Security. It allows you to view and query select entities represented in your indices without needing to perform real-time searches of observable data. 

If you need information about several type of entities or information to retrieve, you must call this tool multiple times.
This tool provider crucial information about the entity analytics domain and kibana security solution but it does not query data. You must call other tools after this tool to query data from the environment.
`;

const getRiskScoreInformation = (entityType: EntityType, spaceId: string) => {
  const riskScoreIndexPattern = getRiskScoreLatestIndex(spaceId);
  const riskScoreTimeSeriesIndexPattern = getRiskScoreTimeSeriesIndex(spaceId);

  return `This is a set of rules that you must follow strictly:
  * Use the latest risk score index pattern: ${riskScoreIndexPattern} when answering questions about the current risk score of entities.
  * Use the risk score time series patterns: ${riskScoreTimeSeriesIndexPattern} when answering questions about how the risk score changes over time.
  * When querying the risk score for a entity you must **ALWAYS** use the normalized field '${EntityTypeToScoreField[entityType]}'.
  * The field '${EntityTypeToLevelField[entityType]}' contains a textual description of the risk level.
  * The inputs field inside the risk score document contains the 10 highest-risk documents (sorted by 'kibana.alert.risk_score') that contributed to the risk score of an entity.
  * When searching the risk score of an entity of type '${entityType}' you must **ALWAYS** filter by: 'where ${EntityTypeToIdentifierField[entityType]} IS NOT NULL'
  `;
};

const getAssetCriticalityInformation = (entityType: EntityType, spaceId: string) => {
  const assetCriticalityIndexPattern = getAssetCriticalityIndex(spaceId);
  return `This is a set of rules that you must follow strictly:
  * Use the asset criticality index pattern: ${assetCriticalityIndexPattern}.
  * When searching asset criticality for '${entityType}' you **MUST ALWAYS** filter by: 'where id_field == "${EntityTypeToIdentifierField[entityType]}"'.
  * The criticality value is stored in the field 'criticality_level'.
  `;
};

// can I reuse some function?
const getEntityStoreIndexPattern = (entityType: EntityType, spaceId: string) =>
  `.entities.v1.latest.security_${entityType}_${spaceId}`;

const getEntityStoreInformation = (entityType: EntityType, spaceId: string) => {
  return `This is a set of rules that you must follow strictly:
  * Use the entity store index pattern: ${getEntityStoreIndexPattern(entityType, spaceId)}.
  * When searching the entity store for '${entityType}' you **MUST ALWAYS** filter by: 'where entity.EngineMetadata.Type == "${entityType}" OR entity.type == "${entityType}"'.
  `;
};

const getPrivilegedUserMonitoringInformation = (entityType: EntityType, spaceId: string) => {
  if (entityType === EntityTypeEnum.user) {
    return `This is a set of rules that you must follow strictly:
    * Use the privileged user monitoring index pattern: ${getPrivilegedMonitorUsersIndex(spaceId)}.
    * A user is privileged if the field 'user.is_privileged' is true.
    * When searching the privileged user you must **ALWAYS** filter by: 'where user.name == {identifier}'.
    * The filed entity_analytics_monitoring.labels.value contains information the group in which the privileged user is part of.
    * When querying a different index with user data, you can filter by privileged users using the following ESQL query:
    '${getPrivilegedMonitorUsersJoin(spaceId)}'
    `;
  }
  return `We do not have information about 'privileged_user_monitoring' for '${entityType}'.`;
};

const MAP_DOMAIN_TO_INFO_BUILDER = {
  risk_score: getRiskScoreInformation,
  asset_criticality: getAssetCriticalityInformation,
  entity_store: getEntityStoreInformation,
  privileged_user_monitoring: getPrivilegedUserMonitoringInformation,
} as const;

export const entityAnalyticsToolInternal = (
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices']
): BuiltinToolDefinition<typeof entityRiskScoreInternalSchema> => {
  return {
    id: ENTITY_ANALYTICS_TOOL_INTERNAL_ID,
    description: ENTITY_RISK_SCORE_TOOL_INTERNAL_DESCRIPTION,
    schema: entityRiskScoreInternalSchema,
    type: ToolType.builtin,
    handler: async (
      { entityType, informationToRetrieve },
      { esClient, logger, request, toolProvider }
    ) => {
      try {
        const [, startPlugins] = await getStartServices();
        const spaceId = startPlugins.spaces?.spacesService.getSpaceId(request) || 'default';

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: MAP_DOMAIN_TO_INFO_BUILDER[informationToRetrieve](
                  entityType as EntityType,
                  spaceId
                ),
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
