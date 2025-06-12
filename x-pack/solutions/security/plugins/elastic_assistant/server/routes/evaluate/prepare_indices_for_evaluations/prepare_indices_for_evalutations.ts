/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexRequest, IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { Logger } from '@kbn/logging';

export class PrepareIndicesForEvaluations {
  readonly esClient: ElasticsearchClient;
  readonly indicesCreateRequests: IndicesCreateRequest[];
  readonly indexRequests: IndexRequest[];
  readonly logger: Logger;

  constructor({
    esClient,
    indicesCreateRequests = [],
    indexRequests = [],
    logger,
  }: {
    esClient: ElasticsearchClient;
    indicesCreateRequests?: IndicesCreateRequest[];
    indexRequests?: IndexRequest[];
    logger: Logger;
  }) {
    this.esClient = esClient;
    this.indicesCreateRequests = indicesCreateRequests;
    this.indexRequests = indexRequests;
    this.logger = logger;
  }

  async setup() {
    this.logger.debug('Creating assistant indices for evaluations');
    await Promise.all([
      ...this.indicesCreateRequests.map((index) => this.esClient.indices.create(index)),
      ...this.indexRequests.map((indexRequest) => this.esClient.index(indexRequest)),
    ]);
  }

  async cleanup() {
    this.logger.debug('Deleting assistant indices for evaluations');
    await Promise.all(
      this.indicesCreateRequests.map((index) =>
        this.esClient.indices.delete({ index: index.index })
      )
    );
  }
}
