/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { AnomalySummaryEntry } from '../../../../common/api/entity_analytics';
import type { EnrichedAnomalyRecord } from '../maintainers/behaviors/ml_anomaly_detection/types';
import { getMlAdDetailsIndexName } from '../maintainers/behaviors/ml_anomaly_detection/constants';
import {
  tactics as mitreTactics,
  techniques as mitreTechniques,
  subtechniques as mitreSubtechniques,
} from '../../../../common/detection_engine/mitre/mitre_tactics_techniques';

const tacticNameById = new Map(mitreTactics.map(({ id, name }) => [id, name]));
const techniqueNameById = new Map(
  [...mitreTechniques, ...mitreSubtechniques].map(({ id, name }) => [id, name])
);

interface GetJobConfigOpts {
  jobIds: string[];
  logger: Logger;
  ml: MlPluginSetup;
  soClient: SavedObjectsClientContract;
}

interface JobCustomSettings {
  security_app_display_name?: string;
  threat_tactics?: string[];
  threat_techniques?: string[];
}

export interface JobConfig {
  jobName: string | null;
  threatTactics: string[];
  threatTechniques: string[];
}

export const getJobConfigs = async ({
  jobIds,
  logger,
  ml,
  soClient,
}: GetJobConfigOpts): Promise<Map<string, JobConfig>> => {
  const result = new Map<string, JobConfig>();
  if (!jobIds.length) return result;

  try {
    const resp = await ml
      .anomalyDetectorsProvider({} as KibanaRequest, soClient)
      .jobs(jobIds.join(','));

    for (const job of resp.jobs ?? []) {
      if (job.job_id) {
        const customSettings = (job.custom_settings ?? {}) as JobCustomSettings;
        result.set(job.job_id, {
          jobName: customSettings.security_app_display_name ?? null,
          threatTactics: (customSettings.threat_tactics ?? []).map(
            (id) => tacticNameById.get(id) ?? id
          ),
          threatTechniques: (customSettings.threat_techniques ?? []).map(
            (id) => techniqueNameById.get(id) ?? id
          ),
        });
      }
    }
  } catch (err) {
    logger.error(`Failed to get job configs for jobs [${jobIds.join(', ')}]: ${err}`);
  }

  return result;
};

interface ParseAnomalySearchResponseOpts {
  hits: Array<SearchHit<EnrichedAnomalyRecord>>;
  jobConfigs: Map<string, JobConfig>;
}

export const parseAnomalySearchResponse = ({
  hits,
  jobConfigs,
}: ParseAnomalySearchResponseOpts): AnomalySummaryEntry[] =>
  hits.flatMap((hit) => {
    const source = hit._source;
    if (!source) return [];

    const { anomaly } = source;
    const jobConfig = jobConfigs.get(anomaly.job_id);

    return [
      {
        jobId: anomaly.job_id,
        jobName: jobConfig?.jobName ?? null,
        threatTactics: jobConfig?.threatTactics,
        threatTechniques: jobConfig?.threatTechniques,
        detectorIndex: anomaly.detector_index,
        detectorFunction: anomaly.detector_function,
        fieldName: anomaly.field_name ?? null,
        byFieldName: anomaly.by_field_name ?? null,
        byFieldValue: anomaly.by_field_value ?? null,
        overFieldName: anomaly.over_field_name ?? null,
        overFieldValue: anomaly.over_field_value ?? null,
        partitionFieldName: anomaly.partition_field_name ?? null,
        partitionFieldValue: anomaly.partition_field_value ?? null,
        recordScore: anomaly.record_score,
        timestamp: new Date(anomaly.timestamp).toISOString(),
        actual: anomaly.actual != null ? [anomaly.actual] : [],
        typical: anomaly.typical != null ? [anomaly.typical] : [],
        baselineValues: (anomaly.baseline_values ?? []).map(String),
        anomalousValue:
          anomaly.anomalous_value != null ? String(anomaly.anomalous_value) : undefined,
        anomalousValueCount: anomaly.anomalous_value_count,
      },
    ];
  });

type SortField = '@timestamp' | 'record_score' | 'job_id';
type SortOrder = 'asc' | 'desc';

const SORT_FIELD_MAP: Record<SortField, string> = {
  '@timestamp': 'anomaly.timestamp',
  record_score: 'anomaly.record_score',
  job_id: 'anomaly.job_id',
};

const DEFAULT_SORT: Array<{ field: SortField; order: SortOrder }> = [
  { field: '@timestamp', order: 'desc' },
];

interface GetAnomaliesFromDetailsIndexParams {
  entityId: string;
  esClient: ElasticsearchClient;
  fromMs?: number;
  jobIds?: string[];
  logger: Logger;
  ml?: MlPluginSetup;
  namespace: string;
  offset?: number;
  pageSize?: number;
  sort?: Array<{ field: SortField; order: SortOrder }>;
  soClient: SavedObjectsClientContract;
}

export const getAnomaliesFromDetailsIndex = async ({
  esClient,
  entityId,
  fromMs,
  jobIds,
  logger,
  ml,
  namespace,
  offset = 0,
  pageSize = 100,
  sort = DEFAULT_SORT,
  soClient,
}: GetAnomaliesFromDetailsIndexParams): Promise<AnomalySummaryEntry[]> => {
  const detailsIndex = getMlAdDetailsIndexName(namespace);
  const resp = await esClient.search<EnrichedAnomalyRecord>({
    index: detailsIndex,
    from: offset,
    size: pageSize,
    query: {
      bool: {
        filter: [
          { term: { 'entity.id': entityId } },
          ...(fromMs != null ? [{ range: { '@timestamp': { gte: fromMs } } }] : []),
          ...(jobIds?.length ? [{ terms: { 'anomaly.job_id': jobIds } }] : []),
        ],
      },
    },
    sort: sort.map(({ field, order }) => ({ [SORT_FIELD_MAP[field]]: { order } })),
    collapse: { field: 'anomaly._id' },
  });

  const { hits } = resp.hits;

  let jobConfigs = new Map<string, JobConfig>();
  if (ml) {
    const uniqueJobIds = [
      ...new Set(hits.flatMap((h) => (h._source ? [h._source.anomaly.job_id] : []))),
    ];
    jobConfigs = await getJobConfigs({ jobIds: uniqueJobIds, logger, ml, soClient });
  }

  return parseAnomalySearchResponse({ hits, jobConfigs });
};
