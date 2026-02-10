/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import moment from 'moment';
import { SavedObjectsErrorHelpers, type ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type {
  EntityType,
  ManagedEntityDefinition,
} from '../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../common/domain/definitions/registry';
import type { PaginationParams } from './logs_extraction/logs_extraction_query_builder';
import {
  buildLogsExtractionEsqlQuery,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  extractPaginationParams,
  HASHED_ID_FIELD,
} from './logs_extraction/logs_extraction_query_builder';
import { getLatestEntitiesIndexName } from './assets/latest_index';
import { getUpdatesEntitiesDataStreamName } from './assets/updates_data_stream';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { ingestEntities } from '../infra/elasticsearch/ingest';
import {
  getAlertsIndexName,
  getSecuritySolutionDataViewName,
} from './assets/external_indices_contants';
import type {
  EngineDescriptor,
  EngineDescriptorClient,
  LogExtractionState,
} from './definitions/saved_objects';
import { ENGINE_STATUS } from './constants';
import { parseDurationToMs } from '../infra/time';

interface LogsExtractionOptions {
  specificWindow?: {
    fromDateISO: string;
    toDateISO: string;
  };
  abortController?: AbortController;
  countOnly?: boolean;
}

interface ExtractedLogsSummarySuccess {
  success: true;
  count: number;
  pages: number;
  scannedIndices: string[];
}

interface ExtractedLogsSummaryError {
  success: false;
  error: Error;
}

type ExtractedLogsSummary = ExtractedLogsSummarySuccess | ExtractedLogsSummaryError;

export class LogsExtractionClient {
  constructor(
    private logger: Logger,
    private namespace: string,
    private esClient: ElasticsearchClient,
    private dataViewsService: DataViewsService,
    private engineDescriptorClient: EngineDescriptorClient
  ) {}

  public async extractLogs(
    type: EntityType,
    opts?: LogsExtractionOptions
  ): Promise<ExtractedLogsSummary> {
    this.logger.debug('starting entity extraction');

    try {
      const engineDescriptor = await this.engineDescriptorClient.findOrThrow(type);

      if (engineDescriptor.status !== ENGINE_STATUS.STARTED) {
        return {
          success: false,
          error: new Error(
            `Entity store is not started for type ${type}, status: ${engineDescriptor.status}`
          ),
        };
      }

      const delayMs = parseDurationToMs(engineDescriptor.logExtractionState.delay);
      const entityDefinition = getEntityDefinition(type, this.namespace);
      const { count, pages, indexPatterns } = await this.runQueryAndIngestDocs({
        engineDescriptor,
        opts,
        delayMs,
        entityDefinition,
      });

      const operationResult = {
        success: true as const,
        count,
        pages,
        scannedIndices: indexPatterns,
      };

      if (opts?.specificWindow || opts?.countOnly) {
        return operationResult;
      }

      await this.engineDescriptorClient.update(type, {
        logExtractionState: {
          ...engineDescriptor.logExtractionState,

          // we went through all the pages,
          // therefore we can leave the lastExecutionTimestamp as the beginning of the next
          // window
          paginationTimestamp: undefined,

          lastExecutionTimestamp: moment().utc().toISOString(),
        },
      });

      return operationResult;
    } catch (error) {
      return await this.handleError(error, type);
    }
  }

  private async runQueryAndIngestDocs({
    engineDescriptor,
    opts,
    delayMs,
    entityDefinition,
  }: {
    engineDescriptor: EngineDescriptor;
    opts?: LogsExtractionOptions;
    delayMs: number;
    entityDefinition: ManagedEntityDefinition;
  }) {
    const { docsLimit } = engineDescriptor.logExtractionState;
    const indexPatterns = await this.getIndexPatterns(
      engineDescriptor.type,
      engineDescriptor.logExtractionState.additionalIndexPattern
    );
    const latestIndex = getLatestEntitiesIndexName(this.namespace);

    const { fromDateISO, toDateISO } =
      opts?.specificWindow ||
      this.getExtractionWindow(engineDescriptor.logExtractionState, delayMs);

    // This is a sanity check to ensure the extraction window is valid
    // Ideally we have this validation on the API only and we trust
    // that our internal logic is correct. For the time being, we validate it here
    // too, so we have a few runs and understand it.
    this.validateExtractionWindow(fromDateISO, toDateISO);

    let totalCount = 0;
    let pages = 0;
    let pagination: PaginationParams | undefined;

    // On abort we save the pagination to the last seen timestamp cursor
    opts?.abortController?.signal.addEventListener('abort', async () => {
      await this.engineDescriptorClient.update(engineDescriptor.type, {
        logExtractionState: {
          ...engineDescriptor.logExtractionState,
          paginationTimestamp: pagination?.timestampCursor,
          lastExecutionTimestamp: moment().utc().toISOString(),
        },
      });
    });

    do {
      const query = buildLogsExtractionEsqlQuery({
        indexPatterns,
        latestIndex,
        entityDefinition,
        docsLimit,
        fromDateISO,
        toDateISO,
        pagination,
      });

      this.logger.debug(
        `Running query to extract logs from ${fromDateISO} to ${toDateISO} ${
          pagination
            ? `with pagination: ${pagination.timestampCursor} | ${pagination.idCursor}`
            : ''
        }`
      );

      const esqlResponse = await executeEsqlQuery({
        esClient: this.esClient,
        query,
        abortController: opts?.abortController,
      });

      totalCount += esqlResponse.values.length;
      pagination = extractPaginationParams(esqlResponse, docsLimit);
      if (esqlResponse.values.length > 0) {
        pages++;
      }

      if (!opts?.countOnly) {
        this.logger.debug(`Found ${esqlResponse.values.length}, ingesting them`);
        await ingestEntities({
          esClient: this.esClient,
          esqlResponse,
          esIdField: HASHED_ID_FIELD,
          fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
          targetIndex: latestIndex,
          logger: this.logger,
          abortController: opts?.abortController,
        });
      }

      // should never be larger than limit, just being safe
    } while (pagination);

    return {
      count: totalCount,
      pages,
      indexPatterns,
    };
  }

  private validateExtractionWindow(fromDateISO: string, toDateISO: string) {
    if (moment(fromDateISO).isAfter(moment(toDateISO))) {
      throw new Error('From date is after to date');
    }
  }

  // Window scenarios:
  // 1. Fresh entity store, no paginationTimestamp or lastExecutionTimestamp:
  //    fromDate = now - lookbackPeriod | toDate = now - delay
  // 2. PaginationTimestamp is present:
  //    fromDate = paginationTimestamp | toDate = now - delay
  // 3. LastExecutionTimestamp is present:
  //    fromDate = lastExecutionTimestamp | toDate = now - delay
  private getExtractionWindow(
    logExtractionState: LogExtractionState,
    delayMs: number
  ): { fromDateISO: string; toDateISO: string } {
    const fromDateISO =
      logExtractionState.paginationTimestamp ||
      logExtractionState.lastExecutionTimestamp ||
      this.getFromDate(logExtractionState);

    const toDateISO = moment().utc().subtract(delayMs, 'millisecond').toISOString();

    return { fromDateISO, toDateISO };
  }

  private getFromDate(logExtractionState: LogExtractionState): string {
    const lookbackPeriodMs = parseDurationToMs(logExtractionState.lookbackPeriod);
    return moment().utc().subtract(lookbackPeriodMs, 'millisecond').toISOString();
  }

  private async handleError(error: any, type: EntityType): Promise<ExtractedLogsSummary> {
    this.logger.error(error);

    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return { success: false, error: new Error(`Entity store is not started for type ${type}`) };
    }

    await this.engineDescriptorClient.update(type, {
      error: { message: error.message, action: 'extractLogs' },
    });
    return { success: false, error };
  }

  private async getIndexPatterns(type: EntityType, additionalIndexPatterns: string) {
    const updatesDataStream = getUpdatesEntitiesDataStreamName(this.namespace);
    const cleanAdditionalIndicesPatterns = additionalIndexPatterns
      .split(',')
      .filter((index) => index !== '');
    const indexPatterns: string[] = [updatesDataStream, ...cleanAdditionalIndicesPatterns];

    try {
      const secSolDataView = await this.dataViewsService.get(
        getSecuritySolutionDataViewName(this.namespace)
      );

      const alertsIndex = getAlertsIndexName(this.namespace);
      const cleanIndices = secSolDataView
        .getIndexPattern()
        .split(',')
        .filter((index) => index !== alertsIndex);
      indexPatterns.push(...cleanIndices);
    } catch (error) {
      this.logger.warn(
        'Problems finding security solution data view indices, defaulting to logs-*'
      );
      this.logger.warn(error);
      indexPatterns.push('logs-*');
    }

    return indexPatterns;
  }
}
