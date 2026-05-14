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
import { conditionToESQL } from '@kbn/streamlang';
import type {
  EntityIdentity,
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
  buildAliasPrelude,
  buildLogsExtractionEsqlQuery,
  buildRemainingLogsCountQuery,
  extractMainPaginationParams,
  HASHED_ID_FIELD,
} from './logs_extraction_query_builder';
import { getEuidSourceFields } from '../../../common/domain/euid/identity_fields';
import type { StreamAliasContext } from '../streams_features';
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
  /**
   * Pre-loaded schema-feature alias contexts (one per stream + schema feature).
   * When non-empty, `extractLogs` runs an extra alias-scoped extraction pass per
   * context whose alias destinations overlap with the static engine's identity
   * vocabulary. The default extraction pass remains untouched and runs first;
   * alias passes are stateless extras that add freshly-aliased entities to the
   * same `entities-latest` index via the standard LOOKUP-JOIN-then-upsert path.
   *
   * The caller is responsible for loading these via `loadStreamSchemaAliases`
   * before invoking `extractLogs`. When undefined or empty, behavior is
   * identical to today's single-pass extraction.
   */
  aliasContexts?: StreamAliasContext[];
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
      const indexPatterns = await this.getLocalAndRemoteIndexPatterns(
        config.additionalIndexPatterns,
        config.excludedIndexPatterns
      );

      const persistState = async (state: EngineLogExtractionState) => {
        await this.engineDescriptorClient.update(type, { logExtractionState: state });
      };

      const result = await this.extractLogsForDefinition({
        entityDefinition,
        paginationState: engineState,
        config,
        indexPatterns,
        opts,
        persistState,
      });

      // Alias-scoped extra passes. One per (stream, schema feature) whose
      // alias destinations overlap with this engine's identity vocabulary.
      // Each pass is stateless (no engine-descriptor persistence) — its only
      // observable effect is upserting freshly-aliased entities via the same
      // `entities-latest` LOOKUP JOIN path the default pass uses. Failures in
      // an alias pass are logged at warn level and swallowed so a bad alias
      // never breaks the default extraction.
      const aliasPassOutcomes = await this.runAliasScopedPasses({
        type,
        entityDefinition,
        config,
        opts,
      });
      const totalCount = result.count + aliasPassOutcomes.totalCount;
      const totalPages = result.pages + aliasPassOutcomes.totalPages;

      const operationResult = {
        success: true as const,
        count: totalCount,
        pages: totalPages,
        scannedIndices: [...result.scannedIndices, ...aliasPassOutcomes.scannedIndices],
      };

      if (opts?.specificWindow) {
        return operationResult;
      }

      await this.engineDescriptorClient.update(type, {
        logExtractionState: result.updatedState,
        error: result.ccsError ? { message: result.ccsError.message, action: 'extractLogs' } : null,
      });

      return operationResult;
    } catch (error) {
      return await this.handleError(error, type);
    }
  }

  /**
   * Runs one extraction pass per applicable schema-feature alias context.
   *
   * Selection: a context is applicable to an engine when at least one of its
   * alias destinations (e.g. `user.email`) appears in the engine's identity
   * vocabulary (`getEuidSourceFields(type).identitySourceFields`). Contexts
   * that don't overlap with this engine are silently skipped — they apply to
   * a different engine.
   *
   * Each pass:
   * - Targets only the alias context's `indexPatterns` (one stream's data
   *   stream), NOT the full data view. The default pass already covered the
   *   data view; the alias pass exists to surface entities the default pass
   *   couldn't see because the source docs lacked ECS identity fields.
   * - Skips the CCS path entirely. Aliased streams are local data streams.
   * - Uses ephemeral state (no `persistState`) — alias passes are stateless
   *   extras and don't compete with the engine descriptor's pagination state.
   * - Wraps its execution in try/catch so a single bad alias context never
   *   breaks the engine's default extraction.
   *
   * Returns aggregated counts that the caller adds to the default-pass totals
   * so the operation's reported `count` / `pages` reflect the full extraction.
   */
  private async runAliasScopedPasses({
    type,
    entityDefinition,
    config,
    opts,
  }: {
    type: EntityType;
    entityDefinition: ManagedEntityDefinition;
    config: LogExtractionConfig;
    opts?: LogsExtractionOptions;
  }): Promise<{ totalCount: number; totalPages: number; scannedIndices: string[] }> {
    const aliasContexts = opts?.aliasContexts ?? [];
    if (aliasContexts.length === 0) {
      return { totalCount: 0, totalPages: 0, scannedIndices: [] };
    }
    const { identitySourceFields } = getEuidSourceFields(type);
    const applicableContexts = aliasContexts.filter((ctx) =>
      Array.from(ctx.aliases.keys()).some((destination) =>
        identitySourceFields.includes(destination)
      )
    );
    if (applicableContexts.length === 0) {
      return { totalCount: 0, totalPages: 0, scannedIndices: [] };
    }
    let totalCount = 0;
    let totalPages = 0;
    const scannedIndices: string[] = [];
    for (const aliasContext of applicableContexts) {
      if (opts?.abortController?.signal.aborted) break;
      try {
        const aliasPrelude = buildAliasPrelude(aliasContext, identitySourceFields, type);
        if (aliasPrelude === '') {
          // Defensive — applicableContexts pre-filters this case but the
          // helper may still produce '' if every overlapping destination has
          // an empty source list.
          continue;
        }
        const aliasFilter = aliasContext.filter ? conditionToESQL(aliasContext.filter) : undefined;
        const aliasResult = await this.extractLogsForDefinition({
          entityDefinition,
          paginationState: { ...FRESH_ENGINE_LOG_EXTRACTION_STATE },
          config,
          indexPatterns: {
            localIndexPatterns: aliasContext.indexPatterns,
            remoteIndexPatterns: [],
          },
          opts,
          // Stateless: no persistState. Alias passes never write to the
          // engine descriptor's pagination cursor.
          aliasPrelude,
          aliasFilter,
        });
        totalCount += aliasResult.count;
        totalPages += aliasResult.pages;
        scannedIndices.push(...aliasResult.scannedIndices);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `[entity_store] Alias-scoped extraction pass failed for engine "${type}" against stream "${aliasContext.streamName}" (feature ${aliasContext.featureUuid}): ${message}; default extraction unaffected`
        );
      }
    }
    return { totalCount, totalPages, scannedIndices };
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

  /**
   * Definition-agnostic core: drives the local + CCS extraction pipelines for any
   * `ManagedEntityDefinition` and lets the caller own pagination-state persistence.
   *
   * Used by:
   * - `extractLogs(type, opts)` for static built-in types (state stored on the
   *   per-type EngineDescriptor SO);
   * - the `generic` extract-entity task for stream-derived KI definitions
   *   (state stored under a `(stream_name, subtype)` key in task state).
   *
   * Persistence contract:
   * - `persistState` is invoked after each entity-page write that produces a
   *   non-null pagination cursor, and after each completed outer log slice
   *   (with the slice-advanced state).
   * - `persistState` is NOT invoked with the final "completion reset" state;
   *   that state is returned as `updatedState` and the caller writes it.
   * - `persistState` is NOT invoked at all when `opts.specificWindow` is set,
   *   matching the existing manual-window semantics of `extractLogs`.
   *
   * Errors propagate to the caller. The `extractLogs` wrapper translates them
   * into `{ success: false, error }` and stamps the engine descriptor; the KI
   * task records them per-group into its own state.
   */
  public async extractLogsForDefinition({
    entityDefinition,
    paginationState,
    config,
    indexPatterns,
    opts,
    persistState,
    aliasPrelude,
    aliasFilter,
  }: {
    entityDefinition: ManagedEntityDefinition;
    paginationState: EngineLogExtractionState;
    config: LogExtractionConfig;
    indexPatterns: { localIndexPatterns: string[]; remoteIndexPatterns: string[] };
    opts?: LogsExtractionOptions;
    persistState?: (state: EngineLogExtractionState) => Promise<void>;
    /**
     * Optional pre-built ESQL EVAL fragment that COALESCEs non-ECS source paths
     * into the engine's ECS identity slots and stamps `entity.knowledge_indicator.*`
     * provenance. When set, it's threaded through to {@link buildLogsExtractionEsqlQuery}
     * for every entity-page query in this extraction run. Generated by
     * {@link buildAliasPrelude} from a {@link StreamAliasContext}; the orchestrator
     * (`runAliasScopedPasses`) sets it for alias-scoped passes only — the
     * default extraction pass and the KI generic loop both leave it undefined.
     */
    aliasPrelude?: string;
    /**
     * Optional pre-translated ESQL predicate from the schema feature's `filter`,
     * scoping the alias pass to docs that match the LLM's intended actor-identity
     * context. Threaded through to {@link buildLogsExtractionEsqlQuery} for every
     * entity-page query in this extraction run.
     */
    aliasFilter?: string;
  }): Promise<{
    count: number;
    pages: number;
    scannedIndices: string[];
    updatedState: EngineLogExtractionState;
    lastSearchTimestamp: string;
    ccsError?: Error;
  }> {
    const { localIndexPatterns, remoteIndexPatterns } = indexPatterns;
    const latestIndex = getLatestEntitiesIndexName(this.namespace);
    const { type } = entityDefinition;

    // Mirror the historical `persistMainLogExtractionStateIfNotManualWindow` gating:
    // for manual (specificWindow) runs, no mid-run state is persisted.
    const effectivePersistState = opts?.specificWindow ? undefined : persistState;

    const mainPromise = this.runMainPath({
      type,
      config,
      engineState: paginationState,
      opts,
      entityDefinition,
      indexPatterns: localIndexPatterns,
      latestIndex,
      persistState: effectivePersistState,
      aliasPrelude,
      aliasFilter,
    });

    let mainResult: Awaited<typeof mainPromise>;
    let ccsError: Error | undefined;

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

      const [main, ccs] = await Promise.all([mainPromise, ccsPromise]);
      mainResult = main;
      ccsError = ccs.error;
    } else {
      mainResult = await mainPromise;
    }

    const updatedState: EngineLogExtractionState = {
      paginationTimestamp: null,
      paginationId: null,
      logsPageCursorStartTimestamp: null,
      logsPageCursorStartId: null,
      logsPageCursorEndTimestamp: null,
      logsPageCursorEndId: null,
      lastExecutionTimestamp: mainResult.lastSearchTimestamp || moment().utc().toISOString(),
    };

    return {
      count: mainResult.count,
      pages: mainResult.pages,
      scannedIndices: [...localIndexPatterns, ...remoteIndexPatterns],
      updatedState,
      lastSearchTimestamp: mainResult.lastSearchTimestamp,
      ccsError,
    };
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
    persistState,
    aliasPrelude,
    aliasFilter,
  }: {
    type: EntityType;
    config: LogExtractionConfig;
    engineState: EngineLogExtractionState;
    opts?: LogsExtractionOptions;
    entityDefinition: ManagedEntityDefinition;
    indexPatterns: string[];
    latestIndex: string;
    persistState?: (state: EngineLogExtractionState) => Promise<void>;
    aliasPrelude?: string;
    aliasFilter?: string;
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
        persistState,
        aliasPrelude,
        aliasFilter,
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
        persistState,
        aliasPrelude,
        aliasFilter,
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
    persistState,
    aliasPrelude,
    aliasFilter,
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
    persistState?: (state: EngineLogExtractionState) => Promise<void>;
    aliasPrelude?: string;
    aliasFilter?: string;
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
          identityField: entityDefinition.identityField,
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
          persistState,
          aliasPrelude,
          aliasFilter,
        });

        totalCount += sliceIngestOutcome.addedToTotalCount;
        pages += sliceIngestOutcome.addedToPageCount;
        state = sliceIngestOutcome.state;

        recoveryId = undefined;

        state = this.advanceEngineStateAfterLogPageCompletes(state, logsPageCursorEnd);
        await persistState?.(state);
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
    identityField,
    fromDateISO,
    toDateISO,
    logsPageCursorStart,
    maxLogsPerPage,
    opts,
  }: {
    indexPatterns: string[];
    type: EntityType;
    /**
     * Definition's own identity. Required for stream-derived (KI) generic
     * definitions whose identity field is not `entity.id`; without it the
     * probe falls back to the registry's static identity for `type` and
     * emits `entity.id IS NOT NULL` in the WHERE clause, which fails
     * verification against arbitrary stream indices.
     */
    identityField: EntityIdentity;
    fromDateISO: string;
    toDateISO: string;
    logsPageCursorStart: PaginationParams | undefined;
    maxLogsPerPage: number;
    opts?: LogsExtractionOptions;
  }): Promise<LogPaginationCursor> {
    const logPaginationCursorProbeQuery =
      // Mirrors the main extraction query (and the CCS probe) in tolerating
      // unmapped source columns. Required for stream-derived (KI) definitions
      // whose `indexPatterns` (e.g. `logs.ecs.windows`) may not map every
      // entity.*/event.*/asset.* column referenced through `identityField` or
      // its dependent ESQL helpers. Without this, ESQL aborts the probe with
      // `verification_exception` and the whole extraction loop fails.
      `SET unmapped_fields="nullify";\n` +
      buildLogPaginationCursorProbeEsql({
        indexPatterns,
        type,
        identityField,
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
    persistState,
    aliasPrelude,
    aliasFilter,
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
    persistState?: (state: EngineLogExtractionState) => Promise<void>;
    aliasPrelude?: string;
    aliasFilter?: string;
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
        aliasPrelude,
        aliasFilter,
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
        await persistState?.(state);
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
