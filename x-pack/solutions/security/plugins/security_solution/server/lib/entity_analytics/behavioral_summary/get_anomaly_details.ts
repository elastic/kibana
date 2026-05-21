/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { AnomalySummaryEntry } from '../../../../common/api/entity_analytics';
import type { EnrichedAnomalyRecord } from '../maintainers/behaviors/ml_anomaly_detection/types';

export const parseAnomalySearchResponse = (
  hits: Array<SearchHit<EnrichedAnomalyRecord>>
): AnomalySummaryEntry[] =>
  hits.flatMap((hit) => {
    const source = hit.inner_hits?.most_recent?.hits?.hits[0]?._source as
      | EnrichedAnomalyRecord
      | undefined;
    if (!source) return [];

    return [
      {
        jobId: source.anomaly.job_id,
        detectorIndex: source.anomaly.detector_index,
        byFieldName: source.anomaly.by_field_name ?? null,
        byFieldValue: source.anomaly.by_field_value ?? null,
        recordScore: source.anomaly.record_score,
        timestamp: new Date(source.anomaly.timestamp).toISOString(),
        actual: source.anomaly.actual != null ? [source.anomaly.actual] : [],
        typical: source.anomaly.typical != null ? [source.anomaly.typical] : [],
        baseline: (source.baseline ?? []).map((b) => ({
          value: b.value,
          docCount: b.doc_count,
          topHits: b.top_hits,
        })),
        sourceIndex: [],
      },
    ];
  });

interface GetAnomaliesFromDetailsIndexParams {
  detailsIndex: string;
  entityId: string;
  esClient: ElasticsearchClient;
}

export const getAnomaliesFromDetailsIndex = async ({
  esClient,
  detailsIndex,
  entityId,
}: GetAnomaliesFromDetailsIndexParams): Promise<AnomalySummaryEntry[]> => {
  const resp = await esClient.search<EnrichedAnomalyRecord>({
    _source: false,
    index: detailsIndex,
    size: 200,
    query: { term: { 'entity.id': entityId } },
    sort: [{ 'anomaly.record_score': { order: 'desc' } }],
    collapse: {
      field: 'anomaly.job_id',
      inner_hits: {
        name: 'most_recent',
        size: 1,
        sort: [{ 'anomaly.timestamp': { order: 'desc' } }],
      },
    },
  });

  return parseAnomalySearchResponse(resp.hits.hits);
};
