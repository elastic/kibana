/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { FetchSLOHealthParams, FetchSLOHealthResponse } from '@kbn/slo-schema';
import { fetchSLOHealthResponseSchema } from '@kbn/slo-schema';
import { type Dictionary, keyBy } from 'lodash';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../common/constants';
import type { HealthStatus } from '../domain/models/health';

export class GetSLOHealth {
  constructor(private scopedClusterClient: IScopedClusterClient) {}

  public async execute(params: FetchSLOHealthParams): Promise<FetchSLOHealthResponse> {
    const sloDefs: Array<{
      sloId: string;
      sloInstanceId: string;
      sloRevision: number;
      sloName: string;
    }> = [];

    // need to get all definitions here

    const page = typeof params.page === 'number' && params.page >= 0 ? params.page : 0;
    const perPage =
      typeof params.perPage === 'number' && params.perPage >= 1 && params.perPage <= 100
        ? params.perPage
        : 100;

    const filteredList = sloDefs.map((item) => ({
      sloId: item.sloId,
      sloInstanceId: item.sloInstanceId,
      sloRevision: item.sloRevision,
      sloName: item.sloName,
    }));

    const results = await Promise.all(
      filteredList.map(async (item) => {
        const transformStatsById = await this.getTransformStatsForSLO(item);
        const health = computeHealth(transformStatsById, item);

        return {
          sloId: item.sloId,
          sloName: item.sloName,
          sloInstanceId: item.sloInstanceId,
          sloRevision: item.sloRevision,
          health,
        };
      })
    );

    const mappedResults = Array.from(
      new Map(results.map((item) => [`${item.sloId}-${item.sloRevision}`, item])).values()
    );

    const uniqueResults = params.statusFilter
      ? mappedResults.filter((item) => item.health.overall === params.statusFilter)
      : mappedResults;

    return fetchSLOHealthResponseSchema.encode({
      data: uniqueResults.slice(page * perPage, (page + 1) * perPage),
      page,
      perPage,
      total: uniqueResults.length,
    });
  }

  private async getTransformStatsForSLO(item: {
    sloId: string;
    sloRevision: number;
  }): Promise<Dictionary<TransformGetTransformStatsTransformStats>> {
    const rollupTransformStats =
      await this.scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
        {
          transform_id: getSLOTransformId(item.sloId, item.sloRevision),
          allow_no_match: true,
          size: 1,
        },
        { ignore: [404] }
      );

    const summaryTransformStats =
      await this.scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
        {
          transform_id: getSLOSummaryTransformId(item.sloId, item.sloRevision),
          allow_no_match: true,
          size: 1,
        },
        { ignore: [404] }
      );

    const allTransforms = [
      ...(rollupTransformStats.transforms || []),
      ...(summaryTransformStats.transforms || []),
    ];

    return keyBy(allTransforms, (transform) => transform.id);
  }
}

function getTransformHealth(
  transformStat?: TransformGetTransformStatsTransformStats
): HealthStatus {
  if (!transformStat) {
    return {
      status: 'missing',
    };
  }
  const transformState = transformStat.state?.toLowerCase();
  return transformStat.health?.status?.toLowerCase() === 'green'
    ? {
        status: 'healthy',
        transformState: transformState as HealthStatus['transformState'],
      }
    : {
        status: 'unhealthy',
        transformState: transformState as HealthStatus['transformState'],
      };
}

function computeHealth(
  transformStatsById: Dictionary<TransformGetTransformStatsTransformStats>,
  item: { sloId: string; sloInstanceId: string; sloRevision: number }
): { overall: 'healthy' | 'unhealthy'; rollup: HealthStatus; summary: HealthStatus } {
  const rollup = getTransformHealth(
    transformStatsById[getSLOTransformId(item.sloId, item.sloRevision)]
  );
  const summary = getTransformHealth(
    transformStatsById[getSLOSummaryTransformId(item.sloId, item.sloRevision)]
  );

  const overall: 'healthy' | 'unhealthy' =
    rollup.status === 'healthy' && summary.status === 'healthy' ? 'healthy' : 'unhealthy';

  return { overall, rollup, summary };
}
