/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';

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
