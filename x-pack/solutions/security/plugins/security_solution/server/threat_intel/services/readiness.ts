/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest, Logger, ElasticsearchClient } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import {
  ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  HUNT_USABLE_FILTER,
  INDICATOR_ELIGIBLE_FILTER,
  THREAT_REPORTS_GET_MAPPING_PARAMS,
  getReportEmbeddingEndpointIds,
  isReportsIndexManaged,
} from '@kbn/alertzero-common';
import {
  DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID,
  THREAT_REPORTS_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
  type ReadinessResponse,
  type ReadinessStatus,
} from '../../../common/threat_intel';
import { HIDDEN_INDEX_SEARCH_OPTIONS } from '../lib/es_options';
import { buildSpaceFilterTerms } from '../lib/space_filter';

export interface ReadinessDeps {
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
  getBootstrapReady: () => Promise<void>;
  request: KibanaRequest;
  getInference: () => InferenceServerStart | undefined;
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
}

const maxAggToIso = (
  agg: { value?: number | null; value_as_string?: string } | undefined
): string | null => {
  if (agg?.value_as_string) return agg.value_as_string;
  if (typeof agg?.value === 'number') return new Date(agg.value).toISOString();
  return null;
};

type ReportsIndexState = 'exists' | 'missing' | 'check_failed';

/**
 * `indices.exists` resolves a missing index to `false` (404), so a throw here is
 * a real infrastructure failure (timeout, authz, 5xx), not a missing index.
 * Reporting those as `reports_index_missing` would send an operator to recreate
 * an index that may be fine, so they surface as a distinct reason code.
 */
const checkReportsIndexState = async (
  esClient: ElasticsearchClient
): Promise<ReportsIndexState> => {
  try {
    return (await esClient.indices.exists({
      index: THREAT_REPORTS_INDEX,
      expand_wildcards: ['open', 'hidden'],
    }))
      ? 'exists'
      : 'missing';
  } catch {
    return 'check_failed';
  }
};

/**
 * One `indices.getMapping` round trip feeds both the managed-index and the embedding
 * checks. `getMapping`, not `getFieldMapping`: the latter is unavailable (410) on
 * serverless. A failed read yields `undefined`; each check decides what that means.
 */
