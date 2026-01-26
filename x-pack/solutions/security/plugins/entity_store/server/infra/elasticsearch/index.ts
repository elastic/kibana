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

export const createIndex = (esClient: EsClient, index: IndexName) =>
  esClient.indices.create({ index });

export const deleteIndex = (esClient: EsClient, index: IndexName) =>
  esClient.indices.delete({ index }, { ignore: [404] });

export const putComponentTemplate = (
  esClient: EsClient,
  request: ClusterPutComponentTemplateRequest
) => esClient.cluster.putComponentTemplate(request);

export const deleteComponentTemplate = (esClient: EsClient, name: Names) =>
  esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });

export const putIndexTemplate = (esClient: EsClient, template: IndicesPutIndexTemplateRequest) =>
  esClient.indices.putIndexTemplate(template);

export const deleteIndexTemplate = (esClient: EsClient, name: Names) =>
  esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] });
