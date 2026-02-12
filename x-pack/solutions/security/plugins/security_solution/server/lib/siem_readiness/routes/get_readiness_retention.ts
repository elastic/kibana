/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetDataStreamResponse, IlmGetLifecycleResponse } from '@elastic/elasticsearch/lib/api/types';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { RetentionInfo, RetentionType, RetentionStatus, RetentionResponse } from '@kbn/siem-readiness';
import { GET_SIEM_READINESS_RETENTION_API_PATH } from '../../../../common/api/siem_readiness/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';

// FedRAMP Threshold: 12 months (365 days)
const RETENTION_THRESHOLD_DAYS = 365;

/**
 * Parse retention period string (e.g., "30d", "90d", "365d") to number of days
 */
const parseRetentionToDays = (retention: string | null | undefined): number | null => {
  if (!retention) return null;

  const match = retention.match(/^(\d+)([dhms])$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value;
    case 'h':
      return Math.floor(value / 24);
    case 'm':
      return Math.floor(value / (24 * 60));
    case 's':
      return Math.floor(value / (24 * 60 * 60));
    default:
      return null;
  }
};

/**
 * Get retention status based on retention days
 */
const getRetentionStatus = (retentionDays: number | null): RetentionStatus => {
  if (retentionDays === null) return 'unknown';
  return retentionDays >= RETENTION_THRESHOLD_DAYS ? 'healthy' : 'non-compliant';
};

/**
 * Extract retention period from ILM policy delete phase
 */
const getIlmRetentionPeriod = (policy: IlmGetLifecycleResponse[string]): string | null => {
  const deletePhase = policy?.policy?.phases?.delete;
  if (deletePhase && 'min_age' in deletePhase) {
    return deletePhase.min_age as string;
  }
  return null;
};

/**
 * Extract retention info (type, period, policy name) from a data stream
 * Checks DSL first, then falls back to ILM
 */
const extractRetentionInfo = (
  dataStream: IndicesGetDataStreamResponse['data_streams'][0],
  ilmPolicies: IlmGetLifecycleResponse
): { retentionType: RetentionType; retentionPeriod: string | null; policyName: string | null } => {
  // Check for DSL (Data Stream Lifecycle) first
  // Prefer effective_retention (actual applied value) over data_retention (configured value)
  const lifecycle = dataStream.lifecycle as Record<string, unknown> | undefined;
  if (lifecycle && lifecycle.enabled !== false) {
    const effectiveRetention = lifecycle.effective_retention as string | undefined;
    const dataRetention = lifecycle.data_retention as string | undefined;

    if (effectiveRetention || dataRetention) {
      return {
        retentionType: 'dsl',
        retentionPeriod: effectiveRetention ?? dataRetention ?? null,
        policyName: null,
      };
    }
  }

  // Check for ILM policy (fallback if DSL not configured)
  if (dataStream.ilm_policy) {
    const ilmPolicy = ilmPolicies[dataStream.ilm_policy];
    if (ilmPolicy) {
      return {
        retentionType: 'ilm',
        retentionPeriod: getIlmRetentionPeriod(ilmPolicy),
        policyName: dataStream.ilm_policy,
      };
    }
  }

  return { retentionType: null, retentionPeriod: null, policyName: null };
};

export const getReadinessRetentionRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .get({
      path: GET_SIEM_READINESS_RETENTION_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          // 1. Get all data streams
          const dataStreamsResponse: IndicesGetDataStreamResponse =
            await esClient.indices.getDataStream({ name: '*' });

          // 2. Get all ILM policies
          const ilmPoliciesResponse: IlmGetLifecycleResponse = await esClient.ilm.getLifecycle();

          // 3. Process each data stream and extract retention info
          const items: RetentionInfo[] = dataStreamsResponse.data_streams.map((dataStream) => {
            const { retentionType, retentionPeriod, policyName } = extractRetentionInfo(
              dataStream,
              ilmPoliciesResponse
            );
            const retentionDays = parseRetentionToDays(retentionPeriod);

            return {
              indexName: dataStream.name,
              retentionType,
              retentionPeriod,
              retentionDays,
              policyName,
              status: getRetentionStatus(retentionDays),
            };
          });

          const responseBody: RetentionResponse = { items };

          logger.info(`Retrieved retention data for ${items.length} data streams`);

          return response.ok({
            body: responseBody,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving SIEM readiness retention data: ${error.message}`);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
