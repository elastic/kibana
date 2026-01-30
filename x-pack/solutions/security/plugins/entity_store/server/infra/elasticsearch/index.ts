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

export const createIndex = async (
  esClient: EsClient,
  index: IndexName,
  if_not_exists: boolean = false
) => {
  try {
    await esClient.indices.create({ index });
  } catch (error) {
    if (if_not_exists && error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
      return;
    }
    throw error;
  }
};

export const deleteIndex = async (esClient: EsClient, index: IndexName) => {
  await esClient.indices.delete({ index }, { ignore: [404] });
};

export const putComponentTemplate = async (
  esClient: EsClient,
  request: ClusterPutComponentTemplateRequest
) => {
  await esClient.cluster.putComponentTemplate(request);
};

export const deleteComponentTemplate = async (esClient: EsClient, name: Names) => {
  await esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });
};

export const putIndexTemplate = async (
  esClient: EsClient,
  template: IndicesPutIndexTemplateRequest
) => {
  await esClient.indices.putIndexTemplate(template);
};

export const deleteIndexTemplate = async (esClient: EsClient, name: Names) => {
  await esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] });
};

export const createDataStream = async (
  esClient: EsClient,
  name: IndexName,
  if_not_exists: boolean = false
) => {
  try {
    await esClient.indices.createDataStream({ name });
  } catch (error) {
    if (if_not_exists && error?.meta?.body?.error?.type === 'resource_already_exists_exception') {
      return;
    }
    throw error;
  }
};

export const deleteDataStream = async (
  esClient: EsClient,
  name: IndexName,
  if_not_exists: boolean = false
) => {
  await esClient.indices.deleteDataStream({ name });
};
