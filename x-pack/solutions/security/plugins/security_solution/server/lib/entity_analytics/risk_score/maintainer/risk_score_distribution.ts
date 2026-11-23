/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityRiskLevelsEnum } from '../../../../../common/api/entity_analytics/common';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { getIndexPatternDataStream } from '../configurations';

export interface RiskScoreBandDistribution {
  Critical: number;
  High: number;
  Moderate: number;
  Low: number;
  Unknown: number;
  normP50?: number;
  normP90?: number;
}

const riskField = (entityType: EntityType, leaf: string) => `${entityType}.risk.${leaf}`;

type DistributionScoreType = 'base' | 'resolution';

const scoreTypeFilter = (entityType: EntityType, scoreType: DistributionScoreType) => {
  const field = riskField(entityType, 'score_type');
  if (scoreType === 'resolution') {
    return { term: { [field]: 'resolution' } };
  }

  // Documents written before score_type existed have no field and are base scores.
  return {
    bool: {
      should: [{ term: { [field]: 'base' } }, { bool: { must_not: { exists: { field } } } }],
      minimum_should_match: 1,
    },
  };
};

interface BandBucket {
  key?: string | number;
  doc_count?: number;
}

interface DistributionAggs {
  bands?: { buckets?: BandBucket[] };
  normPercentiles?: { values?: Record<string, number | string | null> };
}

const readPercentile = (
  values: Record<string, number | string | null> | undefined,
  percent: 50 | 90
): number | undefined => {
  const raw = values?.[`${percent}.0`] ?? values?.[String(percent)];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

interface RiskScoreDistributionQuery {
  esClient: ElasticsearchClient;
  namespace: string;
  entityType: EntityType;
  calculationRunId: string;
  logger: Pick<Logger, 'warn'>;
}

const getRiskScoreDistribution = async ({
  esClient,
  namespace,
  entityType,
  calculationRunId,
  scoreType,
  logger,
}: RiskScoreDistributionQuery & {
  scoreType: DistributionScoreType;
}): Promise<RiskScoreBandDistribution | undefined> => {
  const index = getIndexPatternDataStream(namespace).alias;

  try {
    const response = await esClient.search<unknown, DistributionAggs>({
      index,
      size: 0,
      track_total_hits: false,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            { term: { [riskField(entityType, 'calculation_run_id')]: calculationRunId } },
            scoreTypeFilter(entityType, scoreType),
          ],
        },
      },
      aggs: {
        bands: {
          terms: {
            field: riskField(entityType, 'calculated_level'),
            size: 10,
            missing: EntityRiskLevelsEnum.Unknown,
          },
        },
        normPercentiles: {
          percentiles: {
            field: riskField(entityType, 'calculated_score_norm'),
            percents: [50, 90],
          },
        },
      },
    });

    const aggs = response.aggregations;
    if (!aggs) return undefined;

    const distribution: RiskScoreBandDistribution = {
      Critical: 0,
      High: 0,
      Moderate: 0,
      Low: 0,
      Unknown: 0,
    };

    for (const bucket of aggs.bands?.buckets ?? []) {
      const key = bucket.key !== undefined ? String(bucket.key) : undefined;
      if (key !== undefined && Object.prototype.hasOwnProperty.call(distribution, key)) {
        distribution[key as keyof typeof distribution] = (bucket.doc_count ?? 0) as never;
      }
    }

    const total =
      distribution.Critical +
      distribution.High +
      distribution.Moderate +
      distribution.Low +
      distribution.Unknown;

    if (total > 0) {
      const p50 = readPercentile(aggs.normPercentiles?.values, 50);
      const p90 = readPercentile(aggs.normPercentiles?.values, 90);
      if (p50 !== undefined) distribution.normP50 = p50;
      if (p90 !== undefined) distribution.normP90 = p90;
    }

    return distribution;
  } catch (error) {
    // This is only used for telemetry so log and swallow any errors.
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to read ${scoreType} risk score distribution: ${message}`);
    return undefined;
  }
};

/** Queries band counts and percentiles for base scores written by one maintainer run. */
export const getRiskScoreBaseDistribution = (
  params: RiskScoreDistributionQuery
): Promise<RiskScoreBandDistribution | undefined> =>
  getRiskScoreDistribution({ ...params, scoreType: 'base' });

/** Queries band counts and percentiles for resolution scores written by one maintainer run. */
export const getRiskScoreResolutionDistribution = (
  params: RiskScoreDistributionQuery
): Promise<RiskScoreBandDistribution | undefined> =>
  getRiskScoreDistribution({ ...params, scoreType: 'resolution' });
