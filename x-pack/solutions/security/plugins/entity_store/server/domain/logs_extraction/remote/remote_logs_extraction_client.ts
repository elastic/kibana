/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import moment from 'moment';
import { unflattenObject } from '@kbn/object-utils';
import { get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { isResponseError, type ElasticsearchErrorDetails } from '@kbn/es-errors';
import { entityStoreMetrics } from '../../../monitor/metrics';
import type { Entity } from '../../../../common/domain/definitions/entity.gen';
import {
  EntityType,
  type EntityField,
  type ManagedEntityDefinition,
} from '../../../../common/domain/definitions/entity_schema';
import {
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  type LogSlicePaginationParams,
  type PaginationParams,
} from '../query_builder_commons';
import {
  buildRemoteLogsExtractionEsqlQuery,
  extractRemotePaginationParams,
} from './remote_logs_extraction_query_builder';
import {
  buildLogPaginationCursorProbeEsql,
  interpretLogPaginationCursorRows,
  parseLogPaginationCursorRow,
  type LogPaginationCursor,
} from '../log_pagination_probe_query_builder';
import { executeEsqlQuery } from '../../../infra/elasticsearch/esql';
import { ingestEntities } from '../../../infra/elasticsearch/ingest';
import { resolveClosedIndexAdjustments } from '../../../infra/elasticsearch/resolve_closed_indices';
import { getUpdatesEntitiesDataStreamName } from '../../asset_manager/updates_data_stream';
import {
  applyMaxLagCutoff,
  capExtractionWindowEnd,
  resolveRemoteExtractionWindow,
} from '../extraction_window';
import { capAtMaxLogsPerWindow, pickSampleProbability } from '../effective_page_limits';
import type { RemoteExtractionStrategy } from './strategies';
import { getErrorMessage } from '../../../../common';

interface RemoteExtractToUpdatesParams {
  type: EntityType;
  remoteIndexPatterns: string[];
  docsLimit: number;
  maxLogsPerPage: number;
  lookbackPeriod: string;
  delay: string;
  frequency: string;
  entityDefinition: ManagedEntityDefinition;
  signal?: AbortSignal;
  windowOverride?: { fromDateISO: string; toDateISO: string };
  maxTimeWindowSize: string;
  /** Total raw log documents allowed per run. 0 = disabled. */
  maxLogsPerWindow: number;
  /** What to do when the cap fires: preserve cursor (defer) or advance to window end (drop). */
  maxLogsPerWindowCapBehavior: 'defer' | 'drop';
}

interface RemoteExtractToUpdatesResult {
  count: number;
  pages: number;
  logsProcessed?: number;
  error?: Error;
  logsCapApplied?: boolean;
}

const getEsErrorType = (error: unknown): string | undefined =>
  isResponseError(error) ? (error.body as ElasticsearchErrorDetails)?.error?.type : undefined;

// CPS is not enabled, so '_origin' can't be resolved
const isNoSuchRemoteClusterError = (type?: string) => type === 'no_such_remote_cluster_exception';

// no linked projects, so '-_origin:*' resolves to an empty scope, ESQL throws 500
const isNoSuchElementError = (type?: string) => type === 'no_such_element_exception';

const isRemoteUnavailableError = (error: unknown): boolean => {
  const type = getEsErrorType(error);
  return isNoSuchElementError(type) || isNoSuchRemoteClusterError(type);
};

export class RemoteLogsExtractionClient {
  private readonly logger: Logger;

  constructor(
    logger: Logger,
    private readonly namespace: string,
    public readonly strategy: RemoteExtractionStrategy
  ) {
    this.logger = logger.get(`remote.${strategy.id}`);
  }

  public async extractToUpdates(
    params: RemoteExtractToUpdatesParams
  ): Promise<RemoteExtractToUpdatesResult> {
    try {
      return await this.doExtractToUpdates(params);
    } catch (error) {
      const message = getErrorMessage(error);
      if (this.strategy.id === 'cps' && isRemoteUnavailableError(error)) {
        this.logger.warn(
          `remote extraction unavailable (no linked projects or CPS disabled): ${message}. Returning empty result.`
        );
        return { count: 0, pages: 0 };
      }
      const wrappedError = new Error(
        `Failed to extract to updates from remote indices: ${message}`
      );
      this.logger.error(wrappedError);
      return { count: 0, pages: 0, error: wrappedError };
    }
  }

  private async doExtractToUpdates({
    type,
    remoteIndexPatterns,
    docsLimit,
    maxLogsPerPage,
    lookbackPeriod,
    delay,
    frequency,
    entityDefinition,
    signal,
    windowOverride,
    maxTimeWindowSize,
    maxLogsPerWindow,
    maxLogsPerWindowCapBehavior,
  }: RemoteExtractToUpdatesParams): Promise<RemoteExtractToUpdatesResult> {
    if (remoteIndexPatterns.length === 0) {
      return { count: 0, pages: 0 };
    }

    const { openBackingIndices, negations: closedNegations } = await resolveClosedIndexAdjustments(
      this.strategy.client,
      remoteIndexPatterns,
      this.logger
    );
    const effectiveRemoteIndexPatterns =
      openBackingIndices.length > 0 || closedNegations.length > 0
        ? [...remoteIndexPatterns, ...openBackingIndices, ...closedNegations]
        : remoteIndexPatterns;

    const state =
      windowOverride != null
        ? { checkpointTimestamp: null, paginationRecoveryId: null }
        : await this.strategy.stateClient.findOrInit(type);

    const {
      effectiveFromDateISO: resolvedFromDateISO,
      effectiveWindowEnd,
      recoveryId,
      isWindowOverride,
    } = resolveRemoteExtractionWindow({
      config: { lookbackPeriod, delay },
      state,
      windowOverride,
      logger: this.logger,
    });

    const effectiveFromDateISO = isWindowOverride
      ? resolvedFromDateISO
      : applyMaxLagCutoff({
          fromDateISO: resolvedFromDateISO,
          effectiveWindowEnd,
          lookbackPeriod,
          frequency,
          logger: this.logger,
        });

    if (effectiveFromDateISO >= effectiveWindowEnd) {
      this.logger.error(
        `extraction window is empty (from=${effectiveFromDateISO} >= to=${effectiveWindowEnd}), skipping`
      );
      return { count: 0, pages: 0 };
    }

    if (isWindowOverride) {
      // Manual windowOverride runs as a single pass without persisting checkpoint.
      const result = await this.runLogsPaginationOuterLoop({
        type,
        remoteIndexPatterns: effectiveRemoteIndexPatterns,
        toDateISO: effectiveWindowEnd,
        docsLimit,
        maxLogsPerPage,
        maxLogsPerWindow,
        entityDefinition,
        signal,
        effectiveFromDateISO,
        recoveryId,
        skipStateUpdates: true,
      });
      if (result.logsCapApplied) {
        entityStoreMetrics.extractionLogsCapApplied.add(1, {
          entity_type: type,
          namespace: this.namespace,
          behavior: maxLogsPerWindowCapBehavior,
          remote: true,
        });
        this.logger.warn(
          `${this.strategy.id.toUpperCase()} extraction volume cap reached for entity type "${type}" (manual run): processed ${
            result.logsProcessed
          } logs (limit: ${maxLogsPerWindow}). Cap behavior: "${maxLogsPerWindowCapBehavior}". Cursor is not persisted.`
        );
      }
      entityStoreMetrics.extractionLogsProcessed.record(result.logsProcessed ?? 0, {
        entity_type: type,
        namespace: this.namespace,
        remote: true,
      });
      return result;
    }

    let totalCount = 0;
    let totalPages = 0;
    let totalLogs = 0;
    let currentFromDateISO = effectiveFromDateISO;
    // Recovery applies only to the first sub-window. The inner outer-loop persists
    // `checkpointTimestamp` after every slice, so a crash mid-run resumes from the last
    // completed slice's end — no per-sub-window checkpoint write is needed.
    let recoveryIdForFirstSubWindow = recoveryId;

    let hasNextPage = true;
    while (hasNextPage) {
      if (signal?.aborted) {
        break;
      }
      if (currentFromDateISO >= effectiveWindowEnd) {
        break;
      }

      const { toDateISO: subWindowEnd, isCapped } = capExtractionWindowEnd({
        fromDateISO: currentFromDateISO,
        effectiveWindowEnd,
        maxTimeWindowSize,
        logger: this.logger,
      });

      // Pass remaining budget so the cap is tracked correctly across sub-windows.
      const remainingCap = maxLogsPerWindow > 0 ? maxLogsPerWindow - totalLogs : 0;
      const subResult = await this.runLogsPaginationOuterLoop({
        type,
        remoteIndexPatterns: effectiveRemoteIndexPatterns,
        toDateISO: subWindowEnd,
        docsLimit,
        maxLogsPerPage,
        maxLogsPerWindow: remainingCap,
        entityDefinition,
        signal,
        effectiveFromDateISO: currentFromDateISO,
        recoveryId: recoveryIdForFirstSubWindow,
        skipStateUpdates: false,
      });
      recoveryIdForFirstSubWindow = undefined;

      totalCount += subResult.count;
      totalPages += subResult.pages;
      totalLogs += subResult.logsProcessed ?? 0;

      if (subResult.logsCapApplied) {
        entityStoreMetrics.extractionLogsCapApplied.add(1, {
          entity_type: type,
          namespace: this.namespace,
          behavior: maxLogsPerWindowCapBehavior,
          remote: true,
        });
        entityStoreMetrics.extractionLogsProcessed.record(totalLogs, {
          entity_type: type,
          namespace: this.namespace,
          remote: true,
        });
        this.logger.warn(
          `${this.strategy.id.toUpperCase()} extraction volume cap reached for entity type "${type}": processed ${totalLogs} logs (limit: ${maxLogsPerWindow}). Cap behavior: "${maxLogsPerWindowCapBehavior}".`
        );
        if (maxLogsPerWindowCapBehavior === 'drop') {
          this.logger.warn(
            `Dropping remaining ${this.strategy.id} logs. Advancing checkpoint to end of window: ${effectiveWindowEnd}.`
          );
          await this.strategy.stateClient.update(type, {
            checkpointTimestamp: effectiveWindowEnd,
            paginationRecoveryId: null,
          });
        }
        return {
          count: totalCount,
          pages: totalPages,
          logsProcessed: totalLogs,
          logsCapApplied: true,
        };
      }

      // if the window was capped we consider we have a next page
      hasNextPage = isCapped;
      currentFromDateISO = subWindowEnd;
    }

    if (totalCount === 0) {
      await this.strategy.stateClient.clearRecoveryId(type);
    }

    entityStoreMetrics.extractionLogsProcessed.record(totalLogs, {
      entity_type: type,
      namespace: this.namespace,
      remote: true,
    });

    return { count: totalCount, pages: totalPages };
  }

  /**
   * Outer loop: advances through the time window one probe-capped log slice at a time.
   * Each iteration runs the probe to discover the slice boundary, then delegates entity
   * ingestion to the inner loop. Advances `effectiveFromDateISO` and persists the slice
   * boundary after each slice completes.
   */
  private async runLogsPaginationOuterLoop({
    type,
    remoteIndexPatterns,
    toDateISO,
    docsLimit,
    maxLogsPerPage,
    maxLogsPerWindow,
    entityDefinition,
    signal,
    effectiveFromDateISO: initialFromDateISO,
    recoveryId: initialRecoveryId,
    skipStateUpdates,
  }: {
    type: EntityType;
    remoteIndexPatterns: string[];
    toDateISO: string;
    docsLimit: number;
    maxLogsPerPage: number;
    maxLogsPerWindow: number;
    entityDefinition: ManagedEntityDefinition;
    signal?: AbortSignal;
    effectiveFromDateISO: string;
    recoveryId: string | undefined;
    skipStateUpdates: boolean;
  }): Promise<RemoteExtractToUpdatesResult> {
    const effectiveMaxLogsPerPage = capAtMaxLogsPerWindow(maxLogsPerPage, maxLogsPerWindow);
    const effectiveDocsLimit = capAtMaxLogsPerWindow(docsLimit, maxLogsPerWindow);
    // Escalates above the target probability (up to an exact, unsampled probe) once
    // maxLogsPerPage is too small for the sampling estimator to be accurate — see
    // pickSampleProbability. Computed once per loop invocation: effectiveMaxLogsPerPage is
    // fixed for the whole loop.
    const effectiveSampleProbability = pickSampleProbability(effectiveMaxLogsPerPage);
    let totalCount = 0;
    let totalPages = 0;
    let totalLogs = 0;

    const onAbort = () => {
      this.logger.info(
        `Aborting logs extraction, entities extracted until abort: ${totalCount}, in ${totalPages} pages`
      );
      entityStoreMetrics.extractionTaskAborted.add(1, {
        entity_type: type,
        namespace: this.namespace,
        remote: true,
      });
    };
    signal?.addEventListener('abort', onAbort);

    let effectiveFromDateISO = initialFromDateISO;
    let recoveryId = initialRecoveryId;
    let sliceStart: LogSlicePaginationParams | undefined;
    let isLastLogsPage = false;
    const destToSourceMap = this.buildDestToSourceMap(type, entityDefinition.fields);

    do {
      const logPaginationCursor = await this.runProbe({
        remoteIndexPatterns,
        type,
        fromDateISO: effectiveFromDateISO,
        toDateISO,
        sliceStart,
        maxLogsPerPage: effectiveMaxLogsPerPage,
        sampleProbability: effectiveSampleProbability,
        signal,
      });

      if (!logPaginationCursor.hasLogsToProcess && effectiveSampleProbability >= 1) {
        // Sampling wasn't active for this probe (maxLogsPerPage was too small — see
        // pickSampleProbability), so an empty, exact result is definitive: no real docs
        // remain. Stop immediately rather than running a redundant sweep extraction.
        break;
      }

      // A saturated probe (the scaled LIMIT was filled) means ~maxLogsPerPage+ real docs likely
      // remain: more pages follow, bounded by the sampled boundary. Otherwise — the sample fell
      // short of the limit, or retained zero rows at all (hasLogsToProcess: false) — fewer real
      // docs remain than maxLogsPerPage, so this is the last page. It is swept all the way to
      // the window top (not the undershooting/absent sampled boundary) so nothing past it is
      // silently dropped: a probe with zero sampled rows does not prove zero real docs remain
      // (e.g. a couple of docs, ~90% chance neither gets sampled at the default p=0.1).
      isLastLogsPage = logPaginationCursor.isLastLogsPage;
      let sliceEnd: LogSlicePaginationParams =
        logPaginationCursor.hasLogsToProcess && !logPaginationCursor.isLastLogsPage
          ? logPaginationCursor.logsPaginationCursor
          : { timestampCursor: toDateISO };

      const bumpedSliceEnd = this.detectLogSliceStall(
        sliceStart,
        sliceEnd,
        !isLastLogsPage,
        effectiveMaxLogsPerPage
      );
      if (bumpedSliceEnd) {
        sliceEnd = bumpedSliceEnd;
        entityStoreMetrics.extractionLogsPerPageDropped.add(1, {
          entity_type: type,
          namespace: this.namespace,
          remote: true,
        });
      } else {
        totalLogs += logPaginationCursor.sliceLogCount;

        // Recovery cursor is only used in the first slice; clear it after consumption
        const recoveryIdForThisSlice = recoveryId;
        recoveryId = undefined;

        const { count, pages } = await this.runEntitiesPaginationInnerLoop({
          type,
          remoteIndexPatterns,
          fromDateISO: effectiveFromDateISO,
          toDateISO,
          docsLimit: effectiveDocsLimit,
          entityDefinition,
          signal,
          sliceStart,
          sliceEnd,
          recoveryId: recoveryIdForThisSlice,
          skipStateUpdates,
          destToSourceMap,
        });

        totalCount += count;
        totalPages += pages;
      }

      // Advance the window: the completed slice end becomes the next slice start
      sliceStart = sliceEnd;
      effectiveFromDateISO = sliceEnd.timestampCursor;
      if (!skipStateUpdates) {
        await this.strategy.stateClient.update(type, {
          checkpointTimestamp: sliceEnd.timestampCursor,
          paginationRecoveryId: null,
        });
      }

      if (!bumpedSliceEnd && maxLogsPerWindow > 0 && totalLogs >= maxLogsPerWindow) {
        this.logger.info(
          `${this.strategy.id.toUpperCase()} entities extracted: ${totalCount}, logs processed: ${totalLogs}, in ${totalPages} pages`
        );
        return {
          count: totalCount,
          pages: totalPages,
          logsProcessed: totalLogs,
          logsCapApplied: true,
        };
      }
    } while (!isLastLogsPage);

    this.logger.info(
      `${this.strategy.id.toUpperCase()} entities extracted: ${totalCount}, logs processed: ${totalLogs}, in ${totalPages} pages`
    );

    return {
      count: totalCount,
      pages: totalPages,
      logsProcessed: totalLogs,
      logsCapApplied: false,
    };
  }

  /**
   * Runs the probe query to determine the inclusive upper boundary of the next log slice.
   * The probe uses `INLINE STATS count(*)` before `LIMIT maxLogsPerPage` to both cap the
   * slice and signal whether more slices remain (`isLastLogsPage`).
   */
  private async runProbe({
    remoteIndexPatterns,
    type,
    fromDateISO,
    toDateISO,
    sliceStart,
    maxLogsPerPage,
    sampleProbability,
    signal,
  }: {
    remoteIndexPatterns: string[];
    type: EntityType;
    fromDateISO: string;
    toDateISO: string;
    sliceStart: LogSlicePaginationParams | undefined;
    maxLogsPerPage: number;
    sampleProbability: number;
    signal?: AbortSignal;
  }): Promise<LogPaginationCursor> {
    const probeQuery = buildLogPaginationCursorProbeEsql({
      indexPatterns: remoteIndexPatterns,
      type,
      fromDateISO,
      toDateISO,
      logsPageCursorStart: sliceStart,
      maxLogsPerPage,
      sampleProbability,
    });

    this.logger.info(
      `${this.strategy.id} probe: from=${fromDateISO} to=${toDateISO}${
        sliceStart ? ` sliceStart=${sliceStart.timestampCursor}` : ''
      }`
    );

    const probeStart = Date.now();
    const probeResponse = await executeEsqlQuery({
      esClient: this.strategy.client,
      query: probeQuery,
      signal,
      telemetry: {
        name: 'remote_probe_query',
        namespace: this.namespace,
        type,
      },
    });
    entityStoreMetrics.extractionProbeQueryDurationMs.record(Date.now() - probeStart, {
      entity_type: type,
      namespace: this.namespace,
      remote: true,
    });

    return interpretLogPaginationCursorRows(
      parseLogPaginationCursorRow(probeResponse),
      maxLogsPerPage,
      sampleProbability
    );
  }

  /**
   * Inner loop: paginates through entity pages within a single log slice (bounded by
   * `sliceStart`/`sliceEnd`). Persists the entity cursor after each full page so a crash
   * mid-slice can be recovered on the next run.
   *
   * Recovery checkpoint: `checkpointTimestamp` is set to `entityPagination.timestampCursor` (the
   * `_firstSeenLog` of the last processed entity) and `paginationRecoveryId` to its ID. On
   * recovery the outer loop sets `effectiveFromDateISO = checkpointTimestamp`, which becomes the
   * `fromDateISO` argument to `buildPaginationSection`; the recovery WHERE clause is then
   * `_firstSeenLog > checkpointTimestamp OR (_firstSeenLog = checkpointTimestamp AND id > recoveryId)`,
   * which resumes exactly from the last cursor without re-processing earlier entities.
   */
  private async runEntitiesPaginationInnerLoop({
    type,
    remoteIndexPatterns,
    fromDateISO,
    toDateISO,
    docsLimit,
    entityDefinition,
    signal,
    sliceStart,
    sliceEnd,
    recoveryId: initialRecoveryId,
    skipStateUpdates,
    destToSourceMap,
  }: {
    type: EntityType;
    remoteIndexPatterns: string[];
    fromDateISO: string;
    toDateISO: string;
    docsLimit: number;
    entityDefinition: ManagedEntityDefinition;
    signal?: AbortSignal;
    sliceStart: LogSlicePaginationParams | undefined;
    sliceEnd: LogSlicePaginationParams;
    recoveryId: string | undefined;
    skipStateUpdates: boolean;
    destToSourceMap: Map<string, string>;
  }): Promise<{ count: number; pages: number }> {
    let count = 0;
    let pages = 0;

    // When recovering mid-slice, seed a dummy pagination so buildPaginationSection emits
    // the WHERE clause; recoveryId drives the actual cursor on the first page only.
    let entityPagination: PaginationParams | undefined = initialRecoveryId
      ? { timestampCursor: fromDateISO, idCursor: initialRecoveryId }
      : undefined;
    let recoveryId = initialRecoveryId;

    do {
      const query = buildRemoteLogsExtractionEsqlQuery({
        indexPatterns: remoteIndexPatterns,
        entityDefinition,
        fromDateISO,
        toDateISO,
        docsLimit,
        logsPageCursorStart: sliceStart,
        logsPageCursorEnd: sliceEnd,
        pagination: entityPagination,
        recoveryId,
      });
      recoveryId = undefined; // one-shot: used only on the first page of a recovered slice

      this.logger.info(
        `extraction from=${fromDateISO} to=${toDateISO} sliceEnd=${sliceEnd.timestampCursor}${
          entityPagination
            ? ` entityPagination=${entityPagination.timestampCursor}|${entityPagination.idCursor}`
            : ''
        }`
      );

      const queryStart = Date.now();
      const esqlResponse = await executeEsqlQuery({
        esClient: this.strategy.client,
        query,
        signal,
        telemetry: {
          name: 'remote_extraction_query',
          namespace: this.namespace,
          type,
        },
      });
      entityStoreMetrics.extractionQueryDurationMs.record(Date.now() - queryStart, {
        entity_type: type,
        namespace: this.namespace,
        remote: true,
      });

      count += esqlResponse.values.length;
      entityPagination = extractRemotePaginationParams(esqlResponse, docsLimit);

      if (esqlResponse.values.length > 0) {
        pages++;
        entityStoreMetrics.extractionEntitiesUpserted.add(esqlResponse.values.length, {
          entity_type: type,
          namespace: this.namespace,
          remote: true,
        });
        const ingestStart = Date.now();
        await ingestEntities({
          esClient: this.strategy.client,
          esqlResponse,
          targetIndex: getUpdatesEntitiesDataStreamName(this.namespace),
          logger: this.logger,
          signal,
          fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
          transformDocument: this.buildTransformDocument(type, destToSourceMap),
          refresh: false,
          onDropped: () =>
            entityStoreMetrics.extractionBulkDropped.add(1, {
              entity_type: type,
              namespace: this.namespace,
              remote: true,
            }),
        });
        entityStoreMetrics.extractionIngestDurationMs.record(Date.now() - ingestStart, {
          entity_type: type,
          namespace: this.namespace,
          remote: true,
        });
      }

      if (entityPagination && !skipStateUpdates) {
        await this.strategy.stateClient.update(type, {
          checkpointTimestamp: entityPagination.timestampCursor,
          paginationRecoveryId: entityPagination.idCursor,
        });
      }
    } while (entityPagination);

    return { count, pages };
  }

  /**
   * Returns the bumped slice-end cursor when a stall is detected, null otherwise. Logs a
   * warning on stall. `isFullPage` is `true` when the (possibly sampled) probe saturated its
   * limit — i.e. this iteration was not resolved as the last page.
   */
  private detectLogSliceStall(
    sliceStart: LogSlicePaginationParams | undefined,
    sliceEnd: LogSlicePaginationParams,
    isFullPage: boolean,
    effectiveMaxLogsPerPage: number
  ): LogSlicePaginationParams | null {
    if (sliceStart && sliceStart.timestampCursor === sliceEnd.timestampCursor && isFullPage) {
      const bumpedTs = moment(sliceEnd.timestampCursor).add(1, 'ms').toISOString();
      this.logger.warn(
        `${this.strategy.id.toUpperCase()} log-slice probe stalled at ${
          sliceEnd.timestampCursor
        } with a saturated page; advancing cursor by 1ms. Docs sharing this timestamp beyond the configured per-page limit (${effectiveMaxLogsPerPage}) will be dropped.`
      );
      return { timestampCursor: bumpedTs };
    }
    return null;
  }

  /**
   * Returns a document transformer that rewrites `@timestamp` to a synthetic value
   * just past now, incrementing by 1ms per doc, so the next local extraction run
   * picks up these updates in the correct order. This is bounded by the `delay`
   * configured on the main extraction.
   */
  /**
   * Builds a map from destination path → entity-relative source path for asymmetric fields.
   * The remote ESQL result uses destination paths as column names (e.g.
   * "entity.relationships.administers.raw_identifiers.host.id"), but the main extraction
   * query reads the updates data stream using source paths
   * (e.g. "host.entity.relationships.administers.host.id"). For symmetric fields the
   * re-nesting step in transformDocForUpsert already produces the right result; only
   * asymmetric fields (where destination ≠ "entity.<source-suffix>") need remapping.
   * Computed once per extraction run and reused across all slices and pages.
   */
  private buildDestToSourceMap(type: EntityType, fields: EntityField[]): Map<string, string> {
    const entityPrefix = `${type}.entity.`;
    const destToEntityRelativeSource = new Map<string, string>();
    for (const field of fields) {
      if (field.retention.operation === 'managed') continue;
      if (!field.source.startsWith(entityPrefix)) continue;
      // Self-identifier fields (e.g. `host.entity.id`) share source and destination and need no
      // remap; remapping them to `entity.id` would collide with the EUID (`entity.id`) column.
      if (field.destination === field.source) continue;
      const entityRelativeSource = `entity.${field.source.slice(entityPrefix.length)}`;
      if (entityRelativeSource !== field.destination) {
        destToEntityRelativeSource.set(field.destination, entityRelativeSource);
      }
    }
    return destToEntityRelativeSource;
  }

  /**
   * Returns a document transformer that rewrites `@timestamp` to a synthetic value
   * just past now, incrementing by 1ms per doc, so the next local extraction run
   * picks up these updates in the correct order. This is bounded by the `delay`
   * configured on the main extraction.
   * Called once per page so that `timestampIncrement` resets to 0 for each batch,
   * keeping synthetic timestamps close to real time.
   */
  private buildTransformDocument(type: EntityType, destToSourceMap: Map<string, string>) {
    let timestampIncrement = 0;
    return (doc: Record<string, unknown>) => {
      timestampIncrement++;
      const timestamp = moment().utc().add(timestampIncrement, 'ms').toISOString();
      return this.transformDocForUpsert(type, doc, timestamp, destToSourceMap);
    };
  }

  private transformDocForUpsert(
    type: EntityType,
    data: Partial<Entity>,
    timestamp: string,
    destToEntityRelativeSource: Map<string, string> = new Map()
  ): Record<string, unknown> {
    // Remap asymmetric field destination paths to their entity-relative source paths before
    // unflattening, so the updates doc matches what the main ESQL query reads.
    const remapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      remapped[destToEntityRelativeSource.get(key) ?? key] = value;
    }

    const doc: Record<string, unknown> = unflattenObject({
      ...remapped,
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
}
