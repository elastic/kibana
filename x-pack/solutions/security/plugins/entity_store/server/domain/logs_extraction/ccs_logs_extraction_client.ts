/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment';
import { unflattenObject } from '@kbn/object-utils';
import { get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import {
  EntityType,
  type ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';
import type { PaginationParams } from './logs_extraction_query_builder';
import {
  buildCcsLogsExtractionEsqlQuery,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  extractCcsPaginationParams,
} from './logs_extraction_query_builder';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { ingestEntities } from '../../infra/elasticsearch/ingest';
import { getUpdatesEntitiesDataStreamName } from '../asset_manager/updates_data_stream';

interface CcsExtractToUpdatesParams {
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
    private readonly namespace: string
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
      pagination = extractCcsPaginationParams(esqlResponse, docsLimit);

      if (esqlResponse.values.length > 0) {
        pages++;
        this.logger.debug(
          `CCS extraction ingesting ${esqlResponse.values.length} partial entities`
        );
        const momentToDate = moment.utc(toDateISO);
        let timestampIncrement = 0;
        const transformDocument = (doc: Record<string, unknown>) => {
          timestampIncrement++;
          const timestamp = momentToDate.add(timestampIncrement, 'ms').toISOString();
          return transformDocForCcsUpsert(type, doc, timestamp);
        };

        await ingestEntities({
          esClient: this.esClient,
          esqlResponse,
          targetIndex: getUpdatesEntitiesDataStreamName(this.namespace),
          logger: this.logger,
          abortController,
          fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
          transformDocument,
        });
      }
    } while (pagination);

    abortController?.signal.removeEventListener('abort', onAbort);

    return { count: totalCount, pages };
  }
}

/**
 * Transforms a (unflattened) partial entity into an updates-index document for CCS.
 */
function transformDocForCcsUpsert(
  type: EntityType,
  data: Partial<Entity>,
  timestamp: string
): Record<string, unknown> {
  const doc: Record<string, unknown> = unflattenObject({
    ...data,
    '@timestamp': timestamp,
  });

  if (type === EntityType.enum.generic) {
    return doc;
  }

  const entityDoc = get(doc, ['entity']);
  const typeDoc = get(doc, [type, 'entity']);
  const finalEntity = {
    ...(typeDoc || {}),
    ...(entityDoc || {}),
  };

  set(doc, [type, 'entity'], finalEntity);
  delete doc.entity;
  return doc;
}
