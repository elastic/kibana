/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { StorageIndexAdapter, types, type IndexStorageSettings } from '@kbn/storage-adapter';
import type { TrackingRecord } from './types';

/**
 * Mapping changes must stay additive: Kibana versions share the index during rolling upgrades and
 * the adapter applies changes in place. The proposal and the resolved ref are stored, not indexed.
 */
const trackingStorageSettings = {
  name: '.kibana-nightshift-alert-outcomes',
  schema: {
    properties: {
      investigation_id: types.keyword({}),
      space_id: types.keyword({}),
      automation_id: types.keyword({}),
      subject_type: types.keyword({}),
      post_received_at: types.date({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      state: types.keyword({}),
      untrackable_reason: types.keyword({}),
      untrackable_detail: types.keyword({ index: false }),
      stop_reason: types.keyword({}),
      source: types.keyword({}),
      connector_id: types.keyword({}),
      proposal: types.object({ enabled: false }),
      ref: types.object({ enabled: false }),
      last_status: types.keyword({}),
      last_checked_at: types.date({}),
      last_firing_at: types.date({}),
      next_check_at: types.date({}),
      consecutive_failures: types.long({}),
      recovered_seen_at: types.date({}),
      recovering_since: types.date({}),
      recovery_execution_id: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

type TrackingStorageSettings = typeof trackingStorageSettings;

export interface StoredTrackingRecord {
  record: TrackingRecord;
  seqNo: number;
  primaryTerm: number;
}

const isConflict = (error: unknown) => isResponseError(error) && error.statusCode === 409;

/**
 * Tracking records, one per investigation and keyed by its id, so a retried write is idempotent.
 * Runs as Kibana's internal user: every read and write is scoped to a space here, in code.
 */
export class AlertOutcomeTrackingStore {
  private readonly adapter: StorageIndexAdapter<TrackingStorageSettings, TrackingRecord>;

  constructor(esClient: ElasticsearchClient, logger: Logger) {
    this.adapter = new StorageIndexAdapter<TrackingStorageSettings, TrackingRecord>(
      esClient,
      logger,
      trackingStorageSettings
    );
  }

  /** Writes the record unless the investigation already has one; resolves to whether it wrote. */
  async create(record: TrackingRecord): Promise<boolean> {
    try {
      await this.adapter.getClient().index({
        id: record.investigation_id,
        document: record,
        op_type: 'create',
      });
      return true;
    } catch (error) {
      if (isConflict(error)) return false;
      throw error;
    }
  }

  async get(spaceId: string, investigationId: string): Promise<StoredTrackingRecord | undefined> {
    const [hit] = await this.search(spaceId, [{ term: { _id: investigationId } }], 1);
    return hit;
  }

  /** Tracking records whose next check is due, oldest first, so a cut-short run resumes fairly. */
  findDue({
    spaceId,
    now,
    size,
  }: {
    spaceId: string;
    now: string;
    size: number;
  }): Promise<StoredTrackingRecord[]> {
    return this.search(
      spaceId,
      [{ term: { state: 'tracking' } }, { range: { next_check_at: { lte: now } } }],
      size,
      [{ next_check_at: { order: 'asc' } }]
    );
  }

  /** Claimed recoveries that never recorded a round since `before`, which a crash can leave. */
  findStuckRecovering({
    spaceId,
    before,
    size,
  }: {
    spaceId: string;
    before: string;
    size: number;
  }): Promise<StoredTrackingRecord[]> {
    return this.search(
      spaceId,
      [{ term: { state: 'recovering' } }, { range: { recovering_since: { lte: before } } }],
      size,
      [{ recovering_since: { order: 'asc' } }],
      [{ exists: { field: 'recovery_execution_id' } }]
    );
  }

  /**
   * Applies `patch` only if nobody wrote the record since it was read. Resolves to the new stored
   * record, or undefined when another writer got there first.
   */
  async update(
    stored: StoredTrackingRecord,
    patch: Partial<TrackingRecord>
  ): Promise<StoredTrackingRecord | undefined> {
    const record: TrackingRecord = { ...stored.record, ...patch };
    try {
      const response = await this.adapter.getClient().index({
        id: record.investigation_id,
        document: record,
        if_seq_no: stored.seqNo,
        if_primary_term: stored.primaryTerm,
      });
      if (response._seq_no === undefined || response._primary_term === undefined) {
        throw new Error('The tracking record write returned no sequence number');
      }
      return { record, seqNo: response._seq_no, primaryTerm: response._primary_term };
    } catch (error) {
      if (isConflict(error)) return undefined;
      throw error;
    }
  }

  private async search(
    spaceId: string,
    filter: estypes.QueryDslQueryContainer[],
    size: number,
    sort?: estypes.Sort,
    mustNot?: estypes.QueryDslQueryContainer[]
  ): Promise<StoredTrackingRecord[]> {
    const response = await this.adapter.getClient().search({
      track_total_hits: false,
      size,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [{ term: { space_id: spaceId } }, ...filter],
          ...(mustNot ? { must_not: mustNot } : {}),
        },
      },
      ...(sort ? { sort } : {}),
    });
    return response.hits.hits.flatMap((hit) =>
      hit._source && hit._seq_no !== undefined && hit._primary_term !== undefined
        ? [{ record: hit._source, seqNo: hit._seq_no, primaryTerm: hit._primary_term }]
        : []
    );
  }
}
