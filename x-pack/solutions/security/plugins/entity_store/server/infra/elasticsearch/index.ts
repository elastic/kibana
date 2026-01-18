/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  IndicesPutIndexTemplateRequest,
  IndexName,
  Names,
  ClusterPutComponentTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';

type WithClient<T = {}> = { esClient: ElasticsearchClient } & T;
type WithIndex = WithClient<{ index: IndexName }>;
type WithName = WithClient<{ name: Names }>;

export const createIndex = ({ esClient, index }: WithIndex) => esClient.indices.create({ index });

export const deleteIndex = ({ esClient, index }: WithIndex) =>
  esClient.indices.delete({ index }, { ignore: [404] });

export const putComponentTemplate = ({
  esClient,
  request,
}: WithClient<{ request: ClusterPutComponentTemplateRequest }>) =>
  esClient.cluster.putComponentTemplate(request);

export const deleteComponentTemplate = ({ esClient, name }: WithName) =>
  esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });

export const createIndexTemplate = ({
  esClient,
  template,
}: WithClient<{ template: IndicesPutIndexTemplateRequest }>) =>
  esClient.indices.putIndexTemplate(template);

export const deleteIndexTemplate = ({ esClient, name }: WithName) =>
  esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] });
