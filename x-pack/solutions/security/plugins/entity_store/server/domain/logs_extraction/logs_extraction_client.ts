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
import { isNonLocalIndexName } from '@kbn/es-query';
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
import {
  capExtractionWindowEnd,
  resolveMainExtractionWindow,
  validateExtractionWindow,
} from './extraction_window';
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
import type { CcsLogsExtractionClient } from './ccs_logs_extraction_client';
import { EntityStoreNotRunningError } from '../errors';
import type { LogExtractionUpdateParams } from '../../routes/constants';

/** Engine state with all cursor fields cleared. Used between sub-window iterations so a fresh
 * sub-window does not re-trigger recovery from cursors persisted by an earlier sub-window. */
const FRESH_ENGINE_LOG_EXTRACTION_STATE: EngineLogExtractionState = {
  paginationTimestamp: null,
  paginationId: null,
  logsPageCursorStartTimestamp: null,
  logsPageCursorStartId: null,
  logsPageCursorEndTimestamp: null,
  logsPageCursorEndId: null,
  lastExecutionTimestamp: null,
};

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
      const entityDefinition = getEntityDefinition(type, this.namespace);
      const { count, pages, indexPatterns, lastSearchTimestamp, ccsError } =
        await this.runQueryAndIngestDocs({
          type,
          config,
          engineState,
          opts,
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
          paginationTimestamp: null,
          paginationId: null,
          logsPageCursorStartTimestamp: null,
          logsPageCursorStartId: null,
          logsPageCursorEndTimestamp: null,
          logsPageCursorEndId: null,
          lastExecutionTimestamp: lastSearchTimestamp || moment().utc().toISOString(),
        },
        error: ccsError ? { message: ccsError.message, action: 'extractLogs' } : null,
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
      const indexPatterns = await this.getLocalIndexPatterns(
        config.additionalIndexPatterns,
        config.excludedIndexPatterns
      );
      const { fromDateISO } = resolveMainExtractionWindow({ config, engineState });
      const toDateISO = moment().utc().toISOString();
      const logsPageCursorStart = paginationFromOptionalFields(
        engineState.logsPageCursorStartTimestamp,
        engineState.logsPageCursorStartId
      );
      const query = buildRemainingLogsCountQuery({
        indexPatterns,
        type,
        fromDateISO,
        toDateISO,
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
    entityDefinition,
  }: {
    type: EntityType;
    config: LogExtractionConfig;
    engineState: EngineLogExtractionState;
    opts?: LogsExtractionOptions;
    entityDefinition: ManagedEntityDefinition;
  }): Promise<{
    count: number;
    pages: number;
    indexPatterns: string[];
    lastSearchTimestamp: string;
    ccsError?: Error;
  }> {
    const { localIndexPatterns, remoteIndexPatterns } = await this.getLocalAndRemoteIndexPatterns(
      config.additionalIndexPatterns,
      config.excludedIndexPatterns
    );
    const latestIndex = getLatestEntitiesIndexName(this.namespace);

    const mainPromise = this.runMainPath({
      type,
      config,
      engineState,
      opts,
      entityDefinition,
      indexPatterns: localIndexPatterns,
      latestIndex,
    });

    if (remoteIndexPatterns.length > 0) {
      const ccsPromise = this.ccsLogsExtractionClient.extractToUpdates({
        type,
        remoteIndexPatterns,
        docsLimit: config.docsLimit,
        maxLogsPerPage: config.maxLogsPerPage,
        lookbackPeriod: config.lookbackPeriod,
        delay: config.delay,
        entityDefinition,
        abortController: opts?.abortController,
        windowOverride: opts?.specificWindow,
        maxTimeWindowSize: config.maxTimeWindowSize,
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
   * Main-path dispatcher: a manual `specificWindow` runs the extraction loop once with the
   * supplied bounds; a scheduled run walks the time window as a sequence of capped sub-windows.
   *
   * Sub-window loop (scheduled runs): bounds probe cost in lagging environments by limiting
   * each iteration's WHERE-clause to `maxTimeWindowSize` of data. After each iteration the
   * cursor state is cleared and `lastExecutionTimestamp` advances to the sub-window end so a
   * crash between sub-windows resumes correctly on the next scheduled run.
   */
  private async runMainPath({
    type,
    config,
    engineState,
    opts,
    entityDefinition,
    indexPatterns,
    latestIndex,
  }: {
    type: EntityType;
    config: LogExtractionConfig;
    engineState: EngineLogExtractionState;
    opts?: LogsExtractionOptions;
    entityDefinition: ManagedEntityDefinition;
    indexPatterns: string[];
    latestIndex: string;
  }): Promise<{
    count: number;
    pages: number;
    indexPatterns: string[];
    lastSearchTimestamp: string;
  }> {
    const { docsLimit, maxLogsPerPage } = config;

    if (opts?.specificWindow) {
      const { fromDateISO, toDateISO } = opts.specificWindow;
      validateExtractionWindow(fromDateISO, toDateISO);
      const result = await this.runMainExtractionLoop({
        type,
        engineState,
        opts,
        indexPatterns,
        latestIndex,
        fromDateISO,
        toDateISO,
        docsLimit,
        maxLogsPerPage,
        entityDefinition,
      });
      return { ...result, indexPatterns };
    }

    const { fromDateISO: initialFromDateISO, effectiveWindowEnd } = resolveMainExtractionWindow({
      config,
      engineState,
    });
    // Surface clock skew / corrupted state loudly if the persisted resume point is in the future.
    validateExtractionWindow(initialFromDateISO, effectiveWindowEnd);

    let currentFromDateISO = initialFromDateISO;
    // Recovery cursors on the engine state apply only to the first sub-window of this run; once
    // it completes, subsequent sub-windows iterate over fresh time ranges and must not re-trigger
    // entity-page recovery from a stale paginationId.
    let currentEngineState = engineState;
    let totalCount = 0;
    let totalPages = 0;
    let lastSubWindowEnd = currentFromDateISO;

    let hasNextPage = true;
    while (hasNextPage) {
      if (opts?.abortController?.signal.aborted) {
        break;
      }
      if (currentFromDateISO >= effectiveWindowEnd) {
        break;
      }

      const { toDateISO, isCapped } = capExtractionWindowEnd({
        fromDateISO: currentFromDateISO,
        effectiveWindowEnd,
        maxTimeWindowSize: config.maxTimeWindowSize,
        logger: this.logger,
      });

      const subResult = await this.runMainExtractionLoop({
        type,
        engineState: currentEngineState,
        opts,
        indexPatterns,
        latestIndex,
        fromDateISO: currentFromDateISO,
        toDateISO,
        docsLimit,
        maxLogsPerPage,
        entityDefinition,
      });

      totalCount += subResult.count;
      totalPages += subResult.pages;
      lastSubWindowEnd = toDateISO;

      // if the window was capped we consider we have a next page
      hasNextPage = isCapped;
      currentFromDateISO = toDateISO;
      currentEngineState = FRESH_ENGINE_LOG_EXTRACTION_STATE;
    }

    return {
      count: totalCount,
      pages: totalPages,
      indexPatterns,
      lastSearchTimestamp: lastSubWindowEnd,
    };
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

    /** One-shot `paginationId` from a prior run: consumed by the first bounded extraction batch for entity-level pagination. */
    let recoveryId = initialEngineState.paginationId ?? undefined;
    if (recoveryId) {
      this.logger.warn(
        `Resuming with paginationId ${recoveryId} and extraction window from ${fromDateISO} (entity pagination at ${
          state.paginationTimestamp ?? 'n/a'
        }).`
      );
    }

    try {
      let lastLogsPages = false;
      /** First outer iteration of this `extractLogs` run: run the boundary probe from the time window only, not the persisted log-slice start. */
      let isFirstRunInThisCycle = true;
      do {
        const entityPagination = paginationFromOptionalFields(
          state.paginationTimestamp,
          state.paginationId
        );
        // always find a new cursor via probe on first run
        const logsPageCursorStart = isFirstRunInThisCycle
          ? undefined
          : paginationFromOptionalFields(
              state.logsPageCursorStartTimestamp,
              state.logsPageCursorStartId
            );

        const probePromise = this.runLogPaginationCursorProbeForNextPage({
          indexPatterns,
          type,
          fromDateISO,
          toDateISO,
          logsPageCursorStart,
          maxLogsPerPage,
          opts,
        });
        const probeOutcome = await probePromise;

        if (!probeOutcome.hasLogsToProcess) {
          break;
        }

        const logsPageCursorEnd = probeOutcome.logsPaginationCursor;
        lastLogsPages = probeOutcome.isLastLogsPage;
        state = {
          ...state,
          logsPageCursorEndTimestamp: logsPageCursorEnd.timestampCursor,
          logsPageCursorEndId: logsPageCursorEnd.idCursor,
        };

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
          logsPageCursorEnd,
          entityPagination,
          recoveryId,
          state,
        });

        totalCount += sliceIngestOutcome.addedToTotalCount;
        pages += sliceIngestOutcome.addedToPageCount;
        state = sliceIngestOutcome.state;

        recoveryId = undefined;

        state = this.advanceEngineStateAfterLogPageCompletes(state, logsPageCursorEnd);
        await this.persistMainLogExtractionStateIfNotManualWindow(type, opts, state);
        isFirstRunInThisCycle = false;
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
   * Locates the inclusive upper bound of the next raw-log page (probe ESQL). Runs every outer log-slice iteration.
   */
  private async runLogPaginationCursorProbeForNextPage({
    indexPatterns,
    type,
    fromDateISO,
    toDateISO,
    logsPageCursorStart,
    maxLogsPerPage,
    opts,
  }: {
    indexPatterns: string[];
    type: EntityType;
    fromDateISO: string;
    toDateISO: string;
    logsPageCursorStart: PaginationParams | undefined;
    maxLogsPerPage: number;
    opts?: LogsExtractionOptions;
  }): Promise<LogPaginationCursor> {
    const logPaginationCursorProbeQuery = buildLogPaginationCursorProbeEsql({
      indexPatterns,
      type,
      fromDateISO,
      toDateISO,
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

    let pagination = entityPagination;
    let recoveryIdForBounded = recoveryId;

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
          logsPageCursorStartTimestamp: logsPageCursorStart?.timestampCursor ?? null,
          logsPageCursorStartId: logsPageCursorStart?.idCursor ?? null,
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
      // this is the leading state for the next log page if we break in the middle of the processing
      paginationTimestamp: logsPageCursorEnd.timestampCursor,
      paginationId: null,
      logsPageCursorEndTimestamp: null,
      logsPageCursorEndId: null,
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
    additionalIndexPatterns: string[] = [],
    excludedIndexPatterns: string[] = []
  ): Promise<{ localIndexPatterns: string[]; remoteIndexPatterns: string[] }> {
    const all = await this.getAllIndexPatternsIncludingRemote(additionalIndexPatterns);
    const alertsIndex = getAlertsIndexName(this.namespace);
    const withoutAlerts = all.filter((index) => index !== alertsIndex);

    const localIndexPatterns: string[] = [];
    const remoteIndexPatterns: string[] = [];

    withoutAlerts.forEach((index) => {
      if (isNonLocalIndexName(index)) {
        remoteIndexPatterns.push(index);
      } else {
        localIndexPatterns.push(index);
      }
    });

    // Append after includes: ES negation only subtracts from earlier entries in the same expression.
    // e.g. `logs-*,-logs-proxy-*` excludes proxy logs, but `-logs-proxy-*,logs-*` does not.
    excludedIndexPatterns.forEach((pattern) => {
      if (isNonLocalIndexName(pattern)) {
        remoteIndexPatterns.push(`-${pattern}`);
      } else {
        localIndexPatterns.push(`-${pattern}`);
      }
    });

    return { localIndexPatterns, remoteIndexPatterns };
  }

  public async getLocalIndexPatterns(
    additionalIndexPatterns: string[] = [],
    excludedIndexPatterns: string[] = []
  ): Promise<string[]> {
    const { localIndexPatterns } = await this.getLocalAndRemoteIndexPatterns(
      additionalIndexPatterns,
      excludedIndexPatterns
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
      // Not found is a acceptable state in tests and fresh environments
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        this.logger.warn('Security solution data view not found, defaulting to logs-*');
      } else {
        this.logger.warn(
          'Problems finding security solution data view indices, defaulting to logs-*'
        );
        this.logger.warn(error);
      }

      indexPatterns.push('logs-*');
    }

    return indexPatterns;
  }
}

function paginationFromOptionalFields(
  ts: string | null,
  id: string | null
): PaginationParams | undefined {
  if (id && ts) {
    return { timestampCursor: ts, idCursor: id };
  }
  return undefined;
}
