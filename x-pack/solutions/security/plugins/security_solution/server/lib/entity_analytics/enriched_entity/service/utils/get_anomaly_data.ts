/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { Entity } from '@kbn/entity-store/common';
import type { MlSummaryJob } from '@kbn/ml-plugin/server';
import type { ExperimentalFeatures } from '../../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { getThreshold } from '../../../../../../common/utils/ml';
import { isSecurityJob } from '../../../../../../common/machine_learning/is_security_job';
import { DEFAULT_ANOMALY_SCORE } from '../../../../../../common/constants';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EnrichedAnomalyRecord } from '../../../maintainers/behaviors/ml_anomaly_detection/types';
import { getMlAdDetailsIndexName } from '../../../maintainers/behaviors/ml_anomaly_detection/constants';

type Ml = EntityAnalyticsRoutesDeps['ml'];

export interface AnomalyRecord {
  source: Record<string, unknown>;
  job: { name?: string; description?: string };
}

interface GetAnomalyDataOptions {
  entities: Entity[];
  esClient: ElasticsearchClient;
  experimentalFeatures: ExperimentalFeatures;
  fromDate: number;
  namespace: string;
  toDate: number;
  ml: Ml;
  soClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
}

const getAnomalyDataFromMaintainer = async ({
  entities,
  esClient,
  namespace,
}: Pick<GetAnomalyDataOptions, 'entities' | 'esClient' | 'namespace'>): Promise<
  AnomalyRecord[][]
> => {
  return Promise.all(
    entities.map(async ({ entity }) => {
      const entityIdentifier = entity?.id;
      const entityType = entity?.EngineMetadata?.Type as EntityType | undefined;
      const jobIds = entity?.behaviors?.anomaly_job_ids ?? [];
      if (!entityIdentifier || !entityType || jobIds.length === 0) {
        return [];
      }

      const response = await esClient.search<EnrichedAnomalyRecord>({
        index: getMlAdDetailsIndexName(namespace),
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              { term: { 'entity.id': entityIdentifier } },
              { terms: { 'anomaly.job_id': jobIds } },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        collapse: { field: 'anomaly.job_id' },
        size: jobIds.length,
      });
      return response.hits.hits.flatMap((hit) => {
        if (!hit._source) return [];
        const { job_name: jobName, ...anomalyFields } = hit._source.anomaly;
        return [
          {
            source: { ...anomalyFields, baseline: hit._source.baseline },
            job: { name: jobName },
          },
        ];
      });
    })
  );
};

const getAnomalyDataFromMl = async ({
  entities,
  fromDate,
  ml,
  soClient,
  toDate,
  uiSettingsClient,
}: Omit<GetAnomalyDataOptions, 'esClient' | 'experimentalFeatures' | 'namespace'>) => {
  if (!ml) {
    return entities.map(() => []);
  }

  const request = {} as KibanaRequest;
  const jobs: MlSummaryJob[] = await ml.jobServiceProvider(request, soClient).jobsSummary();
  const securityJobIds = jobs.filter(isSecurityJob).map((j) => j.id);
  const { getAnomaliesTableData } = ml.resultsServiceProvider(request, soClient);
  const anomalyScore = await uiSettingsClient.get<number>(DEFAULT_ANOMALY_SCORE);

  const jobMetaById = jobs.reduce<Record<string, { name: string; description: string }>>(
    (acc, job) => {
      acc[job.id] = {
        name: job.customSettings?.security_app_display_name ?? job.id,
        description: job.description,
      };
      return acc;
    },
    {}
  );

  return Promise.all(
    entities.map(async ({ entity }) => {
      const entityIdentifier = entity?.id;
      const entityType = entity?.EngineMetadata?.Type as EntityType | undefined;
      if (!entityIdentifier || !entityType) {
        return [];
      }
      const fieldName = EntityTypeToIdentifierField[entityType];
      const criteriaFields = [{ fieldName, fieldValue: entityIdentifier }];

      const anomaliesData = await getAnomaliesTableData(
        securityJobIds,
        criteriaFields,
        [],
        'auto',
        [{ min: getThreshold(anomalyScore, -1) }],
        fromDate,
        toDate,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        500,
        10,
        undefined
      );

      return anomaliesData.anomalies.map((anomaly) => ({
        source: anomaly.source,
        job: jobMetaById[anomaly.jobId],
      }));
    })
  );
};

export const getAnomalyData = async ({
  entities,
  esClient,
  experimentalFeatures,
  fromDate,
  namespace,
  toDate,
  ml,
  soClient,
  uiSettingsClient,
}: GetAnomalyDataOptions): Promise<AnomalyRecord[][]> => {
  if (entities.length === 0) {
    return [];
  }

  return experimentalFeatures.entityAnalyticsMlJobBehaviorMaintainer
    ? getAnomalyDataFromMaintainer({ entities, esClient, namespace })
    : getAnomalyDataFromMl({ entities, fromDate, ml, soClient, toDate, uiSettingsClient });
};
