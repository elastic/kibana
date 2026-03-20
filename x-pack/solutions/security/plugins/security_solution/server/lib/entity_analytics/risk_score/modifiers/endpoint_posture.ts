/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Endpoint Posture Risk Modifier
 *
 * Integrates endpoint security posture scores into Entity Risk scoring.
 * Uses Bayesian update pattern similar to Asset Criticality modifier.
 *
 * Posture Level → Modifier Value:
 *   LOW (score 90-100)      → 0.8x (reduces risk - good security posture)
 *   MEDIUM (score 70-89)    → 1.0x (neutral)
 *   HIGH (score 50-69)      → 1.2x (increases risk - poor security posture)
 *   CRITICAL (score 0-49)   → 1.5x (significantly increases risk)
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RiskScoreBucket } from '../../types';
import type { Modifier } from './types';

const POSTURE_LEVEL_MODIFIERS: Record<string, number> = {
  LOW: 0.8, // Good posture reduces risk
  MEDIUM: 1.0, // Neutral
  HIGH: 1.2, // Poor posture increases risk
  CRITICAL: 1.5, // Critical posture significantly increases risk
};

interface PostureData {
  entityId: string;
  entityName: string;
  postureScore: number;
  postureLevel: string;
  failedChecks: string[];
}

export interface ApplyPostureModifierParams {
  page: {
    buckets: RiskScoreBucket[];
    identifierField: string;
  };
  deps: {
    esClient: ElasticsearchClient;
    namespace: string;
    logger: Logger;
  };
  globalWeight?: number;
}

/**
 * Applies endpoint posture modifiers to risk score buckets.
 * Queries endpoint-assets-osquery-* index for posture data and applies
 * appropriate modifier based on posture level.
 */
export const applyPostureModifier = async ({
  page,
  deps,
  globalWeight,
}: ApplyPostureModifierParams): Promise<Array<Modifier<'endpoint_posture'> | undefined>> => {
  if (page.buckets.length === 0) {
    return [];
  }

  // Only apply to host entities
  if (page.identifierField !== 'host.name') {
    return page.buckets.map(() => undefined);
  }

  const hostNames = page.buckets.map((bucket) => bucket.key[page.identifierField] as string);

  // Query posture data from endpoint assets
  const postureData = await queryPostureData(deps.esClient, deps.namespace, hostNames, deps.logger);

  return page.buckets.map((bucket) => {
    const hostName = bucket.key[page.identifierField] as string;
    const posture = postureData.get(hostName);

    return buildModifier(posture, globalWeight);
  });
};

/**
 * Queries endpoint posture data from the endpoint assets index.
 */
async function queryPostureData(
  esClient: ElasticsearchClient,
  namespace: string,
  hostNames: string[],
  logger: Logger
): Promise<Map<string, PostureData>> {
  const result = new Map<string, PostureData>();

  if (hostNames.length === 0) {
    return result;
  }

  try {
    const response = await esClient.search({
      index: `endpoint-assets-osquery-${namespace}`,
      size: hostNames.length,
      query: {
        bool: {
          should: [
            { terms: { 'entity.name': hostNames } },
            { terms: { 'host.name': hostNames } },
          ],
          minimum_should_match: 1,
        },
      },
      _source: [
        'entity.id',
        'entity.name',
        'host.name',
        'endpoint.posture.score',
        'endpoint.posture.level',
        'endpoint.posture.failed_checks',
      ],
    });

    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const entity = source.entity as Record<string, unknown> | undefined;
      const host = source.host as Record<string, unknown> | undefined;
      const endpoint = source.endpoint as Record<string, unknown> | undefined;
      const posture = endpoint?.posture as Record<string, unknown> | undefined;

      const entityName = (entity?.name as string) || (host?.name as string);
      if (entityName) {
        result.set(entityName, {
          entityId: (entity?.id as string) || '',
          entityName,
          postureScore: (posture?.score as number) || 0,
          postureLevel: (posture?.level as string) || 'MEDIUM',
          failedChecks: (posture?.failed_checks as string[]) || [],
        });
      }
    }
  } catch (error) {
    logger.warn(
      `[Endpoint Posture Modifier] Error querying posture data: ${error.message}. Risk scoring will proceed without posture information.`
    );
  }

  return result;
}

/**
 * Builds a posture modifier for a single entity.
 */
function buildModifier(
  posture: PostureData | undefined,
  globalWeight?: number
): Modifier<'endpoint_posture'> | undefined {
  if (!posture) {
    return undefined;
  }

  const baseModifier = POSTURE_LEVEL_MODIFIERS[posture.postureLevel] || 1.0;

  // Apply global weight if provided
  const weightedModifier =
    globalWeight !== undefined ? 1 + (baseModifier - 1) * globalWeight : baseModifier;

  return {
    type: 'endpoint_posture',
    modifier_value: weightedModifier,
    metadata: {
      posture_score: posture.postureScore,
      posture_level: posture.postureLevel,
      failed_checks: posture.failedChecks,
    },
  };
}

/**
 * Gets the posture modifier value for a given posture level.
 * Exported for testing.
 */
export const getPostureModifier = (postureLevel: string | undefined): number | undefined => {
  if (!postureLevel) {
    return undefined;
  }
  return POSTURE_LEVEL_MODIFIERS[postureLevel];
};
