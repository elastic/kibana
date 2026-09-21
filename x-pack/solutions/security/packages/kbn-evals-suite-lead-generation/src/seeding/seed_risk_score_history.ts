/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { getRiskScoreTimeSeriesIndex } from '@kbn/security-solution-plugin/common/entity_analytics/risk_engine/indices';

export interface SeedRiskScoreDocOptions {
  readonly euid: string;
  readonly date: string;
  readonly calculatedScoreNorm: number;
  readonly calculatedLevel?: string;
}

const entityTypeFromEuid = (euid: string): string => euid.split(':')[0] || 'unknown';

export const seedRiskScoreHistoryDoc = async ({
  esClient,
  spaceId = 'default',
  euid,
  date,
  calculatedScoreNorm,
  calculatedLevel,
}: SeedRiskScoreDocOptions & { esClient: Client; spaceId?: string }): Promise<void> => {
  const entityType = entityTypeFromEuid(euid);

  await esClient.index({
    index: getRiskScoreTimeSeriesIndex(spaceId),
    refresh: 'wait_for',
    document: {
      '@timestamp': date,
      [entityType]: {
        risk: {
          id_field: 'entity.id',
          id_value: euid,
          calculated_score_norm: calculatedScoreNorm,
          calculated_score: calculatedScoreNorm * 2,
          ...(calculatedLevel !== undefined && { calculated_level: calculatedLevel }),
        },
      },
    },
  });
};
