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
} from '@elastic/elasticsearch/lib/api/types';

export interface CreateOptions {
  throwIfExists?: boolean;
}

export const createIndex = async (
  esClient: EsClient,
  index: IndexName,
  options: CreateOptions = { throwIfExists: true }
) => {
  try {
    await esClient.indices.create({ index });
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
