/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ENTITY_BASE_PREFIX, ENTITY_SCHEMA_VERSION_V2, ENTITY_LATEST } from '../constants';

/**
 * Returns the ingest pipeline ID for the latest entity index (namespace-scoped).
 * Used as default_pipeline on the latest index to expand flat dotted fields into nested objects.
 */
export const getLatestIndexIngestPipelineId = (namespace: string): string =>
  `.${ENTITY_BASE_PREFIX}.${ENTITY_SCHEMA_VERSION_V2}.${ENTITY_LATEST}.security_${namespace}_ingest_pipeline`;

const getPipelineBody = (id: string) => ({
  id,
  description:
    'Expands flat dotted field names into nested objects for the entity store latest index.',
  _meta: {
    managed_by: 'security_context_core_analysis',
    managed: true,
  },
  processors: [{ dot_expander: { field: '*' } }],
});

export const installLatestIndexIngestPipeline = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  const id = getLatestIndexIngestPipelineId(namespace);
  const pipeline = getPipelineBody(id);
  await esClient.ingest.putPipeline(pipeline);
  logger.debug(`Installed latest index ingest pipeline: ${id}`);
};

export const deleteLatestIndexIngestPipeline = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  const id = getLatestIndexIngestPipelineId(namespace);
  await esClient.ingest.deletePipeline({ id }, { ignore: [404] });
  logger.debug(`Deleted latest index ingest pipeline: ${id}`);
};
