/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { IndexRequest, IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { PrepareIndicesForEvaluations } from '../../prepare_indices_for_evalutations';
import { indicesCreateRequests } from './indices_create_requests';
import { indexRequests } from './index_requests';

const ENVIRONMENTS = ['production', 'staging', 'development'];
export class PrepareIndicesForAssistantGraphEvaluations extends PrepareIndicesForEvaluations {
  constructor({ esClient, logger }: { esClient: ElasticsearchClient; logger: Logger }) {
    super({
      esClient,
      indicesCreateRequests: PrepareIndicesForAssistantGraphEvaluations.hydrateRequestTemplate(
        Object.values(indicesCreateRequests)
      ),
      indexRequests: PrepareIndicesForAssistantGraphEvaluations.hydrateRequestTemplate(
        Object.values(indexRequests)
      ),
      logger,
    });
  }

  static hydrateRequestTemplate<T extends IndicesCreateRequest | IndexRequest>(requests: T[]): T[] {
    return requests
      .map((request) => {
        return ENVIRONMENTS.map((environment) => {
          return {
            ...request,
            index: request.index
              .replace(/\[environment\]/g, environment)
              .replace(/\[date\]/g, this.getRandomDate()),
          } as T;
        });
      })
      .flat();
  }

  async cleanup() {
    this.logger.debug('Deleting assistant indices for evaluations');

    const requests = [...Object.values(indicesCreateRequests), ...Object.values(indexRequests)];
    const indexPatternsToDelete = Object.values(requests).map((index) =>
      index.index.replace(/\[environment\]/g, '*').replace(/\[date\]/g, '*')
    );

    const indicesResolveIndexResponses = await Promise.all(
      indexPatternsToDelete.map(async (indexPattern) =>
        this.esClient.indices.resolveIndex({
          name: indexPattern,
          expand_wildcards: 'open',
        })
      )
    );

    const indicesToDelete = indicesResolveIndexResponses
      .flatMap((response) => response.indices)
      .map((index) => index.name);

    const dataStreamsToDelete = indicesResolveIndexResponses
      .flatMap((response) => response.data_streams)
      .map((dataStream) => dataStream.name);

    if (indicesToDelete.length > 0) {
      this.logger.info('Deleting indices');
      await this.esClient.indices.delete({ index: indicesToDelete });
    }

    if (dataStreamsToDelete.length > 0) {
      this.logger.info('Deleting data streams');
      await this.esClient.indices.deleteDataStream({ name: dataStreamsToDelete });
    }
  }

  static getRandomDate() {
    const year = Math.floor(Math.random() * (2050 - 2000 + 1)) + 2000;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }
}
