/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { pick } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  BRIEF_RETENTION_MS,
  BRIEF_STALE_HEARTBEAT_MS,
  EXECUTIVE_BRIEF_INDEX,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type {
  BriefDocument,
  BriefErrorCode,
  BriefJob,
  BriefJobStage,
  BriefParams,
} from '../../../../../common/entity_analytics/executive_brief/document';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { ComposeVerifiedBriefResult } from '../composition/types';
import { BriefStoreConflictError } from './errors';
import type { BriefStorageClient } from './storage';

/** Fields that hold the last successful brief; replaced only when a job succeeds. */
const BRIEF_FIELDS = [
  'generated_at',
  'params',
  'model',
  'tokens',
  'evidence',
  'brief',
  'verification',
] as const;

const MAX_WRITE_ATTEMPTS = 3;

/** Deterministic document id: one brief document per owner and space. */
export const getBriefDocId = (ownerId: string, spaceId: string): string =>
  createHash('sha256').update(`${ownerId}:${spaceId}`).digest('hex');

const isInFlight = (job: BriefJob): boolean => job.status === 'pending' || job.status === 'running';

const addRetention = (iso: string): string =>
  new Date(Date.parse(iso) + BRIEF_RETENTION_MS).toISOString();

/** A pending or running job whose heartbeat (or start, if it never beat) is too old. */
export const isJobStale = (job: BriefJob, now: Date): boolean =>
  isInFlight(job) &&
  now.getTime() - Date.parse(job.heartbeat_at ?? job.started_at) > BRIEF_STALE_HEARTBEAT_MS;

/** A pending or running job with a fresh heartbeat. */
export const isJobActive = (job: BriefJob, now: Date): boolean =>
  isInFlight(job) && !isJobStale(job, now);

/** Reports a stale in-flight job as failed with `interrupted`, as GET shows it. */
export const withStaleJobAsInterrupted = (document: BriefDocument, now: Date): BriefDocument =>
  isJobStale(document.job, now)
    ? {
        ...document,
        job: {
          ...document.job,
          status: 'failed',
          error: {
            code: 'interrupted',
            message: 'The brief generation stopped responding and was interrupted.',
          },
        },
      }
    : document;

export interface StoredBrief {
  docId: string;
  document: BriefDocument;
  seqNo: number;
  primaryTerm: number;
}

export interface StartJobResult {
  docId: string;
  job: BriefJob;
  /** True when a running job with a fresh heartbeat was returned instead of starting one. */
  reused: boolean;
}

export interface CompleteJobInput extends ComposeVerifiedBriefResult {
  evidence: Evidence;
  params: BriefParams;
}

const isConflictError = (error: unknown): boolean =>
  isResponseError(error) && error.statusCode === 409;

const ownerFilters = (ownerId: string, spaceId: string): QueryDslQueryContainer[] => [
  { term: { 'owner.id': ownerId } },
  { term: { space_id: spaceId } },
];

export interface BriefStoreOptions {
  storageClient: BriefStorageClient;
  /** Internal user client, used only for the cleanup delete-by-query. */
  esClient: ElasticsearchClient;
  logger: Logger;
  now?: () => Date;
}

/**
 * Owner-scoped access to brief documents. Reads used by routes always filter on owner, space and
 * expiry. Job writes (used by the task) are conditional on the stored `job.id` matching, and use
 * `if_seq_no`/`if_primary_term`, so a superseded or deleted job can never overwrite a newer one.
 */
export class BriefStore {
  private readonly storageClient: BriefStorageClient;
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly now: () => Date;

  constructor({ storageClient, esClient, logger, now = () => new Date() }: BriefStoreOptions) {
    this.storageClient = storageClient;
    this.esClient = esClient;
    this.logger = logger;
    this.now = now;
  }

  /** The caller's unexpired brief document in this space, or undefined (route returns 404). */
  async get({
    ownerId,
    spaceId,
  }: {
    ownerId: string;
    spaceId: string;
  }): Promise<StoredBrief | undefined> {
    return this.read(getBriefDocId(ownerId, spaceId), [
      ...ownerFilters(ownerId, spaceId),
      { range: { expires_at: { gt: this.now().toISOString() } } },
    ]);
  }

