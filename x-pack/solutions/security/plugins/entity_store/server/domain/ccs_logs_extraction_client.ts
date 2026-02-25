/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import moment from 'moment';
import type {
  EntityType,
  ManagedEntityDefinition,
} from '../../common/domain/definitions/entity_schema';
import type { PaginationParams } from './logs_extraction/logs_extraction_query_builder';
import {
  buildCcsLogsExtractionEsqlQuery,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  extractPaginationParams,
} from './logs_extraction/logs_extraction_query_builder';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import type { Entity } from '../../common/domain/definitions/entity.gen';
import type { CRUDClient } from './crud_client';

export interface CcsExtractToUpdatesParams {
  type: EntityType;
  remoteIndexPatterns: string[];
  fromDateISO: string;
  toDateISO: string;
  docsLimit: number;
  entityDefinition: ManagedEntityDefinition;
  abortController?: AbortController;
}

export interface CcsExtractToUpdatesResult {
  count: number;
  pages: number;
  error?: Error;
}

/**
 * Converts columnar ESQL response to bulk objects for the CRUD client.
 * Keeps flat dot-notation keys (e.g. entity.id); the CRUD API would flatten them later anyway.
 */
function esqlResponseToBulkObjects(
  esqlResponse: ESQLSearchResponse,
  type: EntityType,
  fieldsToIgnore: string[]
): Array<{ type: EntityType; doc: Entity }> {
  const { columns, values } = esqlResponse;
  const objects: Array<{ type: EntityType; doc: Entity }> = [];

  for (const row of values) {
    const doc: Record<string, unknown> = {};
    for (let i = 0; i < row.length; i++) {
      const key = columns[i].name;
      if (fieldsToIgnore.includes(key) || row[i] === null) {
        continue;
      }
      doc[key] = row[i];
    }
    objects.push({ type, doc: doc as Entity });
  }
  return objects;
}

export class CcsLogsExtractionClient {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly crudClient: CRUDClient
  ) {}

  public async extractToUpdates(params: CcsExtractToUpdatesParams) {
    try {
      return await this.doExtractToUpdates(params);
    } catch (error) {
      const wrappedError = new Error(
        `Failed to extract to updates from CCS indices: ${error.message}`
      );
      this.logger.error(wrappedError);
      return { error: wrappedError };
    }
  }

  private async doExtractToUpdates({
    type,
    remoteIndexPatterns,
    fromDateISO,
    toDateISO,
    docsLimit,
    entityDefinition,
    abortController,
  }: CcsExtractToUpdatesParams): Promise<CcsExtractToUpdatesResult> {
    let totalCount = 0;
    let pages = 0;
    let pagination: PaginationParams | undefined;

    const onAbort = () => this.logger.debug('Aborting CCS logs extraction');
    abortController?.signal.addEventListener('abort', onAbort);

    do {
      const query = buildCcsLogsExtractionEsqlQuery({
        indexPatterns: remoteIndexPatterns,
        entityDefinition,
        fromDateISO,
        toDateISO,
        docsLimit,
        pagination,
      });

      this.logger.info(
        `Running CCS extraction from ${fromDateISO} to ${toDateISO} ${
          pagination
            ? `with pagination: ${pagination.timestampCursor} | ${pagination.idCursor}`
            : ''
        }`
      );

      const esqlResponse = await executeEsqlQuery({
        esClient: this.esClient,
        query,
        abortController,
      });

      totalCount += esqlResponse.values.length;
      pagination = extractPaginationParams(esqlResponse, docsLimit);
      if (esqlResponse.values.length > 0) {
        pages++;
      }

      if (esqlResponse.values.length > 0) {
        this.logger.debug(
          `CCS extraction ingesting ${esqlResponse.values.length} partial entities`
        );
        const bulkObjects = esqlResponseToBulkObjects(esqlResponse, type, [
          ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
        ]);

        await this.crudClient.upsertEntitiesBulk(bulkObjects, {
          force: true,
          // It's good to generate a random timestamp to avoid too many ts collisions
          // in the main extraction
          timestampGenerator: () => {
            const randomMs = Math.floor(Math.random() * 10000) + 1;
            return moment.utc(toDateISO).add(randomMs, 'ms').toISOString();
          },
        });
      }
    } while (pagination);

    abortController?.signal.removeEventListener('abort', onAbort);

    return { count: totalCount, pages };
  }
}
