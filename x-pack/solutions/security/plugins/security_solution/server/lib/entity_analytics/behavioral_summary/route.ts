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
import { API_VERSIONS, APP_ID } from '../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import { getMlAdDetailsIndexName } from '../maintainers/behaviors/ml_anomaly_detection/constants';

export const BEHAVIORAL_SUMMARY_URL =
  '/internal/entity_analytics/entities/{entity_id}/behavioral_summary';

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
  baseline?: Array<{ value: string; doc_count: number }>;
}

/**
 * Queries the ML AD details index for pre-computed anomaly records.
 * Returns the most recent anomaly per (job_id, detector_index) for the entity.
 */
const getAnomaliesFromDetailsIndex = async ({
  esClient,
  detailsIndex,
  entityId,
}: {
  esClient: ElasticsearchClient;
  detailsIndex: string;
  entityId: string;
}): Promise<AnomalySummaryEntry[]> => {
  const resp = await esClient.search<DetailsIndexDoc>({
    index: detailsIndex,
    size: 1000,
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: {
      term: { 'entity.id': entityId },
    },
  });

  // Keep only the most recent anomaly per (job_id, detector_index); hits are sorted desc by @timestamp
  const seen = new Set<string>();
  return resp.hits.hits.reduce<AnomalySummaryEntry[]>((entries, hit) => {
    const source = hit._source;
    if (!source) return entries;

    const key = `${source.anomaly.job_id}:${source.anomaly.detector_index}`;
    if (seen.has(key)) return entries;
    seen.add(key);

    entries.push({
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
      })),
      sourceIndex: [],
    });
    return entries;
  }, []);
};

export const registerBehavioralSummaryRoutes = ({ router, logger }: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .get({
      access: 'internal',
      path: BEHAVIORAL_SUMMARY_URL,
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
            query: z.object({}).optional(),
          },
        },
      },
      async (context, request, response) => {
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
      }
    );
};