  /** The document a task works on, only while `job.id` still matches. Internal use (task). */
  async getForJob({
    docId,
    jobId,
  }: {
    docId: string;
    jobId: string;
  }): Promise<StoredBrief | undefined> {
    const stored = await this.read(docId);
    return stored?.document.job.id === jobId ? stored : undefined;
  }

  /**
   * Starts a new pending job on the owner's document, keeping the previous (unexpired) brief.
   * Returns the existing job instead when one is in flight with a fresh heartbeat. The write is
   * conditional (`op_type: create` or `if_seq_no`), so concurrent starts can't both win.
   */
  async startJob({
    owner,
    spaceId,
    jobId,
  }: {
    owner: { id: string; username: string };
    spaceId: string;
    jobId: string;
  }): Promise<StartJobResult> {
    const docId = getBriefDocId(owner.id, spaceId);

    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
      const now = this.now();
      const existing = await this.read(docId, ownerFilters(owner.id, spaceId));

      if (existing && isJobActive(existing.document.job, now)) {
        return { docId, job: existing.document.job, reused: true };
      }

      const document = buildStartedDocument({
        previous: existing?.document,
        owner,
        spaceId,
        jobId,
        now,
      });

      try {
        await this.write(docId, document, existing);
        return { docId, job: document.job, reused: false };
      } catch (error) {
        if (!isConflictError(error)) {
          throw error;
        }
        this.logger.debug(`Conflict starting executive brief job on ${docId}; retrying`);
      }
    }

