/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ProcessedAlertRecord, IncrementalADState } from './types';

const ILM_POLICY_NAME = '.kibana-elastic-ai-assistant-incremental-ad-state-ilm';
const INDEX_PREFIX = '.kibana-elastic-ai-assistant-incremental-ad-state';

const getDefaultIndexName = (spaceId: string): string =>
  `${INDEX_PREFIX}-${spaceId}`;

export class StateTracker {
  private cache = new Map<string, boolean>();
  private indexEnsured = false;
  private readonly indexName: string;

  constructor(
    private esClient: ElasticsearchClient,
    private sessionId: string,
    private logger?: Logger,
    indexName?: string
  ) {
    this.indexName = indexName ?? getDefaultIndexName('default');
  }

  /**
   * Creates a StateTracker targeting a specific Kibana space.
   */
  static forSpace(
    esClient: ElasticsearchClient,
    sessionId: string,
    spaceId: string,
    logger?: Logger
  ): StateTracker {
    return new StateTracker(esClient, sessionId, logger, getDefaultIndexName(spaceId));
  }

  /**
   * Lazily ensures the backing index and ILM policy exist.
   * Idempotent — subsequent calls are no-ops after the first successful creation.
   */
  private async ensureIndex(): Promise<void> {
    if (this.indexEnsured) {
      return;
    }

    try {
      // Ensure ILM policy exists (30-day retention)
      const policyExists = await this.esClient.ilm
        .getLifecycle({ name: ILM_POLICY_NAME })
        .then(() => true)
        .catch(() => false);

      if (!policyExists) {
        await this.esClient.ilm.putLifecycle({
          name: ILM_POLICY_NAME,
          body: {
            policy: {
              phases: {
                hot: {
                  actions: {},
                },
                delete: {
                  min_age: '30d',
                  actions: {
                    delete: {},
                  },
                },
              },
            },
          },
        });
      }

      // Ensure the index exists
      const indexExists = await this.esClient.indices.exists({ index: this.indexName });

      if (!indexExists) {
        await this.esClient.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 1,
              'index.lifecycle.name': ILM_POLICY_NAME,
              auto_expand_replicas: '0-1',
            },
            mappings: {
              properties: {
                alertId: { type: 'keyword' },
                sessionId: { type: 'keyword' },
                processedAt: { type: 'date' },
                roundNumber: { type: 'integer' },
              },
            },
          },
        });
      }

      this.indexEnsured = true;
    } catch (e) {
      // If the index was created concurrently (resource_already_exists_exception), that is fine
      if (e?.meta?.body?.error?.type === 'resource_already_exists_exception') {
        this.indexEnsured = true;
        return;
      }
      this.logger?.error(`Failed to ensure incremental AD state index: ${e.message}`);
      throw e;
    }
  }

  async markProcessed(alertIds: string[], roundNumber: number): Promise<void> {
    await this.ensureIndex();

    const now = new Date().toISOString();

    const operations = alertIds.flatMap((alertId) => [
      { index: { _id: `${this.sessionId}:${alertId}` } },
      {
        alertId,
        sessionId: this.sessionId,
        processedAt: now,
        roundNumber,
      } satisfies ProcessedAlertRecord,
    ]);

    await this.esClient.bulk({
      index: this.indexName,
      operations,
      refresh: 'wait_for',
    });

    // Update cache
    alertIds.forEach((id) => this.cache.set(id, true));
  }

  async isProcessed(alertId: string): Promise<boolean> {
    // Check cache first
    if (this.cache.has(alertId)) {
      return this.cache.get(alertId)!;
    }

    await this.ensureIndex();

    // Check ES
    try {
      const result = await this.esClient.get({
        index: this.indexName,
        id: `${this.sessionId}:${alertId}`,
      });
      const found = result.found;
      this.cache.set(alertId, found);
      return found;
    } catch (e) {
      this.cache.set(alertId, false);
      return false;
    }
  }

  async filterUnprocessed<T extends { id: string }>(alerts: T[]): Promise<T[]> {
    await this.ensureIndex();

    // Batch check in ES for efficiency
    const alertIds = alerts.map((a) => a.id);

    const result = await this.esClient.search({
      index: this.indexName,
      query: {
        bool: {
          must: [
            { term: { sessionId: this.sessionId } },
            { terms: { alertId: alertIds } },
          ],
        },
      },
      _source: ['alertId'],
      size: alertIds.length,
    });

    const processedIds = new Set(
      result.hits.hits.map((hit) => (hit._source as { alertId: string }).alertId)
    );

    // Update cache
    processedIds.forEach((id) => this.cache.set(id, true));

    return alerts.filter((alert) => !processedIds.has(alert.id));
  }

  async getState(): Promise<IncrementalADState> {
    await this.ensureIndex();

    const result = await this.esClient.search({
      index: this.indexName,
      query: { term: { sessionId: this.sessionId } },
      size: 0,
      aggs: {
        totalProcessed: { cardinality: { field: 'alertId' } },
        maxRound: { max: { field: 'roundNumber' } },
        lastProcessed: { max: { field: 'processedAt' } },
      },
    });

    const aggs = result.aggregations as Record<
      string,
      { value?: number; value_as_string?: string }
    >;

    return {
      sessionId: this.sessionId,
      mode: 'delta', // Will be set by caller
      totalAlertsProcessed: aggs?.totalProcessed?.value ?? 0,
      currentRound: aggs?.maxRound?.value ?? 0,
      lastProcessedAt: aggs?.lastProcessed?.value_as_string ?? new Date().toISOString(),
    };
  }
}
