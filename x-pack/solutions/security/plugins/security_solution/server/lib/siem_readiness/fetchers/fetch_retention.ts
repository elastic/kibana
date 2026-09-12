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
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  RetentionInfo,
  RetentionType,
  RetentionStatus,
  RetentionResponse,
} from '@kbn/siem-readiness';

// FedRAMP Threshold: 12 months (365 days)
const RETENTION_THRESHOLD_DAYS = 365;

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

const getRetentionStatus = (retentionDays: number | null): RetentionStatus => {
  if (retentionDays === null) return 'healthy';
  return retentionDays >= RETENTION_THRESHOLD_DAYS ? 'healthy' : 'non-compliant';
};

const getIlmRetentionPeriod = (policy: IlmGetLifecycleResponse[string]): string | null => {
  const deletePhase = policy?.policy?.phases?.delete;
  if (deletePhase && 'min_age' in deletePhase) {
    return deletePhase.min_age as string;
  }
  return null;
};

const extractRetentionInfo = (
  dataStream: IndicesGetDataStreamResponse['data_streams'][0],
  ilmPolicies: IlmGetLifecycleResponse
): { retentionType: RetentionType; retentionPeriod: string | null; policyName: string | null } => {
  const lifecycle = dataStream.lifecycle as Record<string, unknown> | undefined;
  const dslEnabled = lifecycle && lifecycle.enabled !== false;

  const effectiveRetention = lifecycle?.effective_retention as string | undefined;
  const dataRetention = lifecycle?.data_retention as string | undefined;
  const dslRetention = effectiveRetention ?? dataRetention ?? null;
  const hasDslRetention = dslEnabled && dslRetention;

  const ilmPolicyName = dataStream.ilm_policy ?? null;
  const ilmPolicy = ilmPolicyName ? ilmPolicies[ilmPolicyName] : undefined;
  const ilmRetention = ilmPolicy ? getIlmRetentionPeriod(ilmPolicy) : null;

  const preferIlm = (lifecycle?.prefer_ilm as boolean | undefined) ?? true;

  const useIlm = ilmPolicyName && (preferIlm || !hasDslRetention);

  if (useIlm) {
    return { retentionType: 'ilm', retentionPeriod: ilmRetention, policyName: ilmPolicyName };
  }
  if (hasDslRetention) {
    return { retentionType: 'dsl', retentionPeriod: dslRetention, policyName: null };
  }
  return { retentionType: null, retentionPeriod: null, policyName: null };
};

const extractStandaloneIndices = (
  standaloneIndexNames: string[],
  indexSettings: IndicesGetSettingsResponse,
  ilmPolicies: IlmGetLifecycleResponse
): RetentionInfo[] => {
  return standaloneIndexNames.map((indexName) => {
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

export const fetchRetention = async ({
  esClient,
  isServerless,
  logger,
}: {
  esClient: ElasticsearchClient;
  isServerless: boolean;
  logger: Logger;
}): Promise<RetentionResponse> => {
  const dataStreamsResponse: IndicesGetDataStreamResponse = await esClient.indices.getDataStream({
    name: '*',
  });

  if (isServerless) {
    const dataStreamItems: RetentionInfo[] = dataStreamsResponse.data_streams.map((dataStream) => {
      const { retentionType, retentionPeriod, policyName } = extractRetentionInfo(dataStream, {});
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
    });

    logger.info(
      `Retrieved retention data for ${dataStreamItems.length} data streams (serverless mode)`
    );

    return { items: dataStreamItems };
  }

  const ilmPoliciesResponse: IlmGetLifecycleResponse = await esClient.ilm.getLifecycle();

  const resolveIndexResponse: IndicesResolveIndexResponse = await esClient.indices.resolveIndex({
    name: '*',
  });
  const standaloneIndexNames = resolveIndexResponse.indices.map((i) => i.name);

  let indexSettingsResponse: IndicesGetSettingsResponse = {};
  if (standaloneIndexNames.length > 0) {
    // Use index: '*' instead of the explicit list to avoid "URI too long" errors
    indexSettingsResponse = await esClient.indices.getSettings({
      index: '*',
      filter_path: '*.settings.index.lifecycle.name',
    });
  }

  const dataStreamItems: RetentionInfo[] = dataStreamsResponse.data_streams.map((dataStream) => {
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
  });

  const standaloneItems = extractStandaloneIndices(
    standaloneIndexNames,
    indexSettingsResponse,
    ilmPoliciesResponse
  );

  const items: RetentionInfo[] = [...dataStreamItems, ...standaloneItems];

  logger.info(
    `Retrieved retention data for ${dataStreamItems.length} data streams and ${standaloneItems.length} standalone indices`
  );

  return { items };
};
