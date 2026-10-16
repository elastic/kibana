/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { toBoom } from './es_errors';

// Parallel `PUT /_query/view` can hit ConcurrentModificationException; a short retry is enough.
const RETRYABLE_STATUS_CODES = [409, 429, 503];
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

const isRetryable = (error: unknown): boolean =>
  error instanceof errors.ElasticsearchClientError &&
  isRetryableEsClientError(error, RETRYABLE_STATUS_CODES);

const withEsRetry = async <T>(operation: () => Promise<T>, baseDelayMs: number): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= RETRY_ATTEMPTS || !isRetryable(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
};

interface IEsqlViewsClientDeps {
  /** Scoped to the current user. Reads go through it so Elasticsearch enforces the user's view privileges. */
  userEsClient: ElasticsearchClient;
  /**
   * Runs as `kibana_system`. Writes go through it so end users need no write privileges on the views and cannot
   * change them by calling Elasticsearch directly, which would let a view drift from its saved object. The caller
   * must already have authorized the request, see the `manage` route privilege.
   */
  internalEsClient: ElasticsearchClient;
  retryBaseDelayMs?: number;
}

export class EsqlViewsClient {
  private readonly userEsClient: ElasticsearchClient;
  private readonly internalEsClient: ElasticsearchClient;
  private readonly retryBaseDelayMs: number;

  constructor({
    userEsClient,
    internalEsClient,
    retryBaseDelayMs = RETRY_BASE_DELAY_MS,
  }: IEsqlViewsClientDeps) {
    this.userEsClient = userEsClient;
    this.internalEsClient = internalEsClient;
    this.retryBaseDelayMs = retryBaseDelayMs;
  }

  async putView(name: string, query: string): Promise<void> {
    try {
      await withEsRetry(
        () => this.internalEsClient.esql.putView({ name, query }),
        this.retryBaseDelayMs
      );
    } catch (error) {
      throw toBoom(error, `Failed to write ES|QL view "${name}"`);
    }
  }

  /**
   * A missing view surfaces either as a 404 (whose ignored body has no `views`) or as a 200 with
   * an empty `views` list depending on the ES version; both resolve to `undefined`.
   */
  async getView(name: string): Promise<estypes.EsqlESQLView | undefined> {
    try {
      const { views } = await this.userEsClient.esql.getView({ name }, { ignore: [404] });
      return Array.isArray(views) ? views.find((view) => view.name === name) : undefined;
    } catch (error) {
      throw toBoom(error, `Failed to read ES|QL view "${name}"`);
    }
  }

  async deleteView(name: string): Promise<void> {
    try {
      await withEsRetry(
        () => this.internalEsClient.esql.deleteView({ name }, { ignore: [404] }),
        this.retryBaseDelayMs
      );
    } catch (error) {
      throw toBoom(error, `Failed to delete ES|QL view "${name}"`);
    }
  }
}
