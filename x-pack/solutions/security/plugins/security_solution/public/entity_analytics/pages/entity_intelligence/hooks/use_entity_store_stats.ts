/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import { useKibana } from '../../../../common/lib/kibana';
import { esqlResponseToRecords } from '../../../../common/utils/esql';
import type { RiskLevel } from '../common';

interface TypeStatsRecord extends Record<string, unknown> {
  count: number;
  scored_count: number;
  avg_risk: number | null;
  'entity.EngineMetadata.Type': string;
}

interface LevelStatsRecord extends Record<string, unknown> {
  count: number;
  avg_risk: number | null;
  'entity.EngineMetadata.Type': string;
  'entity.risk.calculated_level': string | null;
}

export interface EntityTypeStat {
  type: string;
  count: number;
  scoredCount: number;
  avgRisk: number | undefined;
}

export interface EntityLevelStat {
  type: string;
  level: RiskLevel;
  count: number;
  avgRisk: number | undefined;
}

export interface EntityStoreStats {
  totalEntities: number;
  byType: EntityTypeStat[];
  byLevel: EntityLevelStat[];
  criticalCount: number;
  highCount: number;
}

const isRiskLevel = (value: string | null): value is RiskLevel =>
  value === 'Unknown' ||
  value === 'Low' ||
  value === 'Moderate' ||
  value === 'High' ||
  value === 'Critical';

const runEsql = async (
  search: ReturnType<typeof useKibana>['services']['data']['search']['search'],
  query: string,
  signal: AbortSignal | undefined
): Promise<ESQLSearchResponse> => {
  const searchResult = await lastValueFrom(
    search(
      { params: { query } },
      {
        abortSignal: signal,
        strategy: 'esql_async',
        projectRouting: '_alias:_origin',
      }
    )
  );
  return searchResult.rawResponse as unknown as ESQLSearchResponse;
};

/**
 * Aggregate entity-store stats for the intelligence overview: entity counts and
 * average risk per engine type, plus a per-type risk level distribution.
 */
export const useEntityStoreStats = (spaceId: string | undefined) => {
  const { data } = useKibana().services;
  const search = data.search.search;

  const index = spaceId ? getEntitiesAlias(ENTITY_LATEST, spaceId) : undefined;

  const typeQuery = `FROM ${index} | WHERE entity.EngineMetadata.Type IN ("user","host","service") | STATS count = COUNT(*), scored_count = COUNT(entity.risk.calculated_score_norm), avg_risk = AVG(entity.risk.calculated_score_norm) BY entity.EngineMetadata.Type`;
  const levelQuery = `FROM ${index} | WHERE entity.EngineMetadata.Type IN ("user","host","service") AND entity.risk.calculated_level IS NOT NULL | STATS count = COUNT(*), avg_risk = AVG(entity.risk.calculated_score_norm) BY entity.EngineMetadata.Type, entity.risk.calculated_level`;

  const {
    data: result,
    isLoading,
    isError,
  } = useQuery(
    ['entityIntelligenceStoreStats', index],
    async ({ signal }) => {
      const [typeResponse, levelResponse] = await Promise.all([
        runEsql(search, typeQuery, signal),
        runEsql(search, levelQuery, signal),
      ]);
      return {
        byTypeRecords: esqlResponseToRecords<TypeStatsRecord>(typeResponse),
        byLevelRecords: esqlResponseToRecords<LevelStatsRecord>(levelResponse),
      };
    },
    {
      enabled: !!index,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  const stats = useMemo<EntityStoreStats | undefined>(() => {
    if (!index || !result || isError) return undefined;

    const byType: EntityTypeStat[] = result.byTypeRecords.map((record) => ({
      type: record['entity.EngineMetadata.Type'],
      count: record.count,
      scoredCount: record.scored_count,
      avgRisk: record.avg_risk ?? undefined,
    }));

    const byLevel: EntityLevelStat[] = result.byLevelRecords.flatMap((record) => {
      const level = record['entity.risk.calculated_level'];
      if (!isRiskLevel(level)) return [];
      return [
        {
          type: record['entity.EngineMetadata.Type'],
          level,
          count: record.count,
          avgRisk: record.avg_risk ?? undefined,
        },
      ];
    });

    const countForLevel = (target: RiskLevel) =>
      byLevel
        .filter((entry) => entry.level === target)
        .reduce((sum, entry) => sum + entry.count, 0);

    return {
      totalEntities: byType.reduce((sum, entry) => sum + entry.count, 0),
      byType,
      byLevel,
      criticalCount: countForLevel('Critical'),
      highCount: countForLevel('High'),
    };
  }, [index, result, isError]);

  return { stats, isLoading, isError };
};
