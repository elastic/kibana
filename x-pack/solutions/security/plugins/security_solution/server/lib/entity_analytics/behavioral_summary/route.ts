/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { z } from '@kbn/zod/v4';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnomalySummaryEntry } from '../../../../common/api/entity_analytics';
import { GetBehavioralSummaryRequestParams } from '../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID, BEHAVIOR_DETAILS_INTERNAL_URL } from '../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import { getMlAdDetailsIndexName } from '../maintainers/behaviors/ml_anomaly_detection/constants';
import { withMinimumLicense } from '../utils/with_minimum_license';

interface DetailsIndexDoc {
  entity: { id: string; type: string };
  anomaly: {
    _id: string;
    job_id: string;
    detector_index: number;
    timestamp: number;
    record_score: number;
    actual?: number;
    typical?: number;
    by_field_name?: string;
    by_field_value?: string;
  };
  baseline?: Array<{ value: string; doc_count: number; top_hits: unknown[] }>;
}

/**
 * Queries the ML AD details index for pre-computed anomaly records.
 * Returns the most recent anomaly per (job_id, detector_index) for the entity.
 */
interface ByJobAggregation {
  by_job: {
    buckets: Array<{
      key: string;
      top_anomaly: { hits: { hits: Array<{ _source: DetailsIndexDoc }> } };
    }>;
  };
}

const getAnomaliesFromDetailsIndex = async ({
  esClient,
  detailsIndex,
  entityId,
}: {
  esClient: ElasticsearchClient;
  detailsIndex: string;
  entityId: string;
}): Promise<AnomalySummaryEntry[]> => {
  const resp = await esClient.search<DetailsIndexDoc, ByJobAggregation>({
    index: detailsIndex,
    size: 0,
    query: { term: { 'entity.id': entityId } },
    aggs: {
      by_job: {
        terms: { field: 'anomaly.job_id', size: 100 },
        aggs: {
          top_anomaly: {
            top_hits: {
              size: 1,
              sort: [{ 'anomaly.record_score': { order: 'desc' } }],
            },
          },
        },
      },
    },
  });

  return (resp.aggregations?.by_job.buckets ?? []).flatMap((bucket) => {
    const source = bucket.top_anomaly.hits.hits[0]?._source;
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
};

export const registerBehavioralSummaryRoutes = ({ router, logger }: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .get({
      access: 'internal',
      path: BEHAVIOR_DETAILS_INTERNAL_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: GetBehavioralSummaryRequestParams,
          },
        },
      },
      withMinimumLicense(async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { entity_id: entityId } = request.params;

          const secSol = await context.securitySolution;
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const namespace = secSol.getSpaceId();
          const detailsIndex = getMlAdDetailsIndexName(namespace);

          const anomalies = await getAnomaliesFromDetailsIndex({
            esClient,
            detailsIndex,
            entityId,
          });

          return response.ok({
            body: {
              entityId,
              anomalies,
            },
          });
        } catch (err) {
          logger.error(`[behavioral_summary] ${err}`);
          return siemResponse.error({
            statusCode: 500,
            body: err instanceof Error ? err.message : String(err),
          });
        }
      }, 'platinum')
    );
};
