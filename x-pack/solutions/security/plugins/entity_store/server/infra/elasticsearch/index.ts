/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient as EsClient, Logger } from '@kbn/core/server';
import type {
  IndicesPutIndexTemplateRequest,
  IndexName,
  Names,
  ClusterPutComponentTemplateRequest,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { retryTransientEsErrors } from '@kbn/index-adapter';

export { reindex } from './reindex';
export type { ReindexOptions } from './reindex';
export { updateByQueryWithScript } from './ingest';
export type { UpdateByQueryWithScriptOptions } from './ingest';
export { waitForTaskToComplete } from './wait_for_task';
export type { WaitForTaskOptions } from './wait_for_task';

export interface CreateOptions {
  throwIfExists?: boolean;
  aliases?: Record<string, object>;
  logger?: Logger;
}

// A boot-time index/ILM install storm (~200 plugins) can saturate ES's
// master cluster-state-update queue for several seconds, during which a
// freshly created system index 503s with NoShardAvailableActionException
// before its shard-started task is processed. Callers with a boot-time
// dependency on these installs pass a logger to opt into exponential
// backoff (2s, 4s, 8s...) on transient errors (503/408/429/504/connection/
// timeout) via the shared @kbn/index-adapter helper; callers without a
// logger keep today's fail-fast behavior unchanged.
const withRetry = <T>(esCall: () => Promise<T>, logger?: Logger): Promise<T> =>
  logger ? retryTransientEsErrors(esCall, { logger }) : esCall();

export const createIndex = async (
  esClient: EsClient,
  index: IndexName,
  options: CreateOptions = { throwIfExists: true }
) => {
  try {
    await withRetry(
      () => esClient.indices.create({ index, aliases: options.aliases }),
      options.logger
    );
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

export const deleteIndex = (esClient: EsClient, index: IndexName, logger?: Logger) =>
  withRetry(() => esClient.indices.delete({ index }, { ignore: [404] }), logger);

export const putComponentTemplate = async (
  esClient: EsClient,
  request: ClusterPutComponentTemplateRequest,
  logger?: Logger
) => {
  await withRetry(() => esClient.cluster.putComponentTemplate(request), logger);
};

export const deleteComponentTemplate = (esClient: EsClient, name: Names, logger?: Logger) =>
  withRetry(() => esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] }), logger);

export const putIndexTemplate = (
  esClient: EsClient,
  template: IndicesPutIndexTemplateRequest,
  logger?: Logger
) => withRetry(() => esClient.indices.putIndexTemplate(template), logger);

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

export const deleteIndexTemplate = (esClient: EsClient, name: Names, logger?: Logger) =>
  withRetry(() => esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] }), logger);

export const createDataStream = async (
  esClient: EsClient,
  name: IndexName,
  options: CreateOptions = { throwIfExists: true }
) => {
  try {
    await withRetry(() => esClient.indices.createDataStream({ name }), options.logger);
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

export const deleteDataStream = (esClient: EsClient, name: IndexName, logger?: Logger) =>
  withRetry(() => esClient.indices.deleteDataStream({ name }, { ignore: [404] }), logger);
