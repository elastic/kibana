/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/core-data-streams-server';
import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
  throwOnBulkCreateErrors,
} from '../query_utils';
import {
  andWhere,
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
  runFindByIdsEsqlQuery,
  runGetProcessedMarkers,
  runFindSkippedDetectionIds,
} from '../latest_source_query';
import {
  DETECTIONS_DATA_STREAM,
  type Detection,
  type StoredDetection,
  type detectionsMappings,
} from './data_stream';
import { FIELD_DETECTION_ID, FIELD_RULE_UUID } from '../field_names';

export type DetectionDataStreamClient = IDataStreamClient<
  typeof detectionsMappings,
  StoredDetection
>;

// _source holds all stored fields; `processed` is derived at query time, not stored.
// Using Omit<Detection, 'processed'> avoids the string | string[] widening from GetFieldsOf.
type RawDetection = Omit<Detection, 'processed'>;

export interface DetectionsSearchOptions extends CommonSearchOptions {
  rule_uuid?: string[];
  rule_name?: string;
}

export interface DetectionsPaginatedSearchOptions extends PaginatedSearchOptions {
  rule_uuid?: string[];
  rule_name?: string;
}

const PROCESSED_MARKER_CHUNK_SIZE = 250;

// Page size and write batch size of the sweep that marks a deleted source's detections processed.
const SOURCE_SWEEP_PAGE_SIZE = 1000;

// Row cap of one history read, the ES|QL maximum.
const ESQL_MAX_ROWS = 10_000;

// Cap the per-rule detection history (flyout timeline) to the most recent N transitions so a churny
// rule doesn't produce an unbounded scroll.
const DETECTION_HISTORY_LIMIT = 20;

// Cap on the skipped detections one event's lifecycle shows.
const SKIPPED_PER_EVENT_LIMIT = 1000;

// Detections carry `change_point_type`; processed markers carry `processed_by` instead.
// Every detection read filters on this so marker docs never surface as detections.
const detectionFilter = (): ESQLAstExpression =>
  esql.exp`${esql.col('change_point_type')} IS NOT NULL`;

export class DetectionClient {
  constructor(
    private readonly clients: {
      dataStreamClient: Pick<DetectionDataStreamClient, 'create'>;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  // Detection reads group the latest revision per rule (rule_uuid), not per detection id —
  // detection_id is now unique-per-detection, so grouping by it would never collapse.
  private buildWhere(options: DetectionsSearchOptions): ESQLAstExpression {
    let where: ESQLAstExpression = detectionFilter();

    const ruleUuidLiterals = options.rule_uuid?.map((ruleUuid) => esql.str(ruleUuid));
    if (ruleUuidLiterals?.length) {
      where = andWhere(where, esql.exp`${esql.col('rule_uuid')} IN (${ruleUuidLiterals})`);
    }

    if (options.rule_name) {
      where = andWhere(where, esql.exp`${esql.col('rule_name')} == ${esql.str(options.rule_name)}`);
    }

    return where;
  }

  // `processed` is derived: a detection is processed iff a marker references its exact id.
  private async getProcessedMarkers(detectionIds: string[]) {
    return runGetProcessedMarkers({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      idValues: detectionIds,
      chunkSize: PROCESSED_MARKER_CHUNK_SIZE,
    });
  }

  /** Appends detections and markers through the Core data stream client, which writes as `kibana_system`. */
  async bulkCreate(documents: StoredDetection[]): Promise<void> {
    if (documents.length === 0) {
      return;
    }
    const response = await this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents,
    });
    throwOnBulkCreateErrors(response);
  }

