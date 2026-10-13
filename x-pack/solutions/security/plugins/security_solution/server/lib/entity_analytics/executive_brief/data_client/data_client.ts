/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { omit } from 'lodash';
import { isResponseError } from '@kbn/es-errors';
import { BRIEF_JOB_DEADLINE_MS } from '../../../../../common/entity_analytics/executive_brief/constants';
import type { BriefJob } from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { GetExecutiveBriefResponse } from '../../../../../common/api/entity_analytics/executive_brief/get.gen';
import { ExecutiveBriefConflictError } from './errors';
import type { ExecutiveBriefStorage } from './storage';
import type { BriefDocument, BriefOwner, JobUpdate } from './types';

const MAX_WRITE_ATTEMPTS = 3;

interface StoredBrief {
  document: BriefDocument;
  seqNo: number;
  primaryTerm: number;
}

const isInFlight = ({ status }: Pick<BriefJob, 'status'>): boolean =>
  status === 'pending' || status === 'running';

const hasStatusCode = (error: unknown, statusCode: number): boolean =>
  isResponseError(error) && error.statusCode === statusCode;

/** An in-flight job past its deadline stopped without finishing (e.g. a restart). */
const overdueAsInterrupted = (job: BriefJob): BriefJob => {
  if (!isInFlight(job) || Date.now() - Date.parse(job.startedAt) <= BRIEF_JOB_DEADLINE_MS) {
    return job;
  }
  return {
    ...omit(job, 'stage'),
    status: 'failed',
    took: Date.parse(job.updatedAt) - Date.parse(job.startedAt),
    error: {
      code: 'interrupted',
      message: 'The brief generation stopped before finishing. Generate it again.',
    },
  };
};

/**
 * The caller's brief in a space, stored as one document with a deterministic id. Starting a job
 * replaces any job in progress. Job updates are conditional on the stored `job.id` and use
 * `if_seq_no`/`if_primary_term`, so a replaced or deleted job stops at its next write.
 */
export class ExecutiveBriefDataClient {
  private readonly storage: ExecutiveBriefStorage;
  private readonly owner: BriefOwner;
  private readonly docId: string;

  constructor({ storage, owner }: { storage: ExecutiveBriefStorage; owner: BriefOwner }) {
    this.storage = storage;
    this.owner = owner;
    this.docId = createHash('sha256').update(`${owner.profileId}:${owner.spaceId}`).digest('hex');
  }

  /** The brief as GET returns it; an overdue job reads as interrupted. */
  async get(): Promise<GetExecutiveBriefResponse | undefined> {
    const document = await this.readOwned();
    if (!document) {
      return undefined;
    }
    const { job, report, metadata } = document;
    return { job: overdueAsInterrupted(job), report, metadata };
  }

  /** The job alone, without reading the report. */
  async getJob(): Promise<BriefJob | undefined> {
    const document = await this.readOwned(['owner', 'spaceId', 'job']);
    return document && overdueAsInterrupted(document.job);
  }

  /** Starts a pending job, keeping the previous report and replacing any job in progress. */
  async startJob(jobId: string): Promise<BriefJob> {
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
      const existing = await this.read();
      const startedAt = new Date().toISOString();
      const document: BriefDocument = {
        owner: { id: this.owner.profileId },
        spaceId: this.owner.spaceId,
        schemaVersion: 1,
        job: { id: jobId, status: 'pending', startedAt, updatedAt: startedAt },
        report: existing?.document.report,
        metadata: existing?.document.metadata,
      };
      if (await this.write(document, existing)) {
        return document.job;
      }
    }
    throw new ExecutiveBriefConflictError(
      'Another request is starting a brief; try again shortly.'
    );
  }

  /** Applies `update` while `jobId` is current and in flight, else returns false; finishing records `took`. */
  async updateJob(jobId: string, update: JobUpdate): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
      const stored = await this.read();
      if (!stored || stored.document.job.id !== jobId || !isInFlight(stored.document.job)) {
        return false;
      }
      const now = new Date();
      const job: BriefJob = { ...stored.document.job, ...update.job, updatedAt: now.toISOString() };
      const document: BriefDocument = {
        ...stored.document,
        job: isInFlight(job)
          ? job
          : { ...omit(job, 'stage'), took: now.getTime() - Date.parse(job.startedAt) },
        report: update.report ?? stored.document.report,
        metadata: update.metadata ?? stored.document.metadata,
      };
      if (await this.write(document, stored)) {
        return true;
      }
    }
    throw new ExecutiveBriefConflictError(`Could not update executive brief job ${jobId}`);
  }

  /** Deletes the brief; false when there was none. */
  async delete(): Promise<boolean> {
    const { result } = await this.storage.getClient().delete({ id: this.docId });
    return result === 'deleted';
  }

  /** In-flight jobs within their deadline across the cluster, except the caller's own. */
  async countRunning(): Promise<number> {
    const since = new Date(Date.now() - BRIEF_JOB_DEADLINE_MS).toISOString();
    const { hits } = await this.storage.getClient().search({
      track_total_hits: true,
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { 'job.status': ['pending', 'running'] } },
            { range: { 'job.startedAt': { gte: since } } },
          ],
          must_not: [{ ids: { values: [this.docId] } }],
        },
      },
    });
    return typeof hits.total === 'number' ? hits.total : hits.total?.value ?? 0;
  }

  /** The document when it belongs to the owner and space. */
  private async readOwned(source?: string[]): Promise<BriefDocument | undefined> {
    const document = (await this.read(source))?.document;
    const { profileId, spaceId } = this.owner;
    if (!document || document.owner.id !== profileId || document.spaceId !== spaceId) {
      return undefined;
    }
    return document;
  }

  private async read(source?: string[]): Promise<StoredBrief | undefined> {
    try {
      const response = await this.storage.getClient().get({
        id: this.docId,
        seq_no_primary_term: true,
        _source: source,
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
  private async write(document: BriefDocument, occ: StoredBrief | undefined): Promise<boolean> {
    const condition = occ
      ? { if_seq_no: occ.seqNo, if_primary_term: occ.primaryTerm }
      : { op_type: 'create' as const };
    try {
      await this.storage.getClient().index({ id: this.docId, document, ...condition });
      return true;
    } catch (error) {
      if (hasStatusCode(error, 409)) {
        return false;
      }
      throw error;
    }
  }
}
