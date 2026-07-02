/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { KibanaRequest } from '@kbn/core/server';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import { getLatestEntityIndexPattern } from '@kbn/entity-store/common';
import type { Logger } from '@kbn/logging';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { ExperimentalFeatures } from '../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { AssetCriticalityLevelsForBulkUpload } from '../../../../common/api/entity_analytics/asset_criticality/bulk_upload_asset_criticality.gen';
import { securityTool } from '../constants';
import { IdentifierType } from '../../../../common/api/entity_analytics/common/common.gen';
import { recalculateEntityRiskScore } from '../../../lib/entity_analytics/risk_score/recalculate_entity_risk_score';
import { RiskScoreDataClient } from '../../../lib/entity_analytics/risk_score/risk_score_data_client';
import { ASSET_CRITICALITY_UPDATED_TOOL_EVENT } from '../../../../common/entity_analytics/tool_events';

export const SECURITY_SET_ASSET_CRITICALITY_TOOL_ID = securityTool('set_asset_criticality');

const checkAssetCriticalityAccess = async ({
  request,
  security,
  spaceId,
}: {
  request: KibanaRequest;
  security: SecurityPluginStart;
  spaceId: string;
}): Promise<{ allowed: true } | { allowed: false; result: ErrorResult }> => {
  const entitiesAlias = getEntitiesAlias(ENTITY_LATEST, spaceId);
  const latestIndexPattern = getLatestEntityIndexPattern(spaceId);
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  const { privileges } = await checkPrivileges({
    elasticsearch: {
      cluster: [],
      index: {
        [entitiesAlias]: ['write'],
        [latestIndexPattern]: ['write'],
      },
    },
  });

  const hasWriteOnIndex = (key: string) =>
    privileges.elasticsearch.index[key]?.some(
      ({ privilege, authorized }) => privilege === 'write' && authorized
    );

  if (hasWriteOnIndex(entitiesAlias) && hasWriteOnIndex(latestIndexPattern)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    result: {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error,
      data: { message: 'You do not have permission to update asset criticality in this space.' },
    },
  };
};

const schema = z.object({
  entityId: z
    .string()
    .min(1)
    .describe(
      'The entity ID (EUID) of the entity whose criticality to set. ' +
        'Examples: "host:server1", "user:jsmith". ' +
        'If the security.entity attachment identifies the target, use its entity ID here.'
    ),
  entityType: IdentifierType.describe('The type of entity: host, user, service, or generic.'),
  criticality: AssetCriticalityLevelsForBulkUpload.describe(
    'The asset criticality level to assign. ' +
      'Valid levels: low_impact, medium_impact, high_impact, extreme_impact. ' +
      'Use "unassigned" to remove the existing criticality value.'
  ),
});

export const setAssetCriticalityTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  kibanaVersion: string
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_SET_ASSET_CRITICALITY_TOOL_ID,
    type: ToolType.builtin,
    description: `
        Set or remove the asset criticality level for a security entity.
        Criticality influences risk scoring — entities with higher criticality carry more weight in risk calculations.
        Use "unassigned" to remove the current criticality.
        Single-record only — bulk or CSV changes belong in the Entity Analytics management UI.
      `,
    schema,
    tags: ['security', 'entity-analytics', 'asset-criticality'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status !== 'available') {
            return availability;
          }
          if (!experimentalFeatures.entityAnalyticsEntityStoreV2) {
            return { status: 'unavailable', reason: 'Entity Store V2 is not enabled.' };
          }
          return { status: 'available' };
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check ${SECURITY_SET_ASSET_CRITICALITY_TOOL_ID} availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async (
      params,
      { esClient, prompts, callContext, spaceId, savedObjectsClient, request, events }
    ) => {
      logger.debug(
        `${SECURITY_SET_ASSET_CRITICALITY_TOOL_ID} tool called for entity ${params.entityId}`
      );

      const { entityId, entityType, criticality } = params;

      try {
        const [, { security }] = await core.getStartServices();
        const accessResult = await checkAssetCriticalityAccess({ request, security, spaceId });
        if (!accessResult.allowed) {
          return { results: [accessResult.result] };
        }

        const promptId = `set_asset_criticality.confirm.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);

        if (status === ConfirmationStatus.unprompted) {
          const criticalityLabel =
            criticality === 'unassigned'
              ? 'remove the existing criticality'
              : `set criticality to **${criticality}**`;

          return prompts.askForConfirmation({
            id: promptId,
            title: 'Set asset criticality',
            message: `${criticalityLabel} for **${entityId}**?`,
            confirm_text: criticality === 'unassigned' ? 'Remove criticality' : 'Set criticality',
            cancel_text: 'Cancel',
          });
        }

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: 'Asset criticality update was cancelled.' },
              },
            ],
          };
        }

        const [, { entityStore }] = await core.getStartServices();
        const client = esClient.asCurrentUser;
        const entityStoreClient = entityStore.createCRUDClient(client, spaceId);

        const errors = await entityStoreClient.bulkUpdateEntity({
          objects: [
            {
              type: entityType,
              doc: {
                entity: { id: entityId },
                asset: { criticality: criticality === 'unassigned' ? null : criticality },
              },
            },
          ],
          force: true,
        });

        if (errors.length > 0) {
          const firstError = errors[0];
          throw new Error(firstError.reason ?? `Update failed with status ${firstError.status}`);
        }

        let riskScore:
          | { recalculated: true; entityRiskScore: number; resolutionGroupRiskScore?: number }
          | { recalculated: false } = { recalculated: false };
        try {
          const riskScoreDataClient = new RiskScoreDataClient({
            logger,
            kibanaVersion,
            esClient: client,
            soClient: savedObjectsClient,
            namespace: spaceId,
          });
          const entityScore = await recalculateEntityRiskScore({
            esClient: client,
            soClient: savedObjectsClient,
            crudClient: entityStoreClient,
            namespace: spaceId,
            entityId,
            identifierType: entityType,
            getWriter: (ns) => riskScoreDataClient.getWriter({ namespace: ns }),
            idBasedRiskScoringEnabled: true,
            logger,
            collectScores: true,
          });
          if (entityScore.baseScore != null) {
            riskScore = {
              recalculated: true,
              entityRiskScore: entityScore.baseScore,
              resolutionGroupRiskScore: entityScore.resolutionScore,
            };
          }
        } catch (error) {
          logger.warn(
            `[SetAssetCriticality] Risk score recalculation failed for ${entityId}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }

        events.sendUiEvent(ASSET_CRITICALITY_UPDATED_TOOL_EVENT, { entityType });

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                success: true,
                entityId,
                entityType,
                criticality,
                riskScore,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          `[SetAssetCriticality] Error setting criticality for ${entityId}: ${errorMessage}`
        );

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error setting asset criticality: ${errorMessage}` },
            },
          ],
        };
      }
    },
  };
};