  async findById(detectionId: string): Promise<{ hits: Detection[] }> {
    const { hits } = await runFindByIdEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      idValue: detectionId,
      where: detectionFilter(),
    });
    return { hits: await this.withDerivedProcessed(hits) };
  }

  async findByIds(detectionIds: string[]): Promise<{ hits: Detection[] }> {
    const { hits } = await runFindByIdsEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      idValues: detectionIds,
      where: detectionFilter(),
      limit: detectionIds.length,
    });
    return { hits: await this.withDerivedProcessed(hits) };
  }

  // A rule's change-point timeline: every detection for the rule, oldest→newest. Keyed on
  // rule_uuid (not detection_id) because detection_id is unique per detection — the list
  // collapses to the latest per rule, and the flyout expands the full history here.
  async findHistoryByRuleUuid(ruleUuid: string): Promise<{ hits: Detection[] }> {
    const { hits } = await runFindByIdEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_RULE_UUID,
      idValue: ruleUuid,
      where: detectionFilter(),
      // Most recent N transitions, returned chronologically (oldest→newest of that window).
      limit: DETECTION_HISTORY_LIMIT,
    });
    return { hits: await this.withDerivedProcessed(hits) };
  }

  /**
   * The detections the classifier closed on the strength of the given event, oldest→newest: the
   * newest SKIPPED_PER_EVENT_LIMIT of them, with `truncated` set when there are more. A detection
   * whose latest marker no longer carries that skip is left out.
   */
  async findSkippedForEvent(eventId: string): Promise<{ hits: Detection[]; truncated: boolean }> {
    const { ids, truncated } = await runFindSkippedDetectionIds({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      eventId,
      limit: SKIPPED_PER_EVENT_LIMIT,
    });
    const { hits: rawHits } = await runFindByIdsEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: DETECTIONS_DATA_STREAM,
      idField: FIELD_DETECTION_ID,
      idValues: ids,
      where: detectionFilter(),
      limit: ids.length,
    });
    const hits = await this.withDerivedProcessed(rawHits);
    return { hits: hits.filter((hit) => hit.skip?.event_id === eventId), truncated };
  }

  async findLatest(options: DetectionsSearchOptions = {}): Promise<{ hits: Detection[] }> {
    const result = await runLatestSourceEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: FIELD_RULE_UUID,
    });
    return { hits: await this.withDerivedProcessed(result.hits) };
  }

  async findLatestPaginated(
    options: DetectionsPaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<Detection>> {
    const result = await runPaginatedLatestSourceEsqlQuery<RawDetection>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: DETECTIONS_DATA_STREAM,
      where: this.buildWhere(options),
      groupBy: FIELD_RULE_UUID,
      sort: [['@timestamp', 'DESC']],
    });

    return { ...result, hits: await this.withDerivedProcessed(result.hits) };
  }

  /**
   * Marks every unprocessed detection of a source as processed, and returns how many it marked.
   * A deleted source leaves its detections behind, and the discovery batch keeps offering them, so
   * the agent writes events for a source that no longer exists. A rule can hold several
   * unprocessed detections, and discovery falls back to the next one when the newest is processed,
   * so the whole history of each rule is marked, not only its latest detection.
   *
   * `source_id` is stored but not mapped, so it cannot be filtered in the query: the latest
   * detection of every rule is read to find the source's rules, then their histories are read.
   */
  async markSourceDetectionsProcessed({
    sourceId,
    processedBy,
    historyPageSize = ESQL_MAX_ROWS,
  }: {
    sourceId: string;
    processedBy: string;
    /** Rows of a rule's history read per query. Defaults to the ES|QL maximum. */
    historyPageSize?: number;
  }): Promise<number> {
    const ruleUuids = new Set<string>();
    for (let page = 1; ; page++) {
      const result = await this.findLatestPaginated({ page, perPage: SOURCE_SWEEP_PAGE_SIZE });
      for (const detection of result.hits) {
        if (detection.source_id === sourceId && detection.rule_uuid) {
          ruleUuids.add(detection.rule_uuid);
        }
      }
      if (page * SOURCE_SWEEP_PAGE_SIZE >= result.total) {
        break;
      }
    }

    const detectionIdSet = new Set<string>();
    for (const ruleUuid of ruleUuids) {
      await this.collectUnprocessedHistory({
        ruleUuid,
        sourceId,
        pageSize: historyPageSize,
        into: detectionIdSet,
      });
    }
    const detectionIds = [...detectionIdSet];

    const timestamp = new Date().toISOString();
    for (let start = 0; start < detectionIds.length; start += SOURCE_SWEEP_PAGE_SIZE) {
      await this.bulkCreate(
        detectionIds.slice(start, start + SOURCE_SWEEP_PAGE_SIZE).map((detectionId) => ({
          '@timestamp': timestamp,
          detection_id: detectionId,
          processed_by: processedBy,
        }))
      );
    }
    return detectionIds.length;
  }

  /**
   * Adds the ids of a rule's unprocessed detections of the source to `into`, reading its history
   * oldest to newest in pages. A page starts at the last timestamp seen, so rows sharing it appear
   * twice and the set dedupes them. It stops on a short page, or on one that brings no new row,
   * which also ends a page made only of rows with one timestamp.
   */
  private async collectUnprocessedHistory({
    ruleUuid,
    sourceId,
    pageSize,
    into,
  }: {
    ruleUuid: string;
    sourceId: string;
    pageSize: number;
    into: Set<string>;
  }): Promise<void> {
    const seen = new Set<string>();
    let after: string | undefined;
    for (;;) {
      const { hits } = await runFindByIdsEsqlQuery<RawDetection>({
        esClient: this.clients.esClient,
        space: this.clients.space,
        index: DETECTIONS_DATA_STREAM,
        idField: FIELD_RULE_UUID,
        idValues: [ruleUuid],
        where:
          after === undefined
            ? detectionFilter()
            : andWhere(
                detectionFilter(),
                esql.exp`${esql.col('@timestamp')} >= TO_DATETIME(${esql.str(after)})`
              ),
        limit: pageSize,
      });

      const unseen = hits.filter(({ detection_id: id }) => id !== undefined && !seen.has(id));
      unseen.forEach(({ detection_id: id }) => seen.add(id as string));
      for (const detection of await this.withDerivedProcessed(unseen)) {
        if (detection.source_id === sourceId && !detection.processed && detection.detection_id) {
          into.add(detection.detection_id);
        }
      }

      const last = hits.at(-1);
      if (hits.length < pageSize || unseen.length === 0 || last === undefined) {
        return;
      }
      after = last['@timestamp'];
    }
  }

  private async withDerivedProcessed(rawHits: RawDetection[]): Promise<Detection[]> {
    const markers = await this.getProcessedMarkers(
      rawHits.map((h) => h.detection_id).filter((id): id is string => Boolean(id))
    );
    return rawHits.map((raw) => {
      const marker = markers.get(raw.detection_id ?? '');
      return {
        ...raw,
        processed: marker !== undefined,
        ...(marker?.skip ? { skip: { ...marker.skip, checked_at: marker.processedAt } } : {}),
      } as Detection;
    });
  }
}
