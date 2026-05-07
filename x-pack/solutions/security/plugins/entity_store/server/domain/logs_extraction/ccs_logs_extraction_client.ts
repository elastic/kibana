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
import {
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  type PaginationParams,
} from './query_builder_commons';
import {
  buildCcsLogsExtractionEsqlQuery,
  extractCcsPaginationParams,
} from './ccs_logs_extraction_query_builder';
import {
  buildLogPaginationCursorProbeEsql,
  interpretLogPaginationCursorRows,
  parseLogPaginationCursorRow,
  type LogPaginationCursor,
} from './log_pagination_probe_query_builder';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { ingestEntities } from '../../infra/elasticsearch/ingest';
import { getUpdatesEntitiesDataStreamName } from '../asset_manager/updates_data_stream';
import type { CcsLogExtractionStateClient } from '../saved_objects/ccs_log_extraction_state';
import { capExtractionWindowEnd, resolveCcsExtractionWindow } from './extraction_window';

interface CcsExtractToUpdatesParams {
  type: EntityType;
  remoteIndexPatterns: string[];
  docsLimit: number;
  maxLogsPerPage: number;
  lookbackPeriod: string;
  delay: string;
  entityDefinition: ManagedEntityDefinition;
  abortController?: AbortController;
  /** Explicit time window override (API calls). When set, the internal checkpoint is not updated. */
  windowOverride?: { fromDateISO: string; toDateISO: string };
  /** Cap each scheduled sub-window to this duration to bound probe cost in lagging environments. */
  maxTimeWindowSize: string;
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
    private readonly namespace: string,
    private readonly ccsStateClient: CcsLogExtractionStateClient
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
    docsLimit,
    maxLogsPerPage,
    lookbackPeriod,
    delay,
    entityDefinition,
    abortController,
    windowOverride,
    maxTimeWindowSize,
  }: CcsExtractToUpdatesParams): Promise<CcsExtractToUpdatesResult> {
    const ccsState =
      windowOverride != null
        ? { checkpointTimestamp: null, paginationRecoveryId: null }
        : await this.ccsStateClient.findOrInit(type);

    const { effectiveFromDateISO, effectiveWindowEnd, recoveryId, isWindowOverride } =
      resolveCcsExtractionWindow({
        config: { lookbackPeriod, delay },
        ccsState,
        windowOverride,
        logger: this.logger,
      });

    if (effectiveFromDateISO >= effectiveWindowEnd) {
      this.logger.error(
        `CCS extraction window is empty (from=${effectiveFromDateISO} >= to=${effectiveWindowEnd}), skipping`
      );
      return { count: 0, pages: 0 };
    }

    if (isWindowOverride) {
      // Manual `windowOverride` runs bypass the cap and run as a single pass.
      const result = await this.runLogsPaginationOuterLoop({
        type,
        remoteIndexPatterns,
        toDateISO: effectiveWindowEnd,
        docsLimit,
        maxLogsPerPage,
        entityDefinition,
        abortController,
        effectiveFromDateISO,
        recoveryId,
        skipStateUpdates: true,
      });
      return result;
    }

    let totalCount = 0;
    let totalPages = 0;
    let currentFromDateISO = effectiveFromDateISO;
    // Recovery applies only to the first sub-window. The inner outer-loop persists
    // `checkpointTimestamp` after every slice, so a crash mid-run resumes from the last
    // completed slice's end — no per-sub-window checkpoint write is needed.
    let recoveryIdForFirstSubWindow = recoveryId;

    let hasNextPage = true;
    while (hasNextPage) {
      if (abortController?.signal.aborted) {
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

      const subResult = await this.runLogsPaginationOuterLoop({
        type,
        remoteIndexPatterns,
        toDateISO: subWindowEnd,
        docsLimit,
        maxLogsPerPage,
        entityDefinition,
        abortController,
        effectiveFromDateISO: currentFromDateISO,
        recoveryId: recoveryIdForFirstSubWindow,
        skipStateUpdates: false,
      });
      recoveryIdForFirstSubWindow = undefined;

      totalCount += subResult.count;
      totalPages += subResult.pages;

      // if the window was capped we consider we have a next page
      hasNextPage = isCapped;
      currentFromDateISO = subWindowEnd;
    }

    if (totalCount === 0) {
      await this.ccsStateClient.clearRecoveryId(type);
    }

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
    entityDefinition,
    abortController,
    effectiveFromDateISO: initialFromDateISO,
    recoveryId: initialRecoveryId,
    skipStateUpdates,
  }: {
    type: EntityType;
    remoteIndexPatterns: string[];
    toDateISO: string;
    docsLimit: number;
    maxLogsPerPage: number;
    entityDefinition: ManagedEntityDefinition;
    abortController?: AbortController;
    effectiveFromDateISO: string;
    recoveryId: string | undefined;
    skipStateUpdates: boolean;
  }): Promise<CcsExtractToUpdatesResult> {
    let totalCount = 0;
    let totalPages = 0;

    const onAbort = () => {
      this.logger.info(
        `Aborting CCS logs extraction, CCS entities extracted until abort: ${totalCount}, in ${totalPages} pages`
      );
    };
    abortController?.signal.addEventListener('abort', onAbort);

    let effectiveFromDateISO = initialFromDateISO;
    let recoveryId = initialRecoveryId;
    let sliceStart: PaginationParams | undefined;

    let isLastLogsPage = false;

    do {
      const logPaginationCursor = await this.runProbe({
        remoteIndexPatterns,
        type,
        fromDateISO: effectiveFromDateISO,
        toDateISO,
        sliceStart,
        maxLogsPerPage,
        abortController,
      });

      if (!logPaginationCursor.hasLogsToProcess) {
        break;
      }

      const { logsPaginationCursor: sliceEnd } = logPaginationCursor;
      isLastLogsPage = logPaginationCursor.isLastLogsPage;

      // Recovery cursor is only used in the first slice; clear it after consumption
      const recoveryIdForThisSlice = recoveryId;
      recoveryId = undefined;

      const { count, pages } = await this.runEntitiesPaginationInnerLoop({
        type,
        remoteIndexPatterns,
        fromDateISO: effectiveFromDateISO,
        toDateISO,
        docsLimit,
        entityDefinition,
        abortController,
        sliceStart,
        sliceEnd,
        recoveryId: recoveryIdForThisSlice,
        skipStateUpdates,
      });

      totalCount += count;
      totalPages += pages;

      // Advance the window: the completed slice end becomes the next slice start
      sliceStart = sliceEnd;
      effectiveFromDateISO = sliceEnd.timestampCursor;
      if (!skipStateUpdates) {
        await this.ccsStateClient.update(type, {
          checkpointTimestamp: sliceEnd.timestampCursor,
          paginationRecoveryId: null,
        });
      }
    } while (!isLastLogsPage);

    this.logger.info(`CCS entities extracted: ${totalCount}, in ${totalPages} pages`);

    return { count: totalCount, pages: totalPages };
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
    abortController,
  }: {
    remoteIndexPatterns: string[];
    type: EntityType;
    fromDateISO: string;
    toDateISO: string;
    sliceStart: PaginationParams | undefined;
    maxLogsPerPage: number;
    abortController?: AbortController;
  }): Promise<LogPaginationCursor> {
    const probeQuery =
      `SET unmapped_fields="nullify";\n` +
      buildLogPaginationCursorProbeEsql({
        indexPatterns: remoteIndexPatterns,
        type,
        fromDateISO,
        toDateISO,
        logsPageCursorStart: sliceStart,
        maxLogsPerPage,
      });

    this.logger.info(
      `CCS probe: from=${fromDateISO} to=${toDateISO}${
        sliceStart ? ` sliceStart=${sliceStart.timestampCursor}` : ''
      }`
    );

    const probeResponse = await executeEsqlQuery({
      esClient: this.esClient,
      query: probeQuery,
      abortController,
    });

    return interpretLogPaginationCursorRows(
      parseLogPaginationCursorRow(probeResponse),
      maxLogsPerPage
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
    abortController,
    sliceStart,
    sliceEnd,
    recoveryId: initialRecoveryId,
    skipStateUpdates,
  }: {
    type: EntityType;
    remoteIndexPatterns: string[];
    fromDateISO: string;
    toDateISO: string;
    docsLimit: number;
    entityDefinition: ManagedEntityDefinition;
    abortController?: AbortController;
    sliceStart: PaginationParams | undefined;
    sliceEnd: PaginationParams;
    recoveryId: string | undefined;
    skipStateUpdates: boolean;
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
      const query = buildCcsLogsExtractionEsqlQuery({
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
        `CCS extraction from=${fromDateISO} to=${toDateISO} sliceEnd=${sliceEnd.timestampCursor}${
          entityPagination
            ? ` entityPagination=${entityPagination.timestampCursor}|${entityPagination.idCursor}`
            : ''
        }`
      );

      const esqlResponse = await executeEsqlQuery({
        esClient: this.esClient,
        query,
        abortController,
      });

      count += esqlResponse.values.length;
      entityPagination = extractCcsPaginationParams(esqlResponse, docsLimit);

      if (esqlResponse.values.length > 0) {
        pages++;
        await ingestEntities({
          esClient: this.esClient,
          esqlResponse,
          targetIndex: getUpdatesEntitiesDataStreamName(this.namespace),
          logger: this.logger,
          abortController,
          fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
          transformDocument: this.buildTransformDocument(type),
        });
      }

      if (entityPagination && !skipStateUpdates) {
        await this.ccsStateClient.update(type, {
          checkpointTimestamp: entityPagination.timestampCursor,
          paginationRecoveryId: entityPagination.idCursor,
        });
      }
    } while (entityPagination);

    return { count, pages };
  }

  /**
   * Returns a document transformer that rewrites `@timestamp` to a synthetic value
   * just of now, incrementing by 1ms per doc, so the next local extraction
   * run picks up CCS-written updates in the correct order.
   * This should be picked up in time because of the delay implemented in the main extraction
   */
  private buildTransformDocument(type: EntityType) {
    let timestampIncrement = 1;
    return (doc: Record<string, unknown>) => {
      timestampIncrement++;
      const timestamp = moment().utc().add(timestampIncrement, 'ms').toISOString();
      return this.transformDocForCcsUpsert(type, doc, timestamp);
    };
  }

  private transformDocForCcsUpsert(
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
}
