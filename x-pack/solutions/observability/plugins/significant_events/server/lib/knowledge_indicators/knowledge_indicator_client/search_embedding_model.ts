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

const sameModel = (a: SearchEmbeddingModel, b: SearchEmbeddingModel): boolean =>
  a.kind === b.kind &&
  (a.kind !== 'dense' || b.kind !== 'dense' || a.inferenceId === b.inferenceId);

/**
 * Reads the `search_embedding` model from the data stream's backing indices; `unknown` when they
 * disagree, since `KNN(TEXT_EMBEDDING(...))` embeds the query with one endpoint while `MATCH`
 * resolves inference per index.
 */
export const readSearchEmbeddingModel = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  dataStream: string = KNOWLEDGE_INDICATORS_DATA_STREAM
): Promise<SearchEmbeddingModel> => {
  try {
    const mappings = await esClient.indices.getMapping({ index: dataStream });
    let resolved: SearchEmbeddingModel = { kind: 'unknown' };
    for (const [index, { mappings: indexMappings }] of Object.entries(mappings ?? {})) {
      const model = readModel(indexMappings?.properties?.[SEARCH_EMBEDDING]);
      if (model.kind === 'unknown') {
        continue;
      }
      if (resolved.kind === 'unknown') {
        resolved = model;
        continue;
      }
      if (!sameModel(resolved, model)) {
        logger.warn(
          `Backing indices of [${dataStream}] disagree on the search_embedding model (${JSON.stringify(
            resolved
          )} vs ${JSON.stringify(model)} in [${index}]), ranking with MATCH`
        );
        return { kind: 'unknown' };
      }
    }
    return resolved;
  } catch (error) {
    logger.warn(
      `Could not read the search_embedding mapping of [${dataStream}], ranking with MATCH: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return { kind: 'unknown' };
};
