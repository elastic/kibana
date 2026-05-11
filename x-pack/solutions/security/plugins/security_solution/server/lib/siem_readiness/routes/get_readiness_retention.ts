/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesGetDataStreamResponse,
  IndicesGetSettingsResponse,
  IndicesResolveIndexResponse,
  IlmGetLifecycleResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  RetentionInfo,
  RetentionType,
  RetentionStatus,
  RetentionResponse,
} from '@kbn/siem-readiness';
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
 * No retention configured = data kept forever = always compliant
 */
const getRetentionStatus = (retentionDays: number | null): RetentionStatus => {
  if (retentionDays === null) return 'healthy';
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
 * Respects prefer_ilm setting when both DSL and ILM are configured
 */
const extractRetentionInfo = (
  dataStream: IndicesGetDataStreamResponse['data_streams'][0],
  ilmPolicies: IlmGetLifecycleResponse
): { retentionType: RetentionType; retentionPeriod: string | null; policyName: string | null } => {
  const lifecycle = dataStream.lifecycle as Record<string, unknown> | undefined;
  const dslEnabled = lifecycle && lifecycle.enabled !== false;

  // DSL retention: effective_retention takes priority over data_retention
  const effectiveRetention = lifecycle?.effective_retention as string | undefined;
  const dataRetention = lifecycle?.data_retention as string | undefined;
  const dslRetention = effectiveRetention ?? dataRetention ?? null;
  const hasDslRetention = dslEnabled && dslRetention;

  // ILM info
  const ilmPolicyName = dataStream.ilm_policy ?? null;
  const ilmPolicy = ilmPolicyName ? ilmPolicies[ilmPolicyName] : undefined;
  const ilmRetention = ilmPolicy ? getIlmRetentionPeriod(ilmPolicy) : null;

  // prefer_ilm defaults to true
  const preferIlm = (lifecycle?.prefer_ilm as boolean | undefined) ?? true;

  // Determine winner: ILM wins if it exists and is preferred (or DSL doesn't exist)
  const useIlm = ilmPolicyName && (preferIlm || !hasDslRetention);

  if (useIlm) {
    return { retentionType: 'ilm', retentionPeriod: ilmRetention, policyName: ilmPolicyName };
  }
  if (hasDslRetention) {
    return { retentionType: 'dsl', retentionPeriod: dslRetention, policyName: null };
  }
  return { retentionType: null, retentionPeriod: null, policyName: null };
};

/**
 * Extract standalone indices (not part of data streams)
 * Includes all standalone indices regardless of retention configuration
 * Standalone indices can only have ILM retention, not DSL
 *
 * Note: We iterate over standaloneIndexNames (from resolveIndex) rather than
 * indexSettings because the settings query uses filter_path which only returns
 * indices that HAVE lifecycle.name set. This ensures indices without ILM
 * policies are still included in the results.
 */
const extractStandaloneIndices = (
  standaloneIndexNames: string[],
  indexSettings: IndicesGetSettingsResponse,
  ilmPolicies: IlmGetLifecycleResponse
): RetentionInfo[] => {
  return standaloneIndexNames.map((indexName) => {
    // Settings may be undefined if index has no ILM policy (due to filter_path)
    const settings = indexSettings[indexName];
    const ilmPolicyName = settings?.settings?.index?.lifecycle?.name ?? null;

    let ilmRetention: string | null = null;
    if (ilmPolicyName) {
      const ilmPolicy = ilmPolicies[ilmPolicyName];
      ilmRetention = ilmPolicy ? getIlmRetentionPeriod(ilmPolicy) : null;
    }

    const retentionDays = parseRetentionToDays(ilmRetention);
    return {
      indexName,
      isDataStream: false,
      retentionType: ilmPolicyName ? 'ilm' : null,
      retentionPeriod: ilmRetention,
      retentionDays,
      policyName: ilmPolicyName,
      status: getRetentionStatus(retentionDays),
    };
  });
};

export const getReadinessRetentionRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger'],
  isServerless: boolean
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

          // 1. Get all data streams (works in both serverless and non-serverless)
          const dataStreamsResponse: IndicesGetDataStreamResponse =
            await esClient.indices.getDataStream({ name: '*' });

          // In serverless, ILM is not available. Data streams use DSL (data stream lifecycle)
          // only, and there are no standalone indices — so skip ILM and resolveIndex calls.
          if (isServerless) {
            const dataStreamItems: RetentionInfo[] = dataStreamsResponse.data_streams.map(
              (dataStream) => {
                const { retentionType, retentionPeriod, policyName } = extractRetentionInfo(
                  dataStream,
                  {} // no ILM policies in serverless
                );
                const retentionDays = parseRetentionToDays(retentionPeriod);

                return {
                  indexName: dataStream.name,
                  isDataStream: true,
                  retentionType,
                  retentionPeriod,
                  retentionDays,
                  policyName,
                  status: getRetentionStatus(retentionDays),
                };
              }
            );

            const responseBody: RetentionResponse = { items: dataStreamItems };

            logger.info(
              `Retrieved retention data for ${dataStreamItems.length} data streams (serverless mode)`
            );

            return response.ok({ body: responseBody });
          }

          // 2. Get all ILM policies (non-serverless only)
          const ilmPoliciesResponse: IlmGetLifecycleResponse = await esClient.ilm.getLifecycle();

          // 3. Resolve index to get standalone indices (excludes backing indices)
          const resolveIndexResponse: IndicesResolveIndexResponse =
            await esClient.indices.resolveIndex({
              name: '*',
            });
          const standaloneIndexNames = resolveIndexResponse.indices.map((i) => i.name);

          // 4. Get settings for standalone indices only
          // Note: filter_path only returns indices WITH lifecycle.name set,
          // but we iterate over standaloneIndexNames to include all indices
          let indexSettingsResponse: IndicesGetSettingsResponse = {};
          if (standaloneIndexNames.length > 0) {
            indexSettingsResponse = await esClient.indices.getSettings({
              index: '*',
              filter_path: '*.settings.index.lifecycle.name',
            });
          }

          // 5. Process data streams and extract retention info
          const dataStreamItems: RetentionInfo[] = dataStreamsResponse.data_streams.map(
            (dataStream) => {
              const { retentionType, retentionPeriod, policyName } = extractRetentionInfo(
                dataStream,
                ilmPoliciesResponse
              );
              const retentionDays = parseRetentionToDays(retentionPeriod);

              return {
                indexName: dataStream.name,
                isDataStream: true,
                retentionType,
                retentionPeriod,
                retentionDays,
                policyName,
                status: getRetentionStatus(retentionDays),
              };
            }
          );

          // 6. Process standalone indices (not part of data streams)
          const standaloneItems = extractStandaloneIndices(
            standaloneIndexNames,
            indexSettingsResponse,
            ilmPoliciesResponse
          );

          // 7. Combine both sources
          const items: RetentionInfo[] = [...dataStreamItems, ...standaloneItems];

          const responseBody: RetentionResponse = { items };

          logger.info(
            `Retrieved retention data for ${dataStreamItems.length} data streams and ${standaloneItems.length} standalone indices`
          );

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
