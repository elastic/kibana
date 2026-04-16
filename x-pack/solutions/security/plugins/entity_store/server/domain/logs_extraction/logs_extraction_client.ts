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
  buildLogPaginationCursorProbeEsql,
  interpretLogPaginationCursorRows,
  type LogPaginationCursor,
  parseLogPaginationCursorRow,
} from './log_pagination_probe_query_builder';
import {
  buildLogsExtractionEsqlQuery,
  buildRemainingLogsCountQuery,
  extractMainPaginationParams,
  HASHED_ID_FIELD,
} from './logs_extraction_query_builder';
import { getLatestEntitiesIndexName } from '../../../common/domain/entity_index';
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
          logsPageCursorStartTimestamp: undefined,
          logsPageCursorStartId: undefined,
          logsPageCursorEndTimestamp: undefined,
          logsPageCursorEndId: undefined,
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
      const logsPageCursorStart = paginationFromOptionalFields(
        engineState.logsPageCursorStartTimestamp,
        engineState.logsPageCursorStartId
      );
      const query = buildRemainingLogsCountQuery({
        indexPatterns,
        type,
        fromDateISO,
        toDateISO,
        recoveryId,
        logsPageCursorStart,
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
    const { docsLimit, maxLogsPerPage } = config;
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
      maxLogsPerPage,
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

  /**
   * Main LOOKUP extraction: outer loop over capped raw-log slices, inner loop over entity pages per slice.
   */
  private async runMainExtractionLoop({
    type,
    engineState: initialEngineState,
    opts,
    indexPatterns,
    latestIndex,
    fromDateISO,
    toDateISO,
    docsLimit,
    maxLogsPerPage,
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
    maxLogsPerPage: number;
    entityDefinition: ManagedEntityDefinition;
  }) {
    let totalCount = 0;
    let pages = 0;
    let state: EngineLogExtractionState = { ...initialEngineState };

    const onAbort = () => this.logger.debug('Aborting execution mid logs extraction');
    opts?.abortController?.signal.addEventListener('abort', onAbort);

    /** One-shot `recoveryId` for corrupt state: consumed by the probe or the first bounded extraction batch. */
    let recoveryId = initialEngineState.paginationId;
    if (recoveryId) {
      this.logger.warn(
        `Recovering from corrupt state, using paginationTimestamp ${fromDateISO} and paginationId ${recoveryId} beginning of the window.`
      );
    }

    try {
      let lastLogsPages = false;
      do {
        const {
          logsPageCursorStart,
          logsPageCursorEnd: logsPageCursorEndFromState,
          entityPagination,
          skipProbe,
        } = this.readMainLoopCursorsFromState(state);

        let logsPageCursorEnd = logsPageCursorEndFromState;

        if (!skipProbe) {
          const probePromise = this.runLogPaginationCursorProbeForNextPage({
            indexPatterns,
            type,
            fromDateISO,
            toDateISO,
            logsPageCursorStart,
            maxLogsPerPage,
            recoveryId,
            opts,
          });
          // One-shot id is consumed when the probe query is built (before ES runs), matching prior clear-before-await behavior.
          recoveryId = undefined;
          const probeOutcome = await probePromise;

          if (!probeOutcome.hasLogsToProcess) {
            break;
          }

          logsPageCursorEnd = probeOutcome.logsPaginationCursor;
          lastLogsPages = probeOutcome.isLastLogsPage;
          state = {
            ...state,
            logsPageCursorEndTimestamp: logsPageCursorEnd.timestampCursor,
            logsPageCursorEndId: logsPageCursorEnd.idCursor,
          };
        }

        const sliceIngestOutcome = await this.ingestEntityPagesWithinCurrentLogPage({
          type,
          opts,
          indexPatterns,
          latestIndex,
          entityDefinition,
          docsLimit,
          fromDateISO,
          toDateISO,
          logsPageCursorStart,
          logsPageCursorEnd: logsPageCursorEnd!,
          skipProbe,
          entityPagination,
          recoveryId,
          state,
        });

        totalCount += sliceIngestOutcome.addedToTotalCount;
        pages += sliceIngestOutcome.addedToPageCount;
        state = sliceIngestOutcome.state;

        recoveryId = undefined;

        state = this.advanceEngineStateAfterLogPageCompletes(state, logsPageCursorEnd!);
        await this.persistMainLogExtractionStateIfNotManualWindow(type, opts, state);
      } while (!lastLogsPages);
    } finally {
      opts?.abortController?.signal.removeEventListener('abort', onAbort);
    }

    return {
      count: totalCount,
      pages,
      indexPatterns,
      lastSearchTimestamp: toDateISO,
    };
  }

  /**
   * Hydrates raw-log slice cursors and entity pagination from the engine descriptor for one outer iteration.
   * `skipProbe` is true when both entity pagination and slice end are present (interrupted run), so the boundary ESQL probe query is skipped.
   */
  private readMainLoopCursorsFromState(state: EngineLogExtractionState): {
    logsPageCursorStart: PaginationParams | undefined;
    logsPageCursorEnd: PaginationParams | undefined;
    entityPagination: PaginationParams | undefined;
    skipProbe: boolean;
  } {
    // Exclusive lower bound on (@timestamp, _id) for raw logs: end of the previous slice, or unset at window start.
    const logsPageCursorStart = paginationFromOptionalFields(
      state.logsPageCursorStartTimestamp,
      state.logsPageCursorStartId
    );
    // Inclusive upper bound of the current raw-log slice; from disk when we skip the probe (interrupted mid-entity-pages), else filled by the probe.
    const logsPageCursorEnd = paginationFromOptionalFields(
      state.logsPageCursorEndTimestamp,
      state.logsPageCursorEndId
    );
    // Entity-row pagination inside the current slice (post-STATS LIMIT); both fields required.
    const entityPagination = paginationFromOptionalFields(
      state.paginationTimestamp,
      state.paginationId
    );
    // When both slice end and entity cursor are on disk, skip the boundary probe and continue bounded extraction for this slice.
    const skipProbe = !!(entityPagination && logsPageCursorEnd);

    return {
      logsPageCursorStart,
      logsPageCursorEnd,
      entityPagination,
      skipProbe,
    };
  }

  /**
   * Locates the inclusive upper bound of the next raw-log page (probe ESQL). Clears corrupt `recoveryId` after scheduling the query.
   */
  private async runLogPaginationCursorProbeForNextPage({
    indexPatterns,
    type,
    fromDateISO,
    toDateISO,
    logsPageCursorStart,
    maxLogsPerPage,
    recoveryId,
    opts,
  }: {
    indexPatterns: string[];
    type: EntityType;
    fromDateISO: string;
    toDateISO: string;
    logsPageCursorStart: PaginationParams | undefined;
    maxLogsPerPage: number;
    recoveryId: string | undefined;
    opts?: LogsExtractionOptions;
  }): Promise<LogPaginationCursor> {
    const logPaginationCursorProbeQuery = buildLogPaginationCursorProbeEsql({
      indexPatterns,
      type,
      fromDateISO,
      toDateISO,
      recoveryId,
      logsPageCursorStart,
      maxLogsPerPage,
    });

    const logPaginationCursorProbeResponse = await executeEsqlQuery({
      esClient: this.esClient,
      query: logPaginationCursorProbeQuery,
      abortController: opts?.abortController,
    });

    const parsedLogPaginationCursor = parseLogPaginationCursorRow(logPaginationCursorProbeResponse);

    const interpretedLogPaginationCursor = interpretLogPaginationCursorRows(
      parsedLogPaginationCursor,
      maxLogsPerPage
    );

    if (parsedLogPaginationCursor) {
      this.logger.debug(
        `Log pagination cursor probe: missing logs to process ${parsedLogPaginationCursor.missingLogsToProcess}, next page starts at ${parsedLogPaginationCursor.logsPaginationCursor.timestampCursor} | ${parsedLogPaginationCursor.logsPaginationCursor.idCursor}`
      );
    }

    if (!interpretedLogPaginationCursor.hasLogsToProcess) {
      return { hasLogsToProcess: false };
    }

    return {
      hasLogsToProcess: true,
      logsPaginationCursor: interpretedLogPaginationCursor.logsPaginationCursor,
      isLastLogsPage: interpretedLogPaginationCursor.isLastLogsPage,
    };
  }

  /**
   * Bounded extraction ESQL + ingest for each entity page within one raw-log slice.
   */
  private async ingestEntityPagesWithinCurrentLogPage({
    type,
    opts,
    indexPatterns,
    latestIndex,
    entityDefinition,
    docsLimit,
    fromDateISO,
    toDateISO,
    logsPageCursorStart,
    logsPageCursorEnd,
    skipProbe,
    entityPagination,
    recoveryId,
    state: initialSliceState,
  }: {
    type: EntityType;
    opts?: LogsExtractionOptions;
    indexPatterns: string[];
    latestIndex: string;
    entityDefinition: ManagedEntityDefinition;
    docsLimit: number;
    fromDateISO: string;
    toDateISO: string;
    logsPageCursorStart: PaginationParams | undefined;
    logsPageCursorEnd: PaginationParams;
    skipProbe: boolean;
    entityPagination: PaginationParams | undefined;
    recoveryId: string | undefined;
    state: EngineLogExtractionState;
  }): Promise<{
    addedToTotalCount: number;
    addedToPageCount: number;
    state: EngineLogExtractionState;
  }> {
    let state = initialSliceState;
    let addedToTotalCount = 0;
    let addedToPageCount = 0;

    let pagination = skipProbe ? entityPagination : undefined;
    let recoveryIdForBounded = skipProbe ? recoveryId : undefined;

    do {
      const query = buildLogsExtractionEsqlQuery({
        indexPatterns,
        latestIndex,
        entityDefinition,
        docsLimit,
        fromDateISO,
        toDateISO,
        pagination,
        recoveryId: recoveryIdForBounded,
        logsPageCursorStart,
        logsPageCursorEnd,
      });
      recoveryIdForBounded = undefined;

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

      addedToTotalCount += esqlResponse.values.length;
      pagination = extractMainPaginationParams(esqlResponse, docsLimit);
      if (esqlResponse.values.length > 0) {
        addedToPageCount++;
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
        state = {
          ...state,
          paginationTimestamp: pagination.timestampCursor,
          paginationId: pagination.idCursor,
          logsPageCursorEndTimestamp: logsPageCursorEnd.timestampCursor,
          logsPageCursorEndId: logsPageCursorEnd.idCursor,
          logsPageCursorStartTimestamp: logsPageCursorStart?.timestampCursor,
          logsPageCursorStartId: logsPageCursorStart?.idCursor,
        };
        await this.persistMainLogExtractionStateIfNotManualWindow(type, opts, state);
      }
    } while (pagination);

    return { addedToTotalCount, addedToPageCount, state };
  }

  /**
   * After all entity pages for a slice: drop entity + slice-end fields and move the exclusive raw-log cursor to the slice end.
   */
  private advanceEngineStateAfterLogPageCompletes(
    state: EngineLogExtractionState,
    logsPageCursorEnd: PaginationParams
  ): EngineLogExtractionState {
    return {
      ...state,
      paginationTimestamp: undefined,
      paginationId: undefined,
      logsPageCursorEndTimestamp: undefined,
      logsPageCursorEndId: undefined,
      logsPageCursorStartTimestamp: logsPageCursorEnd.timestampCursor,
      logsPageCursorStartId: logsPageCursorEnd.idCursor,
    };
  }

  private async persistMainLogExtractionStateIfNotManualWindow(
    type: EntityType,
    opts: LogsExtractionOptions | undefined,
    logExtractionState: Partial<EngineLogExtractionState>
  ): Promise<void> {
    if (opts?.specificWindow) {
      return;
    }
    await this.engineDescriptorClient.update(type, {
      logExtractionState: logExtractionState as EngineLogExtractionState,
    });
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
  //    fromDate = lastExecutionTimestamp - delay | toDate = now - delay
  // 4. Log page cursors present without lastExecutionTimestamp (e.g. interrupted before first full run):
  //    fromDate = logsPageCursorStartTimestamp | toDate = now - delay — avoids shifting to lookback and skipping data before the cursor.
  //
  // Mid log-page: prefer persisted slice start over lastExecutionTimestamp so `from` tracks in-flight slice bounds.
  // (lastExecution alone can sit ahead of the cursor and narrow the window past data we still owe.)
  // Lookback remains only as a fallback when we have log-page progress (start or end on disk) but neither
  // slice start nor lastExecution is set — e.g. slice end persisted before start in a narrow window.
  private getExtractionWindow(
    config: LogExtractionConfig,
    engineState: EngineLogExtractionState,
    delayMs: number
  ): { fromDateISO: string; toDateISO: string } {
    const hasLogPaginationCursorProgress = !!(
      engineState.logsPageCursorStartTimestamp || engineState.logsPageCursorEndTimestamp
    );

    let fromDateISO: string;
    if (hasLogPaginationCursorProgress) {
      // Mid log-page: use persisted cursor start, then last run, else lookback—so `from` stays before the cursor.
      fromDateISO =
        this.getFromDateISOFromPersistedLogPageCursorStart(engineState) ||
        this.getDelayedLastExecutionTimestamp(engineState, delayMs) ||
        this.getFromDateBasedOnLookback(config);
    } else {
      // No log-page cursor: entity pagination, then last run, then lookback.
      fromDateISO =
        engineState.paginationTimestamp ||
        this.getDelayedLastExecutionTimestamp(engineState, delayMs) ||
        this.getFromDateBasedOnLookback(config);
    }

    const toDateISO = moment().utc().subtract(delayMs, 'millisecond').toISOString();

    return { fromDateISO, toDateISO };
  }

  /** Persisted log-page slice start; used so `fromDateISO` does not jump past an in-flight cursor. */
  private getFromDateISOFromPersistedLogPageCursorStart(
    engineState: EngineLogExtractionState
  ): string | undefined {
    return engineState.logsPageCursorStartTimestamp || undefined;
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

function paginationFromOptionalFields(
  ts: string | undefined,
  id: string | undefined
): PaginationParams | undefined {
  if (id && ts) {
    return { timestampCursor: ts, idCursor: id };
  }
  return undefined;
}
