/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { omit } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  BRIEF_JOB_DEADLINE_MS,
  BRIEF_RETENTION_MS,
  EXECUTIVE_BRIEF_INDEX,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefJob,
  BriefMetadata,
  BriefReport,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { GetExecutiveBriefResponse } from '../../../../../common/api/entity_analytics/executive_brief/get.gen';
import { BriefStoreConflictError } from './errors';
import type { BriefDocument, BriefStorageClient } from './storage';

const MAX_WRITE_ATTEMPTS = 3;

/** Identifies the caller's brief in a space. */
export interface BriefKey {
  ownerId: string;
  spaceId: string;
}

/** A change to a job; a `metadata` (only on success) restarts the retention period. */
export interface JobUpdate {
  job: Partial<Pick<BriefJob, 'status' | 'stage' | 'error'>>;
  report?: BriefReport;
  metadata?: BriefMetadata;
}

interface StoredBrief {
  document: BriefDocument;
  seqNo: number;
  primaryTerm: number;
}

/** One document per owner and space, so reads and writes go by id. */
const getBriefDocId = ({ ownerId, spaceId }: BriefKey): string =>
  createHash('sha256').update(`${ownerId}:${spaceId}`).digest('hex');

const isInFlight = ({ status }: Pick<BriefJob, 'status'>): boolean =>
  status === 'pending' || status === 'running';

const hasStatusCode = (error: unknown, statusCode: number): boolean =>
  isResponseError(error) && error.statusCode === statusCode;

const addRetention = (iso: string): string =>
  new Date(Date.parse(iso) + BRIEF_RETENTION_MS).toISOString();

/** An in-flight job past its deadline stopped without finishing (e.g. a restart). */
const overdueAsInterrupted = (job: BriefJob, now: number): BriefJob =>
  isInFlight(job) && now - Date.parse(job.startedAt) > BRIEF_JOB_DEADLINE_MS
    ? {
        ...omit(job, 'stage'),
        status: 'failed',
        took: Date.parse(job.updatedAt) - Date.parse(job.startedAt),
        error: {
          code: 'interrupted',
          message: 'The brief generation stopped before finishing. Generate it again.',
        },
      }
    : job;

/**
 * Owner-scoped access to brief documents. Starting a job replaces any job in progress. Job updates
 * are conditional on the stored `job.id` and use `if_seq_no`/`if_primary_term`, so a replaced or
 * deleted job stops at its next write and never overwrites a newer one.
 */
export class BriefStore {
  constructor(
    private readonly storageClient: BriefStorageClient,
    /** Internal user client, only for the cleanup delete-by-query. */
    private readonly esClient: ElasticsearchClient,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** The caller's unexpired brief as GET returns it (an overdue job reads as interrupted). */
  async get(key: BriefKey): Promise<GetExecutiveBriefResponse | undefined> {
    const document = await this.readOwned(key);
    if (!document) {
      return undefined;
    }
    const { job, report, metadata, expiresAt } = document;
    return { job: overdueAsInterrupted(job, this.now().getTime()), report, metadata, expiresAt };
  }

  /** The job of the caller's unexpired brief, without reading the report. */
  async getJob(key: BriefKey): Promise<BriefJob | undefined> {
    const document = await this.readOwned(key, ['owner', 'spaceId', 'job', 'expiresAt']);
    return document && overdueAsInterrupted(document.job, this.now().getTime());
  }

  /** Starts a pending job, keeping the previous unexpired report and replacing any job in progress. */
  async startJob(key: BriefKey, jobId: string): Promise<{ docId: string; job: BriefJob }> {
    const docId = getBriefDocId(key);
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
      const existing = await this.read(docId);
      const now = this.now();
      const startedAt = now.toISOString();
      const previous =
        existing?.document.report && Date.parse(existing.document.expiresAt) > now.getTime()
          ? existing.document
          : undefined;
      const document: BriefDocument = {
        owner: { id: key.ownerId },
        spaceId: key.spaceId,
        schemaVersion: 1,
        job: { id: jobId, status: 'pending', startedAt, updatedAt: startedAt },
        ...(previous ? { report: previous.report, metadata: previous.metadata } : {}),
        expiresAt: previous?.expiresAt ?? addRetention(startedAt),
      };
      if (await this.write(docId, document, existing)) {
        return { docId, job: document.job };
      }
    }
    throw new BriefStoreConflictError('Another request is starting a brief; try again shortly.');
  }

