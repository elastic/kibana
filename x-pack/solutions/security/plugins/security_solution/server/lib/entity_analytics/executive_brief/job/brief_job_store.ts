/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import {
  getExecutiveBriefJobsIndex,
  POC_JOB_TIMEOUT_MS,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';

/** Fields a run may change after the job document was created. */
export type BriefJobPatch = Partial<
  Omit<ExecutiveBriefJob, 'id' | 'spaceId' | 'createdAt' | 'createdBy' | 'params' | 'updatedAt'>
>;

/** Persistence for job documents. `runExecutiveBrief` only depends on this interface. */
export interface BriefJobStore {
  ensureIndex: () => Promise<void>;
  create: (job: ExecutiveBriefJob) => Promise<void>;
  update: (id: string, patch: BriefJobPatch) => Promise<void>;
  get: (id: string) => Promise<ExecutiveBriefJob | undefined>;
}

/**
 * Only the fields needed for lookup are indexed. The potentially large `snapshot` and `brief`
 * (and everything else) are kept in `_source` only.
 */
export const BRIEF_JOB_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    id: { type: 'keyword' },
    spaceId: { type: 'keyword' },
    status: { type: 'keyword' },
    stage: { type: 'keyword' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    createdBy: { type: 'object', properties: { username: { type: 'keyword' } } },
    params: { type: 'object', enabled: false },
    snapshot: { type: 'object', enabled: false },
    brief: { type: 'object', enabled: false },
    validation: { type: 'object', enabled: false },
    timings: { type: 'object', enabled: false },
    tokens: { type: 'object', enabled: false },
    error: { type: 'object', enabled: false },
  },
};

const readyIndices = new Set<string>();

/** Job documents live in a hidden plain index, written with the internal user. */
export const createBriefJobStore = ({
  esClient,
  logger,
  spaceId,
  now = () => new Date(),
}: {
  /** Must be the internal user client (`asInternalUser`). */
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  now?: () => Date;
}): BriefJobStore => {
  const index = getExecutiveBriefJobsIndex(spaceId);

  const ensureIndex = async (): Promise<void> => {
    if (readyIndices.has(index)) {
      return;
    }
    await createOrUpdateIndex({
      esClient,
      logger,
      options: {
        index,
        mappings: BRIEF_JOB_MAPPINGS,
        settings: { hidden: true, auto_expand_replicas: '0-1' },
      },
    });
    readyIndices.add(index);
  };

  const create = async (job: ExecutiveBriefJob): Promise<void> => {
    await esClient.index({ index, id: job.id, document: job, refresh: 'wait_for' });
  };

  const update = async (id: string, patch: BriefJobPatch): Promise<void> => {
    await esClient.update({
      index,
      id,
      doc: { ...patch, updatedAt: now().toISOString() },
      refresh: 'wait_for',
      retry_on_conflict: 3,
    });
  };

  const get = async (id: string): Promise<ExecutiveBriefJob | undefined> => {
    const response = await esClient.get<ExecutiveBriefJob>({ index, id }, { ignore: [404] });
    return response.found ? response._source : undefined;
  };

  return { ensureIndex, create, update, get };
};

/** Grace on top of the job timeout before a non-terminal job is considered lost. */
export const STALE_JOB_GRACE_MS = 30_000;

/**
 * An in-process job dies with its Kibana node. A job that is still `pending` or `running` well
 * past its timeout without any write is reported as `interrupted` instead of running forever.
 */
export const markInterruptedIfStale = (
  job: ExecutiveBriefJob,
  nowMs: number
): ExecutiveBriefJob => {
  if (job.status !== 'pending' && job.status !== 'running') {
    return job;
  }
  const lastWrite = Date.parse(job.updatedAt);
  if (Number.isNaN(lastWrite) || nowMs - lastWrite <= POC_JOB_TIMEOUT_MS + STALE_JOB_GRACE_MS) {
    return job;
  }
  return {
    ...job,
    status: 'failed',
    error: {
      code: 'interrupted',
      message: 'The brief job stopped reporting progress; the node running it may have restarted.',
    },
  };
};
