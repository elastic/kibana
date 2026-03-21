/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProcessedAlertRecord, IncrementalADState } from './types';

const INDEX_NAME = '.attack-discovery-incremental-state';

export class StateTracker {
  private cache = new Map<string, boolean>();

  constructor(
    private esClient: ElasticsearchClient,
    private sessionId: string
  ) {}

  async markProcessed(alertIds: string[], roundNumber: number): Promise<void> {
    const now = new Date().toISOString();

    const operations = alertIds.flatMap(alertId => [
      { index: { _id: `${this.sessionId}:${alertId}` } },
      {
        alertId,
        sessionId: this.sessionId,
        processedAt: now,
        roundNumber,
      } satisfies ProcessedAlertRecord,
    ]);

    await this.esClient.bulk({
      index: INDEX_NAME,
      operations,
      refresh: 'wait_for',
    });

    // Update cache
    alertIds.forEach(id => this.cache.set(id, true));
  }

  async isProcessed(alertId: string): Promise<boolean> {
    // Check cache first
    if (this.cache.has(alertId)) {
      return this.cache.get(alertId)!;
    }

    // Check ES
    try {
      const result = await this.esClient.get({
        index: INDEX_NAME,
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
    // Batch check in ES for efficiency
    const alertIds = alerts.map(a => a.id);

    const result = await this.esClient.search({
      index: INDEX_NAME,
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
      result.hits.hits.map(hit => (hit._source as any).alertId)
    );

    // Update cache
    processedIds.forEach(id => this.cache.set(id, true));

    return alerts.filter(alert => !processedIds.has(alert.id));
  }

  async getState(): Promise<IncrementalADState> {
    const result = await this.esClient.search({
      index: INDEX_NAME,
      query: { term: { sessionId: this.sessionId } },
      size: 0,
      aggs: {
        totalProcessed: { cardinality: { field: 'alertId' } },
        maxRound: { max: { field: 'roundNumber' } },
        lastProcessed: { max: { field: 'processedAt' } },
      },
    });

    const aggs = result.aggregations as any;

    return {
      sessionId: this.sessionId,
      mode: 'delta',  // Will be set by caller
      totalAlertsProcessed: aggs?.totalProcessed?.value ?? 0,
      currentRound: aggs?.maxRound?.value ?? 0,
      lastProcessedAt: aggs?.lastProcessed?.value_as_string ?? new Date().toISOString(),
    };
  }
}
