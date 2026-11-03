/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  THREAT_REPORTS_GET_MAPPING_PARAMS,
  THREAT_REPORTS_INDEX,
  getReportEmbeddingEndpointIds,
  isReportsIndexManaged,
} from '@kbn/alertzero-common';
import type { ThreatIntelSupplyHardGate } from './types';

type ReportsIndexState = 'exists' | 'missing' | 'check_failed';

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
      `Hunt supply hard-gate mapping read failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return undefined;
  }
};

/**
 * Verifies report-content semantic_text embedding endpoints. Missing or
 * unreachable endpoints yield `embedding_endpoint_unavailable`.
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
    logger.debug(
      `Hunt supply hard-gate embedding check failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return false;
  }
};

/**
 * Hard-gate for enabling Continuous Threat Hunt: readiness `blocked` (reports
 * index missing / unreadable / created without its template) or
 * `embedding_endpoint_unavailable`. Does not gate on GenAI enrich connector or
 * usable-report count.
 */
export const evaluateHuntSupplyHardGate = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<ThreatIntelSupplyHardGate> => {
  const reasonCodes: string[] = [];

  const reportsIndexState = await checkReportsIndexState(esClient);
  if (reportsIndexState === 'missing') {
    reasonCodes.push('reports_index_missing');
  } else if (reportsIndexState === 'check_failed') {
    reasonCodes.push('reports_index_check_failed');
  }

  if (reportsIndexState !== 'exists') {
    return { ok: false, reasonCodes };
  }

  const reportsMapping = await fetchReportsMapping(esClient, logger);
  // A failed read counts as managed so unrelated errors do not masquerade as a template-free index.
  if (reportsMapping && !isReportsIndexManaged(reportsMapping)) {
    reasonCodes.push('reports_index_unmanaged');
    return { ok: false, reasonCodes };
  }

  const embeddingOk = await checkEmbeddingEndpoints(esClient, reportsMapping, logger);
  if (!embeddingOk) {
    reasonCodes.push('embedding_endpoint_unavailable');
  }

  return { ok: reasonCodes.length === 0, reasonCodes };
};
