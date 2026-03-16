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
} from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import {
  type PaginationParams,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
} from './query_builder_commons';
import {
  buildLogsExtractionEsqlQuery,
  buildRemainingLogsCountQuery,
  extractMainPaginationParams,
  HASHED_ID_FIELD,
} from './logs_extraction_query_builder';
import { getLatestEntitiesIndexName } from '../asset_manager/latest_index';
import { getUpdatesEntitiesDataStreamName } from '../asset_manager/updates_data_stream';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { ingestEntities } from '../../infra/elasticsearch/ingest';
import {
  getAlertsIndexName,
  getSecuritySolutionDataViewName,
} from '../asset_manager/external_indices_contants';
import {
  type LogExtractionConfig,
  LogExtractionConfig as LogExtractionConfigSchema,
} from '../saved_objects';
import {
  type EngineDescriptorClient,
  type EngineLogExtractionState,
  type EntityStoreGlobalStateClient,
} from '../saved_objects';
import { ENGINE_STATUS } from '../constants';
import { parseDurationToMs } from '../../infra/time';
import type { CcsLogsExtractionClient } from './ccs_logs_extraction_client';
import { EntityStoreNotRunningError } from '../errors';
import type { LogExtractionUpdateParams } from '../../routes/constants';

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
  globalStateClient: EntityStoreGlobalStateClient;
  ccsLogsExtractionClient: CcsLogsExtractionClient;
}

export class LogsExtractionClient {
  logger: Logger;
  namespace: string;
  esClient: ElasticsearchClient;
  dataViewsService: DataViewsService;
  engineDescriptorClient: EngineDescriptorClient;
  globalStateClient: EntityStoreGlobalStateClient;
  ccsLogsExtractionClient: CcsLogsExtractionClient;

  constructor({
    logger,
    namespace,
    esClient,
    dataViewsService,
    engineDescriptorClient,
    globalStateClient,
    ccsLogsExtractionClient,
  }: LogsExtractionClientDependencies) {
    this.logger = logger;
    this.namespace = namespace;
    this.esClient = esClient;
    this.dataViewsService = dataViewsService;
    this.engineDescriptorClient = engineDescriptorClient;
    this.globalStateClient = globalStateClient;
    this.ccsLogsExtractionClient = ccsLogsExtractionClient;
  }

  private async getLogExtractionConfigAndState(
    type: EntityType
  ): Promise<{ config: LogExtractionConfig; engineState: EngineLogExtractionState }> {
    const engineDescriptor = await this.engineDescriptorClient.findOrThrow(type);
    if (engineDescriptor.status !== ENGINE_STATUS.STARTED) {
      throw new EntityStoreNotRunningError();
    }
    const globalState = await this.globalStateClient.findOrThrow();
    return { config: globalState.logsExtraction, engineState: engineDescriptor.logExtractionState };
  }

  public async extractLogs(
    type: EntityType,
    opts?: LogsExtractionOptions
  ): Promise<ExtractedLogsSummary> {
    this.logger.debug('starting entity extraction');

    try {
      const { config, engineState } = await this.getLogExtractionConfigAndState(type);
      const delayMs = parseDurationToMs(config.delay);
      const entityDefinition = getEntityDefinition(type, this.namespace);
      const { count, pages, indexPatterns, lastSearchTimestamp, ccsError } =
        await this.runQueryAndIngestDocs({
          type,
          config,
          engineState,
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

      await this.engineDescriptorClient.update(type, {
        logExtractionState: {
          // we went through all the pages,
          // therefore we can leave the lastExecutionTimestamp as the beginning of the next
          // window
          paginationTimestamp: undefined,
          paginationId: undefined,
          // Store last searched timestamp to start window from here
          lastExecutionTimestamp: lastSearchTimestamp || moment().utc().toISOString(),
        },
        error: ccsError ? { message: ccsError.message, action: 'extractLogs' } : undefined,
      });

      return operationResult;
    } catch (error) {
      return await this.handleError(error, type);
    }
  }

  public async updateConfig(params: LogExtractionUpdateParams): Promise<LogExtractionConfig> {
    const globalState = await this.globalStateClient.findOrThrow();
    const mergedConfig = LogExtractionConfigSchema.parse({
      ...globalState.logsExtraction,
      ...params,
    });
    await this.globalStateClient.update({ logsExtraction: mergedConfig });
    return mergedConfig;
  }

  public async getRemainingLogsCount(type: EntityType): Promise<number> {
    try {
      const { config, engineState } = await this.getLogExtractionConfigAndState(type);
      const delayMs = parseDurationToMs(config.delay);
      const indexPatterns = await this.getLocalIndexPatterns(config.additionalIndexPatterns);
      const { fromDateISO } = this.getExtractionWindow(config, engineState, delayMs);
      const toDateISO = moment().utc().toISOString();
      const recoveryId = engineState.paginationId;
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
    type,
    config,
    engineState,
    opts,
    delayMs,
    entityDefinition,
  }: {
    type: EntityType;
    config: LogExtractionConfig;
    engineState: EngineLogExtractionState;
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
    const { docsLimit } = config;
    const { localIndexPatterns, remoteIndexPatterns } = await this.getLocalAndRemoteIndexPatterns(
      config.additionalIndexPatterns
    );
    const latestIndex = getLatestEntitiesIndexName(this.namespace);

    const { fromDateISO, toDateISO } =
      opts?.specificWindow || this.getExtractionWindow(config, engineState, delayMs);

    this.validateExtractionWindow(fromDateISO, toDateISO);

    const mainPromise = this.runMainExtractionLoop({
      type,
      engineState,
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
        type,
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
    type,
    engineState,
    opts,
    indexPatterns,
    latestIndex,
    fromDateISO,
    toDateISO,
    docsLimit,
    entityDefinition,
  }: {
    type: EntityType;
    engineState: EngineLogExtractionState;
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

    let recoveryId: string | undefined = engineState.paginationId;
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
      pagination = extractMainPaginationParams(esqlResponse, docsLimit);
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
        await this.engineDescriptorClient.update(type, {
          logExtractionState: {
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
    config: LogExtractionConfig,
    engineState: EngineLogExtractionState,
    delayMs: number
  ): { fromDateISO: string; toDateISO: string } {
    const { paginationTimestamp } = engineState;

    const fromDateISO =
      paginationTimestamp ||
      this.getDelayedLastExecutionTimestamp(engineState, delayMs) ||
      this.getFromDateBasedOnLookback(config);

    const toDateISO = moment().utc().subtract(delayMs, 'millisecond').toISOString();

    return { fromDateISO, toDateISO };
  }

  private getDelayedLastExecutionTimestamp(
    engineState: EngineLogExtractionState,
    durationMs: number
  ): string | undefined {
    if (!engineState.lastExecutionTimestamp) {
      return undefined;
    }

    return moment(engineState.lastExecutionTimestamp)
      .subtract(durationMs, 'millisecond')
      .toISOString();
  }

  private getFromDateBasedOnLookback({ lookbackPeriod }: LogExtractionConfig): string {
    const lookbackPeriodMs = parseDurationToMs(lookbackPeriod);
    return moment().utc().subtract(lookbackPeriodMs, 'millisecond').toISOString();
  }

  private async handleError(error: any, type: EntityType): Promise<ExtractedLogsSummary> {
    this.logger.error(error);

    if (
      SavedObjectsErrorHelpers.isNotFoundError(error) ||
      error instanceof EntityStoreNotRunningError
    ) {
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
