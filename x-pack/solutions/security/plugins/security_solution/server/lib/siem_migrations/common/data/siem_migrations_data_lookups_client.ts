/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { AuthenticatedUser, IScopedClusterClient, Logger } from '@kbn/core/server';
import { retryTransientEsErrors } from '@kbn/index-adapter';
import { toValidIndexName } from '@kbn/utils';
import { LOOKUPS_INDEX_PREFIX } from '../../../../../common/siem_migrations/constants';

export type LookupData = object[];

export class SiemMigrationsDataLookupsClient {
  constructor(
    protected currentUser: AuthenticatedUser,
    protected esScopedClient: IScopedClusterClient,
    protected logger: Logger,
    protected spaceId: string
  ) {}

  async create(lookupName: string, data: LookupData): Promise<string> {
    const sanitizedLookupName = this.getSanitizedLookupName(lookupName);
    const indexName = `${LOOKUPS_INDEX_PREFIX}${this.spaceId}_${sanitizedLookupName}`;
    try {
      await this.executeEs(() =>
        this.esScopedClient.asCurrentUser.indices.create({
          index: indexName,
          settings: { index: { mode: 'lookup' } },
          mappings: { dynamic: 'runtime' },
        })
      );
    } catch (error) {
      if (error?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
        this.logger.error(`Error creating lookup index ${indexName} - ${error.message}`);
        throw error;
      }
    }

    if (data.length > 0) {
      await this.indexData(indexName, data);
    }
    return indexName;
  }

  async indexData(indexName: string, data: LookupData): Promise<void> {
    const body = data.flatMap((doc) => [
      { create: { _index: indexName, _id: this.generateDocumentHash(doc) } },
      doc,
    ]);

    try {
      await this.executeEs(() =>
        this.esScopedClient.asCurrentUser.bulk({ index: indexName, body })
      );
    } catch (error) {
      if (error?.statusCode !== 404) {
        this.logger.error(`Error indexing data for lookup index ${indexName} - ${error.message}`);
        throw error;
      }
    }
  }

  private async executeEs<T>(fn: () => Promise<T>): Promise<T> {
    return retryTransientEsErrors(fn, { logger: this.logger });
  }

  private generateDocumentHash(document: object): string {
    return createHash('sha256').update(JSON.stringify(document)).digest('hex'); // document need to be created in a deterministic way
  }

  private getSanitizedLookupName(lookupName: string): string {
    try {
      return toValidIndexName(lookupName);
    } catch (error) {
      const message = `Error creating lookup index from lookup: ${lookupName}. It does not conform to index naming rules. ${error.message}`;
      this.logger.error(message);
      throw new Error(message);
    }
  }
}
