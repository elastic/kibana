/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InferenceTaskType,
  MappingProperty,
  MappingSemanticTextProperty,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../data_stream';
import { SEARCH_EMBEDDING } from '../fields';

/** `unknown`: no indexed document has set the model yet, or the mapping could not be read. */
export type SearchEmbeddingModel =
  | { kind: 'dense'; inferenceId: string }
  | { kind: 'sparse' }
  | { kind: 'unknown' };

export type SearchEmbeddingModelResolver = () => Promise<SearchEmbeddingModel>;

// `model_settings` is written by ES once the first embedded document is indexed; it is not in the
// client's mapping types.
type SemanticTextMapping = MappingSemanticTextProperty & {
  model_settings?: { task_type?: InferenceTaskType };
};

const readModel = (property: MappingProperty | undefined): SearchEmbeddingModel => {
  if (property?.type !== 'semantic_text') {
    return { kind: 'unknown' };
  }
  const {
    inference_id: inferenceId,
    search_inference_id: searchInferenceId,
    model_settings,
  } = property as SemanticTextMapping;
  const queryInferenceId = searchInferenceId ?? inferenceId;
  switch (model_settings?.task_type) {
    case 'sparse_embedding':
      return { kind: 'sparse' };
    case 'text_embedding':
    case 'embedding':
      return queryInferenceId
        ? { kind: 'dense', inferenceId: queryInferenceId }
        : { kind: 'unknown' };
    default:
      return { kind: 'unknown' };
  }
};

/** Reads the `search_embedding` model from the backing-index mappings of the data stream. */
export const readSearchEmbeddingModel = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  dataStream: string = KNOWLEDGE_INDICATORS_DATA_STREAM
): Promise<SearchEmbeddingModel> => {
  try {
    const mappings = await esClient.indices.getMapping({ index: dataStream });
    for (const { mappings: indexMappings } of Object.values(mappings ?? {})) {
      const model = readModel(indexMappings?.properties?.[SEARCH_EMBEDDING]);
      if (model.kind !== 'unknown') {
        return model;
      }
    }
  } catch (error) {
    logger.warn(
      `Could not read the search_embedding mapping of [${dataStream}], ranking with MATCH: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return { kind: 'unknown' };
};