const fetchReportsMapping = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<IndicesGetMappingResponse | undefined> => {
  try {
    return await esClient.indices.getMapping({ ...THREAT_REPORTS_GET_MAPPING_PARAMS });
  } catch (err) {
    logger.debug(
      `Readiness reports mapping read failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return undefined;
  }
};

/**
 * Anything other than a readable, non-strict mapping (including a failed read) is
 * treated as managed so unrelated errors do not masquerade as a template-free index.
 */
const checkReportsIndexManaged = (mappings: IndicesGetMappingResponse | undefined): boolean =>
  mappings === undefined || isReportsIndexManaged(mappings);

/**
 * Verifies report-content semantic_text embedding endpoints (cluster default).
 * Missing or unreachable endpoints yield `embedding_endpoint_unavailable`.
 */
const checkEmbeddingEndpoints = async (
  esClient: ElasticsearchClient,
  mappings: IndicesGetMappingResponse | undefined,
  logger: Logger
): Promise<boolean> => {
  if (!mappings) return false;
  const endpointIds = getReportEmbeddingEndpointIds(mappings);
  if (!endpointIds) return false;
  try {
    for (const endpointId of endpointIds) {
      await esClient.inference.get({ inference_id: endpointId });
    }
    return true;
  } catch (err) {
    logger.debug(`Readiness embedding endpoint check failed: ${(err as Error).message}`);
    return false;
  }
};

const checkDiamondEmbeddingEndpoint = async (esClient: ElasticsearchClient): Promise<boolean> => {
  try {
    await esClient.inference.get({ inference_id: DIAMOND_SUMMARY_EMBEDDING_INFERENCE_ID });
    return true;
  } catch {
    return false;
  }
};

const featureHasEndpoint = async ({
  searchInferenceEndpoints,
  featureId,
  request,
  logger,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  featureId: string;
  request: KibanaRequest;
  logger: Logger;
}): Promise<boolean> => {
  if (!searchInferenceEndpoints) return false;
  try {
    // An unregistered tier can still resolve the global connector catalog.
    if (!searchInferenceEndpoints.features.get(featureId)) return false;
    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      featureId,
      request
    );
    return endpoints.some((endpoint) => Boolean(endpoint.connectorId));
  } catch (err) {
    logger.debug(
      `Readiness feature='${featureId}' connector probe failed: ${(err as Error).message}`
    );
    return false;
  }
};

const loadUsableStats = async ({
  esClient,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
}): Promise<{
  usableReportCount: number;
  indicatorEligibleReportCount: number;
  lastIngestAt: string | null;
  lastEnrichAt: string | null;
}> => {
  const response = await esClient.search({
    index: THREAT_REPORTS_INDEX_PATTERN,
    ...HIDDEN_INDEX_SEARCH_OPTIONS,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [buildSpaceFilterTerms(spaceId), HUNT_USABLE_FILTER],
      },
    },
    aggs: {
      last_ingest: { max: { field: 'lineage.ingested_at' } },
      last_enrich: { max: { field: 'lineage.extracted_at' } },
      indicator_eligible: { filter: INDICATOR_ELIGIBLE_FILTER },
    },
  });

  const total = response.hits.total;
  const usableReportCount =
    typeof total === 'number' ? total : typeof total?.value === 'number' ? total.value : 0;

  const indicatorEligibleAgg = response.aggregations?.indicator_eligible as
    | { doc_count?: number }
    | undefined;

  return {
    usableReportCount,
    indicatorEligibleReportCount: indicatorEligibleAgg?.doc_count ?? 0,
    lastIngestAt: maxAggToIso(
      response.aggregations?.last_ingest as
        | { value?: number | null; value_as_string?: string }
        | undefined
    ),
    lastEnrichAt: maxAggToIso(
      response.aggregations?.last_enrich as
        | { value?: number | null; value_as_string?: string }
        | undefined
    ),
  };
};

/**
 * Reports whether the threat-intel supply pipeline is ready for hunt consumers.
 * Does not gate on bootstrap completion — it reports bootstrap status instead.
 */
export const getThreatIntelReadiness = async ({
  esClient,
  spaceId,
  logger,
  getBootstrapReady,
  request,
  getInference,
  getSearchInferenceEndpoints,
}: ReadinessDeps): Promise<ReadinessResponse> => {
  const reasonCodes: string[] = [];
  const optional: string[] = [];

  let bootstrapComplete = true;
  try {
    await getBootstrapReady();
  } catch {
    bootstrapComplete = false;
    reasonCodes.push('bootstrap_incomplete');
  }

  const reportsIndexState = await checkReportsIndexState(esClient);
  if (reportsIndexState === 'missing') {
    reasonCodes.push('reports_index_missing');
  } else if (reportsIndexState === 'check_failed') {
    reasonCodes.push('reports_index_check_failed');
  }

  const reportsMapping =
    reportsIndexState === 'exists' ? await fetchReportsMapping(esClient, logger) : undefined;
  const reportsIndexUnmanaged =
    reportsIndexState === 'exists' && !checkReportsIndexManaged(reportsMapping);
  if (reportsIndexUnmanaged) {
    reasonCodes.push('reports_index_unmanaged');
  }

  if (!bootstrapComplete || reportsIndexState !== 'exists' || reportsIndexUnmanaged) {
    return {
      status: 'blocked',
      reasonCodes,
      usableReportCount: 0,
      indicatorEligibleReportCount: 0,
      lastIngestAt: null,
      lastEnrichAt: null,
      ...(optional.length > 0 ? { optional } : {}),
    };
  }

  const inference = getInference();
  const searchInferenceEndpoints = getSearchInferenceEndpoints();

  const embeddingOk = await checkEmbeddingEndpoints(esClient, reportsMapping, logger);
  if (!embeddingOk) {
    reasonCodes.push('embedding_endpoint_unavailable');
  }

  const enrichOk =
    Boolean(inference) &&
    (await featureHasEndpoint({
      searchInferenceEndpoints,
      featureId: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID,
      request,
      logger,
    }));
  if (!enrichOk) {
    // Missing inference or searchInferenceEndpoints plugins also land here.
    reasonCodes.push('no_enrich_connector');
  }

  const diamondEmbeddingOk = await checkDiamondEmbeddingEndpoint(esClient);
  const diamondConnectorOk =
    Boolean(inference) &&
    (await featureHasEndpoint({
      searchInferenceEndpoints,
      featureId: ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
      request,
      logger,
    }));
  if (!diamondEmbeddingOk || !diamondConnectorOk) {
    optional.push('diamond_unavailable');
  }

  let usableReportCount = 0;
  let indicatorEligibleReportCount = 0;
  let lastIngestAt: string | null = null;
  let lastEnrichAt: string | null = null;
  let statsAvailable = true;
  try {
    const stats = await loadUsableStats({ esClient, spaceId });
    usableReportCount = stats.usableReportCount;
    indicatorEligibleReportCount = stats.indicatorEligibleReportCount;
    lastIngestAt = stats.lastIngestAt;
    lastEnrichAt = stats.lastEnrichAt;
  } catch (err) {
    statsAvailable = false;
    logger.warn(`Readiness usable-report stats failed: ${(err as Error).message}`);
  }

  if (!statsAvailable) {
    // A failed stats query is not the same as an empty catalog: reporting
    // `no_usable_reports` here would tell a consumer "nothing ingested yet" when
    // the truth is the count could not be read. Surface it distinctly instead.
    reasonCodes.push('usable_stats_unavailable');
  } else if (usableReportCount === 0) {
    reasonCodes.push('no_usable_reports');
  }

  const status: ReadinessStatus = reasonCodes.length > 0 ? 'degraded' : 'ready';

  return {
    status,
    reasonCodes,
    usableReportCount,
    indicatorEligibleReportCount,
    lastIngestAt,
    lastEnrichAt,
    ...(optional.length > 0 ? { optional } : {}),
  };
};
