/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { get, has } from 'lodash';
import { asyncForEach } from '@kbn/std';
import { set } from '@kbn/safer-lodash-set';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { IdentifierType } from '../../../common/api/entity_analytics/common/common.gen';
import type { EntityRiskScoreRecord } from '../../../common/api/entity_analytics/common';
import type { CreateGetRiskScoresOpts } from '../../lib/entity_analytics/risk_score/get_risk_score';
import { createGetRiskScores } from '../../lib/entity_analytics/risk_score/get_risk_score';
import type { EntityType } from '../../../common/entity_analytics/types';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { getRiskIndex } from '../../../common/search_strategy/security_solution/risk_score/common';
import { getSpaceIdFromRequest } from './helpers';
import { securityTool } from './constants';

const entityRiskScoreSchema = z.object({
  identifierType: IdentifierType.describe('The type of entity: host, user, service, or generic'),
  identifier: z
    .string()
    .min(1)
    .describe(
      'The value that identifies the entity (e.g., hostname, username). Use "*" to get all entities of the specified type, sorted by risk score (highest first).'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results to return when using wildcard queries (default: 10)'),
});

export const SECURITY_ENTITY_RISK_SCORE_TOOL_ID = securityTool('entity_risk_score');

interface EntityResultType {
  type: string;
  identifier: string;
  score?: number;
}
/**
 * Queries the risk index directly for wildcard queries, returning entities sorted by calculated_score_norm
 */
const queryRiskIndexForWildcard = async ({
  esClient,
  spaceId,
  entityType,
  limit = 10,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  entityType: EntityType;
  limit: number;
}): Promise<EntityRiskScoreRecord[]> => {
  const riskIndex = getRiskIndex(spaceId, true);
  const riskField = `${entityType}.risk.calculated_score_norm`;

  const response = await esClient.search<Record<EntityType, { risk: EntityRiskScoreRecord }>>({
    index: riskIndex,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: limit,
    query: {
      bool: {
        filter: [
          {
            exists: {
              field: `${entityType}.risk`,
            },
          },
        ],
      },
    },
    sort: [
      {
        [riskField]: {
          order: 'desc',
        },
      },
    ],
  });

  return response.hits.hits
    .map((hit) => (hit._source ? hit._source[entityType]?.risk : undefined))
    .filter((risk): risk is EntityRiskScoreRecord => risk !== undefined);
};

type GetLatestRiskScoreOpts = CreateGetRiskScoresOpts & {
  entityType: EntityType;
  entityIdentifier: string;
};
const getLatestRiskScore = async (
  opts: GetLatestRiskScoreOpts
): Promise<EntityRiskScoreRecord | undefined> => {
  const { entityType, entityIdentifier, logger, esClient, spaceId } = opts;
  const getRiskScore = createGetRiskScores({ logger, esClient, spaceId });

  const riskScores = await getRiskScore({
    entityType,
    entityIdentifier,
    pagination: { querySize: 1, cursorStart: 0 },
  });

  if (riskScores.length > 0) {
    return riskScores[0];
  }
};

/**
 * Fetches alerts by their IDs, returning only essential fields for risk score context
 */
const getAlertsById = async ({
  esClient,
  index,
  ids,
}: {
  esClient: ElasticsearchClient;
  index: string;
  ids: string[];
}): Promise<Record<string, unknown>> => {
  if (ids.length === 0) {
    return {};
  }

  const response = await esClient.search({
    index,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: ids.length,
    _source: ESSENTIAL_ALERT_FIELDS,
    query: {
      bool: {
        filter: [{ terms: { _id: ids } }],
      },
    },
  });

  return response.hits.hits.reduce<Record<string, unknown>>((acc, hit) => {
    if (hit._source && hit._id) {
      acc[hit._id] = hit._source;
    }
    return acc;
  }, {});
};

type GetRelatedEntitiesOpts = GetLatestRiskScoreOpts & {
  riskScoreInputAlerts: Array<unknown>;
};
const getRelatedEntities = async (opts: GetRelatedEntitiesOpts) => {
  const { riskScoreInputAlerts, entityIdentifier, entityType, ...rest } = opts;
  const relatedEntities: EntityResultType[] = [];
  const relatedHosts = new Set<string>();
  const relatedUsers = new Set<string>();
  riskScoreInputAlerts.forEach((alert) => {
    if (has(alert, 'host.name')) {
      const host = get(alert, 'host.name');
      if (entityType !== 'host' || entityIdentifier !== host) {
        relatedHosts.add(host);
      }
    }

    if (has(alert, 'user.name')) {
      const user = get(alert, 'user.name');
      if (entityType !== 'user' || entityIdentifier !== user) {
        relatedUsers.add(user);
      }
    }
  });

  for (const host of relatedHosts) {
    relatedEntities.push({ type: 'host', identifier: host });
  }

  for (const user of relatedUsers) {
    relatedEntities.push({ type: 'user', identifier: user });
  }

  await asyncForEach(relatedEntities, async (entity) => {
    const latest = await getLatestRiskScore({
      ...rest,
      entityType: entity.type as EntityType,
      entityIdentifier: entity.identifier,
    });
    if (latest) {
      set(entity, 'score', latest.calculated_score_norm);
    }
  });

  return relatedEntities;
};

export const entityRiskScoreTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityRiskScoreSchema> => {
  return {
    id: SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
    type: ToolType.builtin,
    description: `Call this tool to get the latest entity risk score and the inputs that contributed to the calculation for a specific entity (host, user, service, or generic). Use identifier "*" to get all entities of the specified type sorted by risk score. IMPORTANT: Always use 'calculated_score_norm' (0-100) when reporting risk scores, NOT 'calculated_score' which is a raw value. The 'calculated_score_norm' field is the normalized score suitable for comparison between entities. The 'modifiers' array contains risk adjustments such as asset criticality and privileged user monitoring (watchlist/privmon type).`,
    schema: entityRiskScoreSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status === 'available') {
            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;
            const riskIndex = getRiskIndex(spaceId, true);

            const indexExists = await esClient.indices.exists({
              index: riskIndex,
            });

            if (indexExists) {
              return { status: 'available' };
            }

            return {
              status: 'unavailable',
              reason: 'Risk score index does not exist for this space',
            };
          }
          return availability;
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check risk score index availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async ({ identifierType, identifier, limit = 10 }, { request, esClient }) => {
      const spaceId = getSpaceIdFromRequest(request);
      const alertsIndexPattern = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
      const entityType = identifierType as EntityType;

      logger.debug(
        `${SECURITY_ENTITY_RISK_SCORE_TOOL_ID} tool called with identifierType: ${identifierType}, identifier: ${identifier}`
      );

      try {
        let riskScores: EntityRiskScoreRecord[];

        // Handle wildcard queries by querying the risk index directly
        if (identifier === '*') {
          riskScores = await queryRiskIndexForWildcard({
            esClient: esClient.asCurrentUser,
            spaceId,
            entityType,
            limit,
          });

          if (riskScores.length === 0) {
            return {
              results: [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.error,
                  data: {
                    message: `No risk scores found for ${identifierType} entities`,
                  },
                },
              ],
            };
          }

          // For wildcard queries, return all results without alert details (inputs) to avoid excessive data
          // Reorder fields to prioritize calculated_score_norm
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  riskScores: riskScores.map((score) => {
                    // Exclude inputs and category details to reduce payload size when returning multiple entities
                    // Only include calculated_score_norm for clear prioity
                    return {
                      calculated_score_norm: score.calculated_score_norm,
                      calculated_level: score.calculated_level,
                      id_value: score.id_value,
                      id_field: score.id_field,
                      '@timestamp': score['@timestamp'],
                      ...(score.notes.length > 0 && { notes: score.notes }),
                      ...(score.criticality_modifier !== undefined && {
                        criticality_modifier: score.criticality_modifier,
                      }),
                      ...(score.criticality_level !== undefined && {
                        criticality_level: score.criticality_level,
                      }),
                      ...(score.modifiers && { modifiers: score.modifiers ?? [] }),
                    };
                  }),
                },
              },
            ],
          };
        }

        const latestRiskScore = await getLatestRiskScore({
          logger,
          esClient: esClient.asCurrentUser,
          spaceId,
          entityType,
          entityIdentifier: identifier,
        });

        if (!latestRiskScore) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: `No risk score found for ${identifierType} entity with identifier: ${identifier}`,
                },
              },
            ],
          };
        }

        // Fetch all alerts that contributed to the risk score to enhance the inputs
        const alertIds = latestRiskScore.inputs.map((i) => i.id).filter(Boolean);
        const alertsById = await getAlertsById({
          esClient: esClient.asCurrentUser,
          index: alertsIndexPattern,
          ids: alertIds,
        });

        // Extract other entities that contributed to the risk score inputs and get their risk scores
        const relatedEntities = await getRelatedEntities({
          riskScoreInputAlerts: Object.values(alertsById),
          logger,
          esClient: esClient.asCurrentUser,
          spaceId,
          entityType,
          entityIdentifier: identifier,
        });

        // Enhance inputs with alert data
        const enhancedInputs = latestRiskScore.inputs.map((input) => ({
          risk_score: input.risk_score,
          contribution_score: input.contribution_score,
          category: input.category,
          alert_contribution: alertsById[input.id] || null,
        }));

        // Prioritize calculated_score_norm in the response structure
        const riskScoreData = {
          // Put calculated_score_norm first to emphasize its importance
          calculated_score_norm: latestRiskScore.calculated_score_norm,
          calculated_level: latestRiskScore.calculated_level,
          id_value: latestRiskScore.id_value,
          id_field: latestRiskScore.id_field,
          // Include calculated_score but after normalized score
          calculated_score: latestRiskScore.calculated_score,
          inputs: enhancedInputs,
          '@timestamp': latestRiskScore['@timestamp'],
          ...(latestRiskScore.notes.length > 0 && { notes: latestRiskScore.notes }),
          ...(latestRiskScore.criticality_modifier !== undefined && {
            criticality_modifier: latestRiskScore.criticality_modifier,
          }),
          ...(latestRiskScore.criticality_level !== undefined && {
            criticality_level: latestRiskScore.criticality_level,
          }),
          ...(latestRiskScore.modifiers && { modifiers: latestRiskScore.modifiers ?? [] }),
        };

        const resultId = getToolResultId();

        return {
          results: [
            {
              tool_result_id: resultId,
              type: ToolResultType.other,
              data: {
                riskScore: riskScoreData,
              },
            },
            {
              tool_result_id: `${resultId}-host-testhostname`,
              type: ToolResultType.entity,
              data: {
                id: 'testhostname',
                type: 'host',
                link: {
                  deepLinkId: 'hosts',
                  path: `/name/${encodeURIComponent('testhostname')}`,
                },
              },
            },
            ...relatedEntities.map((entity) => ({
              tool_result_id: `${resultId}-${entity.type}-${entity.identifier}`,
              type: ToolResultType.entity,
              data: {
                id: entity.identifier,
                type: entity.type,
                ...(entity.type === 'host'
                  ? {
                      link: {
                        deepLinkId: 'hosts',
                        path: `/name/${encodeURIComponent(entity.identifier)}`,
                      },
                    }
                  : entity.type === 'user'
                  ? {
                      link: {
                        deepLinkId: 'users',
                        path: `/name/${encodeURIComponent(entity.identifier)}`,
                      },
                    }
                  : {}),
                ...(entity.score !== undefined && { score: entity.score }),
              },
            })),
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_ENTITY_RISK_SCORE_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error fetching risk score: ${error.message}`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'entity-risk-score', 'entities'],
  };
};