  /**
   * Applies `update` while the job is still this run's and in flight; false once it was replaced,
   * deleted or finished. Finishing (succeeded or failed) records `took`.
   */
  async updateJob(docId: string, jobId: string, update: JobUpdate): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
      const stored = await this.read(docId);
      if (!stored || stored.document.job.id !== jobId || !isInFlight(stored.document.job)) {
        return false;
      }
      const now = this.now();
      const job: BriefJob = { ...stored.document.job, ...update.job, updatedAt: now.toISOString() };
      const document: BriefDocument = {
        ...stored.document,
        job: isInFlight(job)
          ? job
          : { ...omit(job, 'stage'), took: now.getTime() - Date.parse(job.startedAt) },
        ...(update.report ? { report: update.report } : {}),
        ...(update.metadata
          ? { metadata: update.metadata, expiresAt: addRetention(update.metadata.generatedAt) }
          : {}),
      };
      if (await this.write(docId, document, stored)) {
        return true;
      }
    }
    throw new BriefStoreConflictError(`Could not update executive brief job ${jobId}`);
  }

  /** Deletes the caller's brief in this space. Returns false when there was none. */
  async delete(key: BriefKey): Promise<boolean> {
    const { result } = await this.storageClient.delete({ id: getBriefDocId(key) });
    return result === 'deleted';
  }

  /** In-flight jobs within their deadline across the cluster, except the caller's own. */
  async countRunning(key: BriefKey): Promise<number> {
    const since = new Date(this.now().getTime() - BRIEF_JOB_DEADLINE_MS).toISOString();
    const { hits } = await this.storageClient.search({
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { 'job.status': ['pending', 'running'] } },
            { range: { 'job.startedAt': { gte: since } } },
          ],
          must_not: [{ ids: { values: [getBriefDocId(key)] } }],
        },
      },
    });
    return typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;
  }

  /** Deletes expired documents (cleanup task). Returns the number deleted. */
  async deleteExpired(abortSignal?: AbortSignal): Promise<number> {
    try {
      const response = await this.esClient.deleteByQuery(
        {
          index: EXECUTIVE_BRIEF_INDEX,
          query: { range: { expiresAt: { lt: this.now().toISOString() } } },
          conflicts: 'proceed',
          refresh: true,
          ignore_unavailable: true,
          allow_no_indices: true,
        },
        { signal: abortSignal }
      );
      return response.deleted ?? 0;
    } catch (error) {
      if (hasStatusCode(error, 404)) {
        return 0;
      }
      throw error;
    }
  }

  /** The caller's document when it is theirs and unexpired. */
  private async readOwned(key: BriefKey, source?: string[]): Promise<BriefDocument | undefined> {
    const document = (await this.read(getBriefDocId(key), source))?.document;
    return document?.owner.id === key.ownerId &&
      document.spaceId === key.spaceId &&
      Date.parse(document.expiresAt) > this.now().getTime()
      ? document
      : undefined;
  }

  private async read(docId: string, source?: string[]): Promise<StoredBrief | undefined> {
    try {
      const response = await this.storageClient.get({
        id: docId,
        seq_no_primary_term: true,
        ...(source ? { _source: source } : {}),
      });
      const { _source: document, _seq_no: seqNo, _primary_term: primaryTerm } = response;
      if (!document || seqNo === undefined || primaryTerm === undefined) {
        return undefined;
      }
      return { document, seqNo, primaryTerm };
    } catch (error) {
      if (hasStatusCode(error, 404)) {
        return undefined;
      }
      throw error;
    }
  }

  /** Writes conditionally on `occ`, or creates; false on a version conflict. */
  private async write(
    docId: string,
    document: BriefDocument,
    occ: StoredBrief | undefined
  ): Promise<boolean> {
    try {
      await this.storageClient.index({
        id: docId,
        document,
        ...(occ
          ? { if_seq_no: occ.seqNo, if_primary_term: occ.primaryTerm }
          : { op_type: 'create' as const }),
      });
      return true;
    } catch (error) {
      if (hasStatusCode(error, 409)) {
        return false;
      }
      throw error;
    }
  }
}
