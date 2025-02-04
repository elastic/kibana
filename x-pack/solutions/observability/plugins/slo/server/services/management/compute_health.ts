/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import { TransformHealthStatus, TransformStats, TransformStatsState } from '@kbn/slo-schema';
import { Dictionary, find, flatMap, groupBy } from 'lodash';
import moment from 'moment';
import {
  HEALTH_INDEX_NAME,
  SLO_MODEL_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
} from '../../../common/constants';
import { SLODefinition, SLOHealth, StoredSLODefinition } from '../../domain/models';
import { getDelayInSecondsFromSLO } from '../../domain/services/get_delay_in_seconds_from_slo';
import { SO_SLO_TYPE } from '../../saved_objects';
import { toSLODefinition } from '../slo_repository';

interface SummaryAggBucketKey {
  sloId: string;
  sloRevision: string;
}

interface SummaryAggBucket {
  key: SummaryAggBucketKey;
  doc_count: number;
  lastRollupIngestedAt: { value: number };
  summaryUpdatedAt: { value: number };
}
interface SummaryAggResults {
  bySlo: {
    buckets: SummaryAggBucket[];
  };
}

const BATCH_SIZE = 100;

export class ComputeHealth {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly soClient: SavedObjectsClient,
    private readonly logger: Logger
  ) {}

  public async execute(): Promise<void> {
    this.logger.info('[HealthTask] Computing health...');

    const finder = await this.soClient.createPointInTimeFinder<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      perPage: BATCH_SIZE,
      namespaces: ['*'],
    });
    const createdAt = new Date();

    for await (const response of finder.find()) {
      function getSLOSpaceId(id: string) {
        return (
          response.saved_objects.find((so) => so.attributes.id === id)?.namespaces?.[0] ?? 'default'
        );
      }

      const sloDefinitions = response.saved_objects
        .map((so) => toSLODefinition(so, this.logger))
        .filter(Boolean) as SLODefinition[];

      this.logger.debug(
        `[HealthTask] Processing ${sloDefinitions.length} SLO Definitions from ${response.saved_objects.length} Saved Objects`
      );

      if (sloDefinitions.length === 0) {
        continue;
      }

      const { transformStats, summaryResults } = await this.getData(sloDefinitions);
      const transformStatsById = groupBy(transformStats.transforms, 'id');

      const health: SLOHealth[] = sloDefinitions.map((sloDefinition) => {
        const rollupTransformId = getSLOTransformId(sloDefinition.id, sloDefinition.revision);
        const summaryTransformId = getSLOSummaryTransformId(
          sloDefinition.id,
          sloDefinition.revision
        );
        const rollupTransform = this.toTransformStats(rollupTransformId, transformStatsById);
        const summaryTransform = this.toTransformStats(summaryTransformId, transformStatsById);

        const summaryResult = find(
          summaryResults.aggregations?.bySlo.buckets,
          (bucket) => bucket.key.sloId === sloDefinition.id
        );

        const summaryUpdatedAt = new Date(summaryResult?.summaryUpdatedAt.value ?? 0);
        const lastRollupIngestedAt = new Date(summaryResult?.lastRollupIngestedAt.value ?? 0);

        const delay = moment(summaryUpdatedAt).diff(lastRollupIngestedAt, 'ms');
        const staleTime = moment().diff(summaryUpdatedAt, 'ms');
        const isOutdatedVersion = sloDefinition.version < SLO_MODEL_VERSION;

        const overallStatus = this.computeStatus(
          rollupTransform,
          summaryTransform,
          delay,
          staleTime,
          isOutdatedVersion,
          sloDefinition
        );

        return {
          id: sloDefinition.id,
          name: sloDefinition.name,
          description: sloDefinition.description,
          tags: sloDefinition.tags,
          revision: sloDefinition.revision,
          version: sloDefinition.version,
          instances: summaryResult?.doc_count ?? 0,
          spaceId: getSLOSpaceId(sloDefinition.id),
          createdAt: createdAt.toISOString(),
          status: overallStatus,
          health: {
            rollupTransform: this.isTransformHealthyRunning(rollupTransform) ? 'healthy' : 'failed',
            summaryTransform: this.isTransformHealthyRunning(summaryTransform)
              ? 'healthy'
              : 'failed',
            delay: this.isDelayDegraded(delay, sloDefinition) ? 'degraded' : 'healthy',
            staleTime: this.isStaleTimeDegraded(staleTime) ? 'degraded' : 'healthy',
            version: isOutdatedVersion ? 'degraded' : 'healthy',
          },
          data: {
            summaryUpdatedAt: summaryUpdatedAt.toISOString(),
            lastRollupIngestedAt: lastRollupIngestedAt.toISOString(),
            delay,
            staleTime,
            summaryTransform,
            rollupTransform,
          },
        };
      });

      this.logger.info(`[HealthTask] Indexing ${health.length} health documents`);
      await this.esClient.bulk({
        index: HEALTH_INDEX_NAME,
        operations: health.flatMap((doc) => [{ index: { _id: doc.id } }, doc]),
      });
    }

    await finder.close();

    // remove old health documents (e.g. from SLO Definitions that were deleted)
    await this.esClient.deleteByQuery({
      index: HEALTH_INDEX_NAME,
      body: {
        query: {
          range: {
            createdAt: {
              lte: 'now-1d/d',
            },
          },
        },
      },
    });
  }

  private toTransformStats(
    transformId: string,
    transformStatsById: Dictionary<TransformGetTransformStatsTransformStats[]>
  ) {
    function toTransformHealthStatus(status?: string): TransformHealthStatus {
      switch (status?.toLocaleLowerCase()) {
        case 'green':
          return 'green';
        case 'yellow':
          return 'yellow';
        case 'red':
          return 'red';
        default:
          return 'unknown';
      }
    }

    function toTransformStatsState(state?: string): TransformStatsState {
      switch (state?.toLocaleLowerCase()) {
        case 'started':
          return 'started';
        case 'indexing':
          return 'indexing';
        case 'stopped':
          return 'stopped';
        case 'stopping':
          return 'stopping';
        case 'aborting':
          return 'aborting';
        case 'failed':
        default:
          return 'failed';
      }
    }

    return {
      id: transformId,
      state: toTransformStatsState(transformStatsById[transformId][0]?.state),
      reason: transformStatsById[transformId][0]?.reason ?? 'unknown',
      health: {
        status: toTransformHealthStatus(transformStatsById[transformId][0]?.health?.status),
        // @ts-ignore transformStats response type is not properly typed
        issues: transformStatsById[transformId][0]?.health?.issues ?? [],
      },
    };
  }

  private computeStatus(
    rollupTransform: TransformStats,
    summaryTransform: TransformStats,
    delay: number,
    staleTime: number,
    isOutdatedVersion: boolean,
    sloDefinition: SLODefinition
  ) {
    if (!this.isTransformHealthyRunning(rollupTransform)) {
      return 'failed';
    }

    if (!this.isTransformHealthyRunning(summaryTransform)) {
      return 'failed';
    }

    if (this.isDelayDegraded(delay, sloDefinition)) {
      return 'degraded';
    }

    if (this.isStaleTimeDegraded(staleTime)) {
      return 'degraded';
    }

    if (isOutdatedVersion) {
      return 'degraded';
    }

    return 'healthy';
  }

  private isStaleTimeDegraded(staleTime: number) {
    const STALE_TIME_DEGRADED = 24 * 60 * 60 * 1000;
    return staleTime > STALE_TIME_DEGRADED;
  }

  private isDelayDegraded(delay: number, sloDefinition: SLODefinition) {
    const sloDelay = getDelayInSecondsFromSLO(sloDefinition) * 1000;
    const DELAY_BUFFER = 5 * 60 * 1000;
    return delay > sloDelay + 2 * DELAY_BUFFER;
  }

  private isTransformHealthyRunning(transform: TransformStats) {
    return transform.health.status === 'green' && ['started', 'indexing'].includes(transform.state);
  }

  private async getData(sloDefinitions: SLODefinition[]) {
    const transformIds = flatMap(sloDefinitions, (definition) => [
      getSLOTransformId(definition.id, definition.revision),
      getSLOSummaryTransformId(definition.id, definition.revision),
    ]);

    const [transformStats, summaryResults] = await Promise.all([
      this.esClient.transform.getTransformStats({
        transform_id: transformIds,
        allow_no_match: true,
        size: transformIds.length,
      }),
      this.esClient.search<unknown, SummaryAggResults>({
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        size: 0,
        query: {
          bool: {
            should: sloDefinitions.map((sloDefinition) => ({
              bool: {
                must: [
                  { term: { 'slo.id': sloDefinition.id } },
                  { term: { 'slo.revision': sloDefinition.revision } },
                ],
              },
            })),
            minimum_should_match: 1,
          },
        },
        aggs: {
          bySlo: {
            composite: {
              size: BATCH_SIZE,
              sources: [
                { sloId: { terms: { field: 'slo.id' } } },
                { sloRevision: { terms: { field: 'slo.revision' } } },
              ],
            },
            aggregations: {
              summaryUpdatedAt: {
                max: {
                  field: 'summaryUpdatedAt',
                },
              },
              lastRollupIngestedAt: {
                max: {
                  field: 'latestSliTimestamp',
                },
              },
            },
          },
        },
      }),
    ]);

    this.logger.debug(
      `[HealthTask] Found ${transformStats.transforms.length} transform stats for ${sloDefinitions.length} SLO Definitions`
    );
    this.logger.debug(
      `[HealthTask] Found ${summaryResults.aggregations?.bySlo.buckets.length} summary buckets for ${sloDefinitions.length} SLO Definitions`
    );
    return { transformStats, summaryResults };
  }
}
