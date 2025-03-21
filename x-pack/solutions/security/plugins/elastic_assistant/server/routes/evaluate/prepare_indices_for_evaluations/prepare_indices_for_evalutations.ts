/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { Logger } from '@kbn/logging';

export class PrepareIndicesForEvaluations {
  private readonly esClient: ElasticsearchClient;
  private readonly indicesCreateRequests: IndicesCreateRequest[];
  private readonly logger: Logger;
  private isSetup: boolean = false;

  constructor({
    esClient,
    indicesCreateRequests,
    logger,
  }: {
    esClient: ElasticsearchClient;
    indicesCreateRequests: IndicesCreateRequest[];
    logger: Logger;
  }) {
    this.esClient = esClient;
    this.indicesCreateRequests = indicesCreateRequests;
    this.logger = logger;
  }

  async setup() {
    if (this.isSetup) {
      this.logger.debug('Indices already created, skipping setup');
      return;
    }
    this.logger.debug('Creating assistant indices for evaluations');
    await Promise.allSettled(
      this.indicesCreateRequests.map((index) => this.esClient.indices.create(index))
    );
    this.isSetup = true;
  }

  async cleanup() {
    if (!this.isSetup) {
      this.logger.debug('Indices not created, skipping cleanup');
      return;
    }
    this.logger.debug('Deleting assistant indices for evaluations');
    await Promise.allSettled(
      this.indicesCreateRequests.map((index) =>
        this.esClient.indices.delete({ index: index.index })
      )
    );
    this.isSetup = false;
  }
}