    throw new BriefStoreConflictError('Another request is starting a brief; try again shortly.');
  }

  /** pending → running, stage gather. False when the job was superseded, deleted or finished. */
  async markRunning({ docId, jobId }: { docId: string; jobId: string }): Promise<boolean> {
    return this.updateInFlightJob(docId, jobId, (document, now) => ({
      ...document,
      job: { ...document.job, status: 'running', stage: 'gather', heartbeat_at: now },
    }));
  }

  /** Refreshes the heartbeat. False when the job is no longer this task's to run. */
  async heartbeat({ docId, jobId }: { docId: string; jobId: string }): Promise<boolean> {
    return this.updateInFlightJob(docId, jobId, (document, now) => ({
      ...document,
      job: { ...document.job, heartbeat_at: now },
    }));
  }

  async setStage({
    docId,
    jobId,
    stage,
  }: {
    docId: string;
    jobId: string;
    stage: BriefJobStage;
  }): Promise<boolean> {
    return this.updateInFlightJob(docId, jobId, (document, now) => ({
      ...document,
      job: { ...document.job, stage, heartbeat_at: now },
    }));
  }

  /** Replaces the brief fields and marks the job succeeded; expiry restarts from generated_at. */
  async completeJob({
    docId,
    jobId,
    result,
  }: {
    docId: string;
    jobId: string;
    result: CompleteJobInput;
  }): Promise<boolean> {
    return this.updateInFlightJob(docId, jobId, (document, now) => {
      const { brief, evidence, verification, model, tokens, params } = result;
      return {
        schema_version: 1,
        owner: document.owner,
        space_id: document.space_id,
        job: {
          id: document.job.id,
          status: 'succeeded',
          started_at: document.job.started_at,
          heartbeat_at: now,
        },
        generated_at: now,
        expires_at: addRetention(now),
        params,
        ...(model ? { model } : {}),
        tokens,
        evidence,
        brief,
        verification,
      };
    });
  }

  /**
   * Marks the job failed, keeping the previous brief and its expiry. A document that never held
   * a brief expires 30 days after the job started.
   */
  async failJob({
    docId,
    jobId,
    error,
  }: {
    docId: string;
    jobId: string;
    error: { code: BriefErrorCode; message: string };
  }): Promise<boolean> {
    return this.updateInFlightJob(docId, jobId, (document, now) => ({
      ...document,
      job: { ...document.job, status: 'failed', heartbeat_at: now, error },
      expires_at: document.brief ? document.expires_at : addRetention(document.job.started_at),
    }));
  }

  /** Deletes the caller's brief in this space. Returns false when there was none. */
  async delete({ ownerId, spaceId }: { ownerId: string; spaceId: string }): Promise<boolean> {
    const docId = getBriefDocId(ownerId, spaceId);
    const existing = await this.read(docId, ownerFilters(ownerId, spaceId));
    if (!existing) {
      return false;
    }
    const { result } = await this.storageClient.delete({ id: docId });
    return result === 'deleted';
  }

  /** In-flight jobs with a fresh heartbeat, across all users and spaces (cluster cap). */
  async countRunning(): Promise<number> {
    const freshSince = new Date(this.now().getTime() - BRIEF_STALE_HEARTBEAT_MS).toISOString();
    const response = await this.storageClient.search({
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { 'job.status': ['pending', 'running'] } },
            { range: { 'job.heartbeat_at': { gte: freshSince } } },
          ],
        },
      },
    });
    const { total } = response.hits;
    return typeof total === 'number' ? total : total?.value ?? 0;
  }

  /** Deletes expired documents (cleanup task). Returns the number deleted. */
  async deleteExpired({ abortSignal }: { abortSignal?: AbortSignal } = {}): Promise<number> {
    try {
      const response = await this.esClient.deleteByQuery(
        {
          index: EXECUTIVE_BRIEF_INDEX,
          query: { range: { expires_at: { lt: this.now().toISOString() } } },
          conflicts: 'proceed',
          refresh: true,
          ignore_unavailable: true,
          allow_no_indices: true,
        },
        abortSignal ? { signal: abortSignal } : undefined
      );
      return response.deleted ?? 0;
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return 0;
      }
      throw error;
    }
  }

  private async read(
    docId: string,
    filters: QueryDslQueryContainer[] = []
  ): Promise<StoredBrief | undefined> {
    const response = await this.storageClient.search({
      track_total_hits: false,
      size: 1,
      seq_no_primary_term: true,
      query: { bool: { filter: [{ ids: { values: [docId] } }, ...filters] } },
    });
    const hit = response.hits.hits[0];
    if (!hit?._source) {
      return undefined;
    }
    if (hit._seq_no === undefined || hit._primary_term === undefined) {
      throw new Error(`Executive brief ${docId} was read without sequence number`);
    }
    return {
      docId,
      document: hit._source,
      seqNo: hit._seq_no,
      primaryTerm: hit._primary_term,
    };
  }

  private async write(
    docId: string,
    document: BriefDocument,
    occ: Pick<StoredBrief, 'seqNo' | 'primaryTerm'> | undefined
  ): Promise<void> {
    await this.storageClient.index({
      id: docId,
      document,
      ...(occ
        ? { if_seq_no: occ.seqNo, if_primary_term: occ.primaryTerm }
        : { op_type: 'create' as const }),
    });
  }

  /**
   * Read-modify-write on an in-flight job, only while `job.id` matches. Retries on version
   * conflicts (e.g. heartbeat racing a stage update); returns false when the job is gone.
   */
  private async updateInFlightJob(
    docId: string,
    jobId: string,
    mutate: (document: BriefDocument, nowIso: string) => BriefDocument
  ): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
      const stored = await this.read(docId);
      if (!stored || stored.document.job.id !== jobId || !isInFlight(stored.document.job)) {
        return false;
      }
      try {
        await this.write(docId, mutate(stored.document, this.now().toISOString()), stored);
        return true;
      } catch (error) {
        if (!isConflictError(error)) {
          throw error;
        }
      }
    }
    throw new BriefStoreConflictError(`Could not update executive brief job ${jobId}`);
  }
}

const buildStartedDocument = ({
  previous,
  owner,
  spaceId,
  jobId,
  now,
}: {
  previous: BriefDocument | undefined;
  owner: { id: string; username: string };
  spaceId: string;
  jobId: string;
  now: Date;
}): BriefDocument => {
  const startedAt = now.toISOString();
  // Heartbeat starts with the job so a pending job counts towards the cluster cap and goes stale
  // if the task never starts.
  const job: BriefJob = {
    id: jobId,
    status: 'pending',
    started_at: startedAt,
    heartbeat_at: startedAt,
  };
  const keepPrevious =
    previous?.brief !== undefined && Date.parse(previous.expires_at) > now.getTime();

  return {
    schema_version: 1,
    owner: { id: owner.id, username: owner.username },
    space_id: spaceId,
    job,
    expires_at: keepPrevious && previous ? previous.expires_at : addRetention(startedAt),
    ...(keepPrevious && previous ? pick(previous, BRIEF_FIELDS) : {}),
  };
};
