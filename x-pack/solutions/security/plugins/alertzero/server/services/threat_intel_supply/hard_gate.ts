/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ThreatIntelSupplyHardGate } from './types';

/** Matches security_solution threat reports index; AlertZero cannot import that plugin. */
const THREAT_REPORTS_INDEX = '.kibana-threat-reports';

const REQUIRED_REPORT_SEMANTIC_FIELDS = ['title', 'body_text'] as const;

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
 * Verifies report-content semantic_text embedding endpoints. Missing or
 * unreachable endpoints yield `embedding_endpoint_unavailable`.
 */
const checkEmbeddingEndpoints = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<boolean> => {
  try {
    const mappings = await esClient.indices.getFieldMapping({
      index: THREAT_REPORTS_INDEX,
      fields: REQUIRED_REPORT_SEMANTIC_FIELDS.map((field) => `content.${field}`),
      include_defaults: true,
    });
    const fieldMappings = mappings[THREAT_REPORTS_INDEX]?.mappings;
    const endpointIds = new Set<string>();

    for (const field of REQUIRED_REPORT_SEMANTIC_FIELDS) {
      const fullName = `content.${field}`;
      const fieldMapping = fieldMappings?.[fullName];
      const mapping = fieldMapping?.mapping[field] ?? fieldMapping?.mapping[fullName];
      if (mapping?.type !== 'semantic_text' || !mapping.inference_id) {
        return false;
      }
      endpointIds.add(mapping.inference_id);
    }

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
 * index missing / unreadable) or `embedding_endpoint_unavailable`. Does not
 * gate on GenAI enrich connector or usable-report count.
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

  const embeddingOk = await checkEmbeddingEndpoints(esClient, logger);
  if (!embeddingOk) {
    reasonCodes.push('embedding_endpoint_unavailable');
  }

  return { ok: reasonCodes.length === 0, reasonCodes };
};
