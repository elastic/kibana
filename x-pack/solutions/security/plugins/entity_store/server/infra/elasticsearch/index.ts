/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient as EsClient } from '@kbn/core/server';
import type {
  IndicesPutIndexTemplateRequest,
  IndexName,
  Names,
  ClusterPutComponentTemplateRequest,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

export { reindex } from './reindex';
export type { ReindexOptions } from './reindex';
export { updateByQueryWithScript } from './ingest';
export type { UpdateByQueryWithScriptOptions } from './ingest';
export { waitForTaskToComplete } from './wait_for_task';
export type { WaitForTaskOptions } from './wait_for_task';

export interface CreateOptions {
  throwIfExists?: boolean;
  aliases?: Record<string, object>;
}

export const createIndex = async (
  esClient: EsClient,
  index: IndexName,
  options: CreateOptions = { throwIfExists: true }
) => {
  try {
    await esClient.indices.create({ index, aliases: options.aliases });
  } catch (error) {
    if (
      !options.throwIfExists &&
      error?.meta?.body?.error?.type === 'resource_already_exists_exception'
    ) {
      return;
    }
    throw error;
  }
};

export const deleteIndex = (esClient: EsClient, index: IndexName) =>
  esClient.indices.delete({ index }, { ignore: [404] });

export const putComponentTemplate = async (
  esClient: EsClient,
  request: ClusterPutComponentTemplateRequest
) => {
  await esClient.cluster.putComponentTemplate(request);
};

export const deleteComponentTemplate = (esClient: EsClient, name: Names) =>
  esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });

export const putIndexTemplate = (esClient: EsClient, template: IndicesPutIndexTemplateRequest) =>
  esClient.indices.putIndexTemplate(template);

// Applies mappings in place to an index or data stream (its write index and future
// backing indices). Adding fields is allowed; changing an existing field's type throws.
export const putDataStreamMapping = async (
  esClient: EsClient,
  name: IndexName,
  mappings: MappingTypeMapping
): Promise<void> => {
  await esClient.indices.putMapping({ index: name, ...mappings });
};

// Rolls a data stream over to a fresh backing index, which inherits the current
// index/component template mappings. Used as a fallback when an in-place mapping
// update conflicts with types already present on the existing write index.
export const rolloverDataStream = async (esClient: EsClient, name: IndexName): Promise<void> => {
  await esClient.indices.rollover({ alias: name });
};

export const deleteIndexTemplate = (esClient: EsClient, name: Names) =>
  esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] });

export const createDataStream = async (
  esClient: EsClient,
  name: IndexName,
  options: CreateOptions = { throwIfExists: true }
) => {
  try {
    await esClient.indices.createDataStream({ name });
  } catch (error) {
    if (
      !options.throwIfExists &&
      error?.meta?.body?.error?.type === 'resource_already_exists_exception'
    ) {
      return;
    }
    throw error;
  }
};

export const deleteDataStream = (esClient: EsClient, name: IndexName) =>
  esClient.indices.deleteDataStream({ name }, { ignore: [404] });
