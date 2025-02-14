/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import { PublicAlertsClient } from '@kbn/alerting-plugin/server/alerts_client/types';
import {
  ElasticsearchClient,
  IBasePath,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { TransformHealthStatus, TransformStats, TransformStatsState } from '@kbn/slo-schema';
import { Dictionary, find, flatMap, groupBy } from 'lodash';
import moment from 'moment';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { getAlertDetailsUrl } from '@kbn/observability-plugin/common';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import {
  SLO_MODEL_VERSION,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
} from '../../../../../common/constants';
import { SLO_ID_FIELD, SLO_REVISION_FIELD } from '../../../../../common/field_names/slo';
import { SLODefinition, StoredSLODefinition } from '../../../../domain/models';
import { getDelayInSecondsFromSLO } from '../../../../domain/services/get_delay_in_seconds_from_slo';
import { SO_SLO_TYPE } from '../../../../saved_objects';
import { toSLODefinition } from '../../../../services/slo_repository';
import {
  ALERT_ACTION,
  AlertStates,
  HealthAlertContext,
  HealthAlertState,
  HealthAllowedActionGroups,
  HealthRuleTypeState,
} from '../types';

interface SummaryAggBucketKey {
  sloId: string;
  sloRevision: string;
  spaceId: string;
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

export class MonitorHealth {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly soClient: SavedObjectsClientContract,
    private readonly logger: Logger,
    private readonly alertsClient: PublicAlertsClient<
      HealthRuleTypeState,
      HealthAlertState,
      HealthAlertContext,
      HealthAllowedActionGroups
    >
  ) {}

  public async execute({
    spaceId,
    basePath,
    startedAt,
  }: {
    spaceId: string;
    basePath: IBasePath;
    startedAt: Date;
  }): Promise<void> {
    const alertLimit = this.alertsClient.getAlertLimitValue();
    let hasReachedLimit = false;
    let scheduledActionsCount = 0;

    const finder = await this.soClient.createPointInTimeFinder<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      perPage: BATCH_SIZE,
      namespaces: [spaceId],
    });

    for await (const response of finder.find()) {
      const sloDefinitions = response.saved_objects
        .map((savedObject) => toSLODefinition(savedObject, this.logger))
        .filter(Boolean) as SLODefinition[];

      if (sloDefinitions.length === 0) {
        continue;
      }

      if (scheduledActionsCount >= alertLimit) {
        hasReachedLimit = true;
        break;
      }

      const { transformStats, summaryResults } = await this.getData(sloDefinitions, spaceId);
      const transformStatsById = groupBy(transformStats.transforms, 'id');

      for (const sloDefinition of sloDefinitions) {
        const rollupTransformId = getSLOTransformId(sloDefinition.id, sloDefinition.revision);
        const summaryTransformId = getSLOSummaryTransformId(
          sloDefinition.id,
          sloDefinition.revision
        );
        const rollupTransform = this.toTransformStats(rollupTransformId, transformStatsById);
        const summaryTransform = this.toTransformStats(summaryTransformId, transformStatsById);

        const summaryResult = find(
          summaryResults.aggregations?.bySlo.buckets,
          (bucket) => bucket.key.sloId === sloDefinition.id && bucket.key.spaceId === spaceId
        );

        const summaryUpdatedAt = new Date(summaryResult?.summaryUpdatedAt.value ?? 0);
        const lastRollupIngestedAt = new Date(summaryResult?.lastRollupIngestedAt.value ?? 0);

        const delay = moment(summaryUpdatedAt).diff(lastRollupIngestedAt, 's');
        const staleTime = moment().diff(summaryUpdatedAt, 's');
        const isOutdatedVersion = sloDefinition.version < SLO_MODEL_VERSION;

        const status = this.computeStatus(
          rollupTransform,
          summaryTransform,
          delay,
          staleTime,
          isOutdatedVersion,
          sloDefinition
        );

        if (status !== 'healthy') {
          if (scheduledActionsCount >= alertLimit) {
            hasReachedLimit = true;
            break;
          }

          const reason = `SLO is ${status}.`;
          const alertId = sloDefinition.id;

          const { uuid } = this.alertsClient.report({
            id: alertId,
            actionGroup: ALERT_ACTION.id,
            state: {
              alertState: AlertStates.ALERT,
            },
            payload: {
              [ALERT_REASON]: reason,
              [SLO_ID_FIELD]: sloDefinition.id,
              [SLO_REVISION_FIELD]: sloDefinition.revision,
            },
          });

          const alertDetailsUrl = await getAlertDetailsUrl(basePath, spaceId, uuid);
          const viewInAppUrl = addSpaceIdToPath(
            basePath.publicBaseUrl,
            spaceId,
            `/app/observability/slos/${sloDefinition.id}`
          );

          const context = {
            alertDetailsUrl,
            reason,
            timestamp: startedAt.toISOString(),
            viewInAppUrl,
            sloId: sloDefinition.id,
            sloName: sloDefinition.name,
          };

          this.alertsClient.setAlertData({ id: alertId, context });
          scheduledActionsCount++;
        }
      }
    }

    this.alertsClient.setAlertLimitReached(hasReachedLimit);

    await finder.close();
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

  private async getData(sloDefinitions: SLODefinition[], spaceId: string) {
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
                  { term: { spaceId } },
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
                { spaceId: { terms: { field: 'spaceId' } } },
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

    return { transformStats, summaryResults };
  }
}
