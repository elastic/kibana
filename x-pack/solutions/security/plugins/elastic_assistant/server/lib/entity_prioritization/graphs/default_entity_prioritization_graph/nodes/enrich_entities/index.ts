/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { EntityIdentifierFields } from '@kbn/security-solution-plugin/common/entity_analytics/types';
import {
  EntityType,
  EntityTypeToIdentifierField,
} from '@kbn/security-solution-plugin/common/entity_analytics/types';

import type { ThreatHuntingPrioritiesGraphState, ThreatHuntingPriority } from '../../../../state';
import type { EntityDetailsHighlightsService } from './types';

/**
 * Maps CandidateEntity entityType to EntityIdentifierFields
 */
const mapToEntityIdentifierField = (entityType: 'user' | 'host'): EntityIdentifierFields => {
  // EntityType enum values match the string values ('user' = 'user', 'host' = 'host')
  const entityTypeEnum = EntityType[entityType];
  return EntityTypeToIdentifierField[entityTypeEnum];
};

export const getEnrichEntitiesNode = ({
  alertsIndexPattern,
  entityDetailsHighlightsService,
  esClient,
  entityStoreDataClient,
  logger,
  namespace,
  request,
  riskScoreIndexPattern,
  start,
  end,
}: {
  alertsIndexPattern?: string;
  entityDetailsHighlightsService?: EntityDetailsHighlightsService;
  esClient: ElasticsearchClient;
  entityStoreDataClient?: unknown; // TODO: Type this properly
  logger?: Logger;
  namespace?: string;
  request?: KibanaRequest;
  riskScoreIndexPattern?: string;
  start?: string;
  end?: string;
}): ((state: ThreatHuntingPrioritiesGraphState) => Promise<ThreatHuntingPrioritiesGraphState>) => {
  const enrichEntities = async (
    state: ThreatHuntingPrioritiesGraphState
  ): Promise<ThreatHuntingPrioritiesGraphState> => {
    logger?.debug(() => '---ENRICH ENTITIES---');

    const { candidateEntities, selectedCandidateIds } = state;

    if (!entityDetailsHighlightsService) {
      logger?.warn(() => 'Entity details highlights service not available, skipping enrichment');
      return {
        ...state,
        enrichedEntities: new Map(),
      };
    }

    const enrichedEntities = new Map<string, ThreatHuntingPriority['enrichedData']>();

    // Calculate date range for anomalies (default to last 30 days if not provided)
    const toDate = end ? new Date(end).getTime() : Date.now();
    const fromDate = start ? new Date(start).getTime() : toDate - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    // Enrich each selected candidate entity
    for (const entityId of selectedCandidateIds) {
      // Find the candidate entity to get its type
      const candidateEntity = candidateEntities.find((entity) => entity.entityId === entityId);
      if (!candidateEntity) {
        logger?.warn(() => `Candidate entity ${entityId} not found, skipping enrichment`);
      } else {
        // EntityType enum values match the string values ('user' = 'user', 'host' = 'host')
        const entityType = EntityType[candidateEntity.entityType];
        const entityField = mapToEntityIdentifierField(candidateEntity.entityType);
        try {
          // Fetch enrichment data in parallel
          const [riskScoreData, assetCriticalityData, vulnerabilityData, anomaliesData] =
            await Promise.allSettled([
              entityDetailsHighlightsService.getRiskScoreData(entityType, entityId),
              entityDetailsHighlightsService.getAssetCriticalityData(entityField, entityId),
              entityDetailsHighlightsService.getVulnerabilityData(entityField, entityId),
              request
                ? entityDetailsHighlightsService.getAnomaliesData(
                    request,
                    entityField,
                    entityId,
                    fromDate,
                    toDate
                  )
                : Promise.resolve([]),
            ]);

          const enrichedData: ThreatHuntingPriority['enrichedData'] = {
            riskScore: riskScoreData.status === 'fulfilled' ? riskScoreData.value : undefined,
            assetCriticality:
              assetCriticalityData.status === 'fulfilled' ? assetCriticalityData.value : undefined,
            vulnerabilities:
              vulnerabilityData.status === 'fulfilled'
                ? {
                    vulnerabilitiesAnonymized: vulnerabilityData.value.vulnerabilitiesAnonymized,
                    vulnerabilitiesTotal: vulnerabilityData.value.vulnerabilitiesTotal,
                  }
                : undefined,
            anomalies: anomaliesData.status === 'fulfilled' ? anomaliesData.value : undefined,
          };

          enrichedEntities.set(entityId, enrichedData);
          logger?.debug(() => `Enriched entity ${entityId} (${candidateEntity.entityType})`);
        } catch (error) {
          logger?.error(() => `Error enriching entity ${entityId}: ${error}`);
          // Continue with other entities even if one fails
        }
      }
    }

    logger?.debug(() => `Enriched ${enrichedEntities.size} entities`);

    return {
      ...state,
      enrichedEntities,
    };
  };

  return enrichEntities;
};
