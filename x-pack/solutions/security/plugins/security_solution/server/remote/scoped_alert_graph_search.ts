/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { remotable } from '@kbn/core-remote-common';
import type { EsSearchResponse } from '../workflows/step_types/build_alert_entity_graph_step/types';

/**
 * One invocation's scoped Elasticsearch client. Search stays on the coordinator and
 * returns parsed hits.
 */
@remotable()
export class ScopedAlertGraphSearch {
  readonly #client: ElasticsearchClient;

  constructor(client: ElasticsearchClient) {
    this.#client = client;
  }

  async search<TSource>(request: Record<string, unknown>): Promise<EsSearchResponse<TSource>> {
    const response = await this.#client.search<TSource>(request as never);
    return { hits: { hits: response.hits.hits as EsSearchResponse<TSource>['hits']['hits'] } };
  }
}
