/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { retryTransientEsErrors } from '@kbn/index-adapter';

export interface AttackDiscoveryLookupDocument {
  alert_id: string;
  attack_ids: string[];
}

export type AttackDiscoveryLookupData = AttackDiscoveryLookupDocument[];

const LOOKUP_INDEX_PREFIX = 'lookup-attack-';

export class AttackDiscoveryLookupDataClient {
  private indexInitialized: boolean = false;
  private readonly indexName: string;

  constructor(
    protected esScopedClient: IScopedClusterClient,
    protected logger: Logger,
    protected spaceId: string
  ) {
    this.indexName = `${LOOKUP_INDEX_PREFIX}${this.spaceId}`;
  }

  /**
   * Ensures the lookup index exists, creating it if necessary.
   * This method is idempotent and handles the case where the index already exists.
   */
  async ensureIndexExists(): Promise<void> {
    if (this.indexInitialized) {
      return;
    }

    try {
      await this.executeEs(() =>
        this.esScopedClient.asCurrentUser.indices.create({
          index: this.indexName,
          settings: { index: { mode: 'lookup' } },
          mappings: { dynamic: 'runtime' },
        })
      );
      this.indexInitialized = true;
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        this.logger.error(`Error creating lookup index ${this.indexName} - ${error.message}`);
        throw error;
      }
      // Index already exists, mark as initialized
      this.indexInitialized = true;
    }
  }

  /**
   * Indexes multiple documents into the lookup index.
   * Ensures the index exists before indexing.
   */
  async indexData(data: AttackDiscoveryLookupData): Promise<void> {
    await this.ensureIndexExists();

    if (data.length === 0) {
      return;
    }

    const body = data.flatMap((doc) => [
      { create: { _index: this.indexName, _id: this.generateDocumentHash(doc) } },
      doc,
    ]);

    try {
      await this.executeEs(() =>
        this.esScopedClient.asCurrentUser.bulk({ index: this.indexName, body })
      );
    } catch (error) {
      if (error?.statusCode !== 404) {
        this.logger.error(
          `Error indexing data for lookup index ${this.indexName} - ${error.message}`
        );
        throw error;
      }
    }
  }

  /**
   * Creates or updates a single document in the lookup index.
   * This is a convenience method that wraps indexData for a single document.
   */
  async createOrUpdate(alertId: string, attackIds: string[]): Promise<void> {
    const document: AttackDiscoveryLookupDocument = {
      alert_id: alertId,
      attack_ids: attackIds,
    };
    await this.indexData([document]);
  }

  /**
   * Gets the index name for this client.
   */
  getIndexName(): string {
    return this.indexName;
  }

  private async executeEs<T>(fn: () => Promise<T>): Promise<T> {
    return retryTransientEsErrors(fn, { logger: this.logger });
  }

  private generateDocumentHash(document: object): string {
    return sha256.create().update(JSON.stringify(document)).hex(); // document need to be created in a deterministic way
  }
}
