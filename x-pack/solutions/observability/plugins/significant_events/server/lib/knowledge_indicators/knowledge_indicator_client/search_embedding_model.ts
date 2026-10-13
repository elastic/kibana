/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../data_stream';
import { SEARCH_EMBEDDING } from '../fields';

/** `unknown`: no indexed document has set the model yet, or the mapping could not be read. */
export type SearchEmbeddingModel =
  | { kind: 'dense'; inferenceId: string }
  | { kind: 'sparse' }
  | { kind: 'unknown' };

export type SearchEmbeddingModelResolver = () => Promise<SearchEmbeddingModel>;

interface SemanticTextMapping {
  type?: string;
  inference_id?: string;
  model_settings?: { task_type?: string };
}

const readModel = (mapping: SemanticTextMapping | undefined): SearchEmbeddingModel => {
  const taskType = mapping?.model_settings?.task_type;
  if (taskType === 'sparse_embedding') {
    return { kind: 'sparse' };
  }
  if ((taskType === 'text_embedding' || taskType === 'embedding') && mapping?.inference_id) {
    return { kind: 'dense', inferenceId: mapping.inference_id };
  }
  return { kind: 'unknown' };
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
      const field = indexMappings?.properties?.[SEARCH_EMBEDDING] as
        | SemanticTextMapping
        | undefined;
      const model = readModel(field);
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
