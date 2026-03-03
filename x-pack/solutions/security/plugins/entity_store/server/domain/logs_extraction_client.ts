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
import { isCCSRemoteIndexName } from '@kbn/es-query';
import type {
  EntityType,
  ManagedEntityDefinition,
} from '../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../common/domain/definitions/registry';
import type { PaginationParams } from './logs_extraction/logs_extraction_query_builder';
import {
  buildLogsExtractionEsqlQuery,
  buildRemainingLogsCountQuery,
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
import type { CcsLogsExtractionClient } from './ccs_logs_extraction_client';

interface LogsExtractionOptions {
  specificWindow?: {
    fromDateISO: string;
    toDateISO: string;
  };
  abortController?: AbortController;
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

export interface LogsExtractionClientDependencies {
  logger: Logger;
  namespace: string;
  esClient: ElasticsearchClient;
  dataViewsService: DataViewsService;
  engineDescriptorClient: EngineDescriptorClient;
  ccsLogsExtractionClient: CcsLogsExtractionClient;
}

export class LogsExtractionClient {
  logger: Logger;
  namespace: string;
  esClient: ElasticsearchClient;
  dataViewsService: DataViewsService;
  engineDescriptorClient: EngineDescriptorClient;
  ccsLogsExtractionClient: CcsLogsExtractionClient;

  constructor({
    logger,
    namespace,
    esClient,
    dataViewsService,
    engineDescriptorClient,
    ccsLogsExtractionClient,
  }: LogsExtractionClientDependencies) {
    this.logger = logger;
    this.namespace = namespace;
    this.esClient = esClient;
    this.dataViewsService = dataViewsService;
    this.engineDescriptorClient = engineDescriptorClient;
    this.ccsLogsExtractionClient = ccsLogsExtractionClient;
  }

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
      const { count, pages, indexPatterns, lastSearchTimestamp, ccsError } =
        await this.runQueryAndIngestDocs({
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

      if (opts?.specificWindow) {
        return operationResult;
      }

      await this.engineDescriptorClient.update(
        type,
        {
          ...engineDescriptor,
          logExtractionState: {
            ...engineDescriptor.logExtractionState,

            // we went through all the pages,
            // therefore we can leave the lastExecutionTimestamp as the beginning of the next
            // window
            paginationTimestamp: undefined,
            paginationId: undefined,

            // Store last searched timestamp to start window from here
            lastExecutionTimestamp: lastSearchTimestamp || moment().utc().toISOString(),
          },
          error: ccsError ? { message: ccsError.message, action: 'extractLogs' } : undefined,

          // we need to do a full write to overwrite pagination
          // id and timestamp cursors with undefined
        },
        { mergeAttributes: false }
      );

      return operationResult;
    } catch (error) {
      return await this.handleError(error, type);
    }
  }

  public async getRemainingLogsCount(type: EntityType): Promise<number> {
    try {
      const engineDescriptor = await this.engineDescriptorClient.findOrThrow(type);
      const delayMs = parseDurationToMs(engineDescriptor.logExtractionState.delay);
      const indexPatterns = await this.getLocalIndexPatterns(
        engineDescriptor.logExtractionState.additionalIndexPatterns
      );
      const { fromDateISO } = this.getExtractionWindow(
        engineDescriptor.logExtractionState,
        delayMs
      );
      const toDateISO = moment().utc().toISOString();
      const recoveryId = engineDescriptor.logExtractionState.paginationId;
      const query = buildRemainingLogsCountQuery({
        indexPatterns,
        type,
        fromDateISO,
        toDateISO,
        recoveryId,
      });
      const esqlResponse = await executeEsqlQuery({
        esClient: this.esClient,
        query,
      });
      const countColumnIdx = esqlResponse.columns.findIndex((col) => col.name === 'document_count');
      if (countColumnIdx === -1 || esqlResponse.values.length === 0) {
        return 0;
      }
      const count = esqlResponse.values[0][countColumnIdx];

      return Number(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get remaining logs count for entity type "${type}": ${message}`);
      throw error;
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
  }): Promise<{
    count: number;
    pages: number;
    indexPatterns: string[];
    lastSearchTimestamp: string;
    ccsError?: Error;
  }> {
    const { docsLimit } = engineDescriptor.logExtractionState;
    const { localIndexPatterns, remoteIndexPatterns } = await this.getLocalAndRemoteIndexPatterns(
      engineDescriptor.logExtractionState.additionalIndexPatterns
    );
    const latestIndex = getLatestEntitiesIndexName(this.namespace);

    const { fromDateISO, toDateISO } =
      opts?.specificWindow ||
      this.getExtractionWindow(engineDescriptor.logExtractionState, delayMs);

    this.validateExtractionWindow(fromDateISO, toDateISO);

    const mainPromise = this.runMainExtractionLoop({
      engineDescriptor,
      opts,
      indexPatterns: localIndexPatterns,
      latestIndex,
      fromDateISO,
      toDateISO,
      docsLimit,
      entityDefinition,
    });

    if (remoteIndexPatterns.length > 0) {
      const ccsPromise = this.ccsLogsExtractionClient.extractToUpdates({
        type: engineDescriptor.type,
        remoteIndexPatterns,
        fromDateISO,
        toDateISO,
        docsLimit,
        entityDefinition,
        abortController: opts?.abortController,
      });

      const [mainResult, ccsResult] = await Promise.all([mainPromise, ccsPromise]);

      return {
        ...mainResult,
        indexPatterns: [...localIndexPatterns, ...remoteIndexPatterns],
        ccsError: ccsResult.error,
      };
    }

    return await mainPromise;
  }

  private async runMainExtractionLoop({
    engineDescriptor,
    opts,
    indexPatterns,
    latestIndex,
    fromDateISO,
    toDateISO,
    docsLimit,
    entityDefinition,
  }: {
    engineDescriptor: EngineDescriptor;
    opts?: LogsExtractionOptions;
    indexPatterns: string[];
    latestIndex: string;
    fromDateISO: string;
    toDateISO: string;
    docsLimit: number;
    entityDefinition: ManagedEntityDefinition;
  }) {
    let totalCount = 0;
    let pages = 0;
    let pagination: PaginationParams | undefined;

    const onAbort = () => this.logger.debug('Aborting execution mid logs extraction');
    opts?.abortController?.signal.addEventListener('abort', onAbort);

    let recoveryId: string | undefined = engineDescriptor.logExtractionState.paginationId;
    if (recoveryId) {
      this.logger.warn(
        `Recovering from corrupt state, using paginationTimestamp ${fromDateISO} and paginationId ${recoveryId} beginning of the window.`
      );
    }
    do {
      const query = buildLogsExtractionEsqlQuery({
        indexPatterns,
        latestIndex,
        entityDefinition,
        docsLimit,
        fromDateISO,
        toDateISO,
        pagination,
        recoveryId,
      });

      recoveryId = undefined;

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

      if (pagination) {
        await this.engineDescriptorClient.update(engineDescriptor.type, {
          logExtractionState: {
            ...engineDescriptor.logExtractionState,
            paginationTimestamp: pagination?.timestampCursor,
            paginationId: pagination?.idCursor,
          },
        });
      }
    } while (pagination);

    opts?.abortController?.signal.removeEventListener('abort', onAbort);

    return {
      count: totalCount,
      pages,
      indexPatterns,
      lastSearchTimestamp: toDateISO,
    };
  }

  private validateExtractionWindow(fromDateISO: string, toDateISO: string) {
    if (moment(fromDateISO).isAfter(moment(toDateISO))) {
      throw new Error(`From ${fromDateISO} date is after to ${toDateISO} date`);
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
    logsExtractionState: LogExtractionState,
    delayMs: number
  ): { fromDateISO: string; toDateISO: string } {
    const { paginationTimestamp } = logsExtractionState;

    const fromDateISO =
      paginationTimestamp ||
      this.getDelayedLastExecutionTimestamp(logsExtractionState, delayMs) ||
      this.getFromDateBasedOnLookback(logsExtractionState);

    const toDateISO = moment().utc().subtract(delayMs, 'millisecond').toISOString();

    return { fromDateISO, toDateISO };
  }

  private getDelayedLastExecutionTimestamp(
    { lastExecutionTimestamp }: LogExtractionState,
    durationMs: number
  ): string | undefined {
    if (!lastExecutionTimestamp) {
      return undefined;
    }

    return moment(lastExecutionTimestamp).subtract(durationMs, 'millisecond').toISOString();
  }

  private getFromDateBasedOnLookback({ lookbackPeriod }: LogExtractionState): string {
    const lookbackPeriodMs = parseDurationToMs(lookbackPeriod);
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

  /**
   * Returns local and remote (CCS) index patterns separately.
   * Main extraction uses local only (LOOKUP JOIN does not support CCS).
   * CCS extraction uses remote only.
   */
  public async getLocalAndRemoteIndexPatterns(
    additionalIndexPatterns: string[] = []
  ): Promise<{ localIndexPatterns: string[]; remoteIndexPatterns: string[] }> {
    const all = await this.getAllIndexPatternsIncludingRemote(additionalIndexPatterns);
    const alertsIndex = getAlertsIndexName(this.namespace);
    const withoutAlerts = all.filter((index) => index !== alertsIndex);
    const localIndexPatterns: string[] = [];
    const remoteIndexPatterns: string[] = [];

    withoutAlerts.forEach((index) => {
      if (isCCSRemoteIndexName(index)) {
        remoteIndexPatterns.push(index);
      } else {
        localIndexPatterns.push(index);
      }
    });

    return { localIndexPatterns, remoteIndexPatterns };
  }

  public async getLocalIndexPatterns(additionalIndexPatterns: string[] = []): Promise<string[]> {
    const { localIndexPatterns } = await this.getLocalAndRemoteIndexPatterns(
      additionalIndexPatterns
    );
    return localIndexPatterns;
  }

  /**
   * Builds the full list of index patterns (updates, additional, security data view)
   * including CCS remote indices, without filtering by alerts or CCS.
   */
  private async getAllIndexPatternsIncludingRemote(
    additionalIndexPatterns: string[] = []
  ): Promise<string[]> {
    const updatesDataStream = getUpdatesEntitiesDataStreamName(this.namespace);
    const indexPatterns: string[] = [updatesDataStream, ...additionalIndexPatterns];

    try {
      const secSolDataView = await this.dataViewsService.get(
        getSecuritySolutionDataViewName(this.namespace)
      );
      const secSolIndices = secSolDataView.getIndexPattern().split(',');
      indexPatterns.push(...secSolIndices);
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
