/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';

/** Index holding threat-intel reports. Shared by security_solution and AlertZero. */
export const THREAT_REPORTS_INDEX = '.kibana-threat-reports' as const;

/** Report-content fields (under `content.`) backed by a `semantic_text` embedding endpoint. */
export const REQUIRED_REPORT_SEMANTIC_FIELDS = ['title', 'body_text'] as const;

/**
 * `indices.getMapping` params for the reports index. Readiness and the hunt hard gate
 * fetch the mapping once with these and derive every check from that one response.
 */
export const THREAT_REPORTS_GET_MAPPING_PARAMS: {
  index: typeof THREAT_REPORTS_INDEX;
  expand_wildcards: Array<'open' | 'hidden'>;
} = {
  index: THREAT_REPORTS_INDEX,
  expand_wildcards: ['open', 'hidden'],
};

interface MappingNode {
  type?: string;
  inference_id?: string;
  properties?: Record<string, MappingNode>;
}

/**
 * Resolves the `inference_id` of a dotted `semantic_text` field (for example
 * `content.title`) by walking `properties` in an `indices.getMapping` response.
 *
 * `indices.getFieldMapping` is not available on serverless Elasticsearch (it
 * answers 410 `api_not_available_exception`), while `indices.getMapping` is.
 * Elasticsearch persists the resolved `inference_id` in the index mapping, so
 * this returns the effective endpoint even when the template left it to the
 * cluster default.
 *
 * Returns `undefined` when the field is missing, is not `semantic_text`, or has
 * no `inference_id`.
 */
export const getSemanticTextInferenceId = (
  mappings: IndicesGetMappingResponse,
  index: string,
  fieldPath: string
): string | undefined => {
  let node: MappingNode | undefined = mappings[index]?.mappings as MappingNode | undefined;
  for (const segment of fieldPath.split('.')) {
    node = node?.properties?.[segment];
    if (!node) return undefined;
  }
  return node?.type === 'semantic_text' && node.inference_id ? node.inference_id : undefined;
};

/**
 * The reports index template sets `dynamic: strict`; an index auto-created by a write
 * before the template existed does not.
 */
export const isReportsIndexManaged = (mappings: IndicesGetMappingResponse): boolean =>
  Object.values(mappings).every((entry) => entry.mappings?.dynamic === 'strict');

/**
 * Resolves the distinct `inference_id`s behind {@link REQUIRED_REPORT_SEMANTIC_FIELDS}.
 * Returns `undefined` when any required field does not resolve to a `semantic_text`
 * endpoint.
 */
export const getReportEmbeddingEndpointIds = (
  mappings: IndicesGetMappingResponse
): string[] | undefined => {
  const endpointIds = new Set<string>();
  for (const field of REQUIRED_REPORT_SEMANTIC_FIELDS) {
    const inferenceId = getSemanticTextInferenceId(
      mappings,
      THREAT_REPORTS_INDEX,
      `content.${field}`
    );
    if (!inferenceId) return undefined;
    endpointIds.add(inferenceId);
  }
  return [...endpointIds];
};
