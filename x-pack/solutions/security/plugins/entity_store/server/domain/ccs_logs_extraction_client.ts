/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
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
import { executeEsqlQuery, esqlResponseToBulkObjects } from '../infra/elasticsearch/esql';
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

export class CcsLogsExtractionClient {
  constructor(
    private readonly logger: Logger,
    private readonly esClient: ElasticsearchClient,
    private readonly crudClient: CRUDClient
  ) {}

  public async extractToUpdates(
    params: CcsExtractToUpdatesParams
  ): Promise<CcsExtractToUpdatesResult> {
    try {
      return await this.doExtractToUpdates(params);
    } catch (error) {
      const wrappedError = new Error(
        `Failed to extract to updates from CCS indices: ${error.message}`
      );
      this.logger.error(wrappedError);
      return { count: 0, pages: 0, error: wrappedError };
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
        this.logger.debug(
          `CCS extraction ingesting ${esqlResponse.values.length} partial entities`
        );
        const bulkObjects = esqlResponseToBulkObjects(esqlResponse, type, [
          ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
        ]);

        const momentToDate = moment.utc(toDateISO);
        let inc = 0;
        await this.crudClient.upsertEntitiesBulk({
          objects: bulkObjects,
          force: true,
          // It's good to generate a sparse timestamp to avoid too many ts collisions
          // in the main extraction
          timestampGenerator: () => {
            inc++;
            return momentToDate.add(inc, 'ms').toISOString();
          },
        });
      }
    } while (pagination);

    abortController?.signal.removeEventListener('abort', onAbort);

    return { count: totalCount, pages };
  }
}
