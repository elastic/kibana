/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  IlmGetLifecycleResponse,
  IndicesGetDataStreamResponse,
  IndicesGetSettingsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { RetentionInfo, RetentionType } from '@kbn/siem-readiness-common';
import { parseRetentionToDays, getRetentionStatus } from '@kbn/siem-readiness-common';

// ── ILM helpers ───────────────────────────────────────────────────────────────

const getIlmRetentionPeriod = (policy: IlmGetLifecycleResponse[string]): string | null => {
  const deletePhase = policy?.policy?.phases?.delete;
  return deletePhase && 'min_age' in deletePhase ? (deletePhase.min_age as string) : null;
};

const extractDataStreamRetention = (
  dataStream: IndicesGetDataStreamResponse['data_streams'][0],
  ilmPolicies: IlmGetLifecycleResponse
): { retentionType: RetentionType; retentionPeriod: string | null; policyName: string | null } => {
  const lifecycle = dataStream.lifecycle as Record<string, unknown> | undefined;
  const dslEnabled = lifecycle && lifecycle.enabled !== false;
  const dslRetention =
    (lifecycle?.effective_retention as string | undefined) ??
    (lifecycle?.data_retention as string | undefined) ??
    null;
  const hasDslRetention = dslEnabled && dslRetention;

  const ilmPolicyName = dataStream.ilm_policy ?? null;
  const ilmPolicy = ilmPolicyName ? ilmPolicies[ilmPolicyName] : undefined;
  const ilmRetention = ilmPolicy ? getIlmRetentionPeriod(ilmPolicy) : null;
  const preferIlm = (lifecycle?.prefer_ilm as boolean | undefined) ?? true;
  const useIlm = ilmPolicyName && (preferIlm || !hasDslRetention);

  if (useIlm)
    return { retentionType: 'ilm', retentionPeriod: ilmRetention, policyName: ilmPolicyName };
  if (hasDslRetention)
    return { retentionType: 'dsl', retentionPeriod: dslRetention, policyName: null };
  return { retentionType: null, retentionPeriod: null, policyName: null };
};

const extractStandaloneIndices = (
  indexNames: string[],
  indexSettings: IndicesGetSettingsResponse,
  ilmPolicies: IlmGetLifecycleResponse
): RetentionInfo[] =>
  indexNames.map((indexName) => {
    const ilmPolicyName = indexSettings[indexName]?.settings?.index?.lifecycle?.name ?? null;
    const ilmRetention =
      ilmPolicyName && ilmPolicies[ilmPolicyName]
        ? getIlmRetentionPeriod(ilmPolicies[ilmPolicyName])
        : null;
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

// ── Public fetcher ────────────────────────────────────────────────────────────

/**
 * Fetches retention configuration for all data streams and (non-serverless) standalone indices.
 * Shared between the HTTP route handler and agent tool handlers.
 */
export const fetchRetention = async (
  esClient: ElasticsearchClient,
  isServerless: boolean
): Promise<RetentionInfo[]> => {
  const dataStreamsResponse: IndicesGetDataStreamResponse = await esClient.indices.getDataStream({
    name: '*',
  });

  if (isServerless) {
    return dataStreamsResponse.data_streams.map((dataStream) => {
      const { retentionType, retentionPeriod, policyName } = extractDataStreamRetention(
        dataStream,
        {}
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
  }

  const ilmPolicies: IlmGetLifecycleResponse = await esClient.ilm.getLifecycle();

  const dataStreamItems: RetentionInfo[] = dataStreamsResponse.data_streams.map((dataStream) => {
    const { retentionType, retentionPeriod, policyName } = extractDataStreamRetention(
      dataStream,
      ilmPolicies
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

  const resolveResponse = await esClient.indices.resolveIndex({ name: '*' });
  const standaloneNames = resolveResponse.indices.map((i) => i.name);

  let indexSettings: IndicesGetSettingsResponse = {};
  if (standaloneNames.length > 0) {
    indexSettings = await esClient.indices.getSettings({
      index: standaloneNames,
      filter_path: '*.settings.index.lifecycle.name',
    });
  }

  return [
    ...dataStreamItems,
    ...extractStandaloneIndices(standaloneNames, indexSettings, ilmPolicies),
  ];
};
