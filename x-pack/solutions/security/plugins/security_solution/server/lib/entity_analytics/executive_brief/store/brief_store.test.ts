/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { get } from 'lodash';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  BRIEF_RETENTION_MS,
  EXECUTIVE_BRIEF_INDEX,
} from '../../../../../common/entity_analytics/executive_brief/constants';
import type { Brief } from '../../../../../common/entity_analytics/executive_brief/brief';
import type {
  BriefDocument,
  BriefJob,
} from '../../../../../common/entity_analytics/executive_brief/document';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { CompleteJobInput } from './brief_store';
import { BriefStore, getBriefDocId, isJobStale, withStaleJobAsInterrupted } from './brief_store';
import type { BriefStorageClient } from './storage';

const conflictError = () =>
  new errors.ResponseError({
    body: { error: { type: 'version_conflict_engine_exception' } },
    headers: {},
    meta: {},
    statusCode: 409,
    warnings: null,
  } as unknown as ConstructorParameters<typeof errors.ResponseError>[0]);

const matches = (
  filter: QueryDslQueryContainer | undefined,
  id: string,
  source: BriefDocument
): boolean => {
  if (!filter) {
    return false;
  }
  if (filter.ids) {
    return ([] as string[]).concat(filter.ids.values ?? []).includes(id);
  }
  if (filter.term) {
    const [[field, value]] = Object.entries(filter.term);
    return get(source, field) === value;
  }
  if (filter.range) {
    const [[field, bounds]] = Object.entries(filter.range) as Array<[string, { gt?: string }]>;
    const value = get(source, field);
    return typeof value === 'string' && (!bounds.gt || Date.parse(value) > Date.parse(bounds.gt));
  }
  throw new Error(`Unsupported filter ${JSON.stringify(filter)}`);
};

/** In-memory storage client with Elasticsearch-style optimistic concurrency. */
const createFakeStorage = () => {
  const docs = new Map<string, { source: BriefDocument; seqNo: number }>();
  let seq = 0;
  const put = (id: string, source: BriefDocument) =>
    docs.set(id, { source: structuredClone(source), seqNo: ++seq });
  /** Runs just before each index write, to simulate a concurrent writer. */
  const beforeIndex = jest.fn<void, [string]>();

  const client = {
    search: jest.fn(
      async ({
        size,
        query,
      }: {
        size: number;
        query: { bool: { filter: QueryDslQueryContainer[] } };
      }) => {
        const hits = [...docs.entries()]
          .filter(([id, doc]) => query.bool.filter.every((f) => matches(f, id, doc.source)))
          .slice(0, size)
          .map(([id, doc]) => ({
            _id: id,
            _source: structuredClone(doc.source),
            _seq_no: doc.seqNo,
            _primary_term: 1,
          }));
        return { hits: { hits } };
      }
    ),
    index: jest.fn(
      async (request: {
        id: string;
        document: BriefDocument;
        if_seq_no?: number;
        op_type?: string;
      }) => {
        beforeIndex(request.id);
        const current = docs.get(request.id);
        if (request.op_type === 'create' && current) throw conflictError();
        if (request.if_seq_no !== undefined && current?.seqNo !== request.if_seq_no) {
          throw conflictError();
        }
        put(request.id, request.document);
        return { _id: request.id, result: 'created' };
      }
    ),
    delete: jest.fn(async ({ id }: { id: string }) => ({
      result: docs.delete(id) ? 'deleted' : 'not_found',
    })),
  };

  return { docs, client, beforeIndex, put };
};

const T0 = Date.parse('2026-10-12T10:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();
const owner = { id: 'profile-1' };
const spaceId = 'default';
const docId = getBriefDocId(owner.id, spaceId);

const brief = { verdict: { level: 'clear' } } as unknown as Brief;
const evidence: Evidence = { entities: {}, facts: [], links: [], signals: [] };
const result: CompleteJobInput = {
  evidence,
  params: { range: '7d', from: iso(T0 - 7 * 86_400_000), to: iso(T0), connector_id: 'c1' },
  composed: {
    brief,
    verification: { dropped: {}, lowered: 0, repaired: false },
    model: 'model-x',
    tokens: { prompt: 10, completion: 5, total: 15 },
  },
};

const job = (overrides: Partial<BriefJob> = {}): BriefJob => ({
  id: 'old',
  status: 'succeeded',
  started_at: iso(T0 - 60_000),
  ...overrides,
});

/** A document holding a brief generated 30 s before T0. */
const succeededDoc = (overrides: Partial<BriefDocument> = {}): BriefDocument => ({
  schema_version: 1,
  owner,
  space_id: spaceId,
  job: job(),
  generated_at: iso(T0 - 30_000),
  expires_at: iso(T0 - 30_000 + BRIEF_RETENTION_MS),
  brief,
  evidence,
  ...overrides,
});

describe('BriefStore', () => {
  let nowMs: number;
  let fake: ReturnType<typeof createFakeStorage>;
  let store: BriefStore;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  const stored = () => fake.docs.get(docId)?.source;

  beforeEach(() => {
    nowMs = T0;
    fake = createFakeStorage();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    store = new BriefStore({
      storageClient: fake.client as unknown as BriefStorageClient,
      esClient,
      logger: loggingSystemMock.createLogger(),
      now: () => new Date(nowMs),
    });
  });

  describe('conditional writes', () => {
    it('returns the running job instead of starting another while its heartbeat is fresh', async () => {
      fake.put(
        docId,
        succeededDoc({
          job: job({ id: 'running', status: 'running', heartbeat_at: iso(T0 - 5000) }),
        })
      );

      const started = await store.startJob({ owner, spaceId, jobId: 'job-2' });

      expect(started).toEqual(expect.objectContaining({ reused: true }));
      expect(started.job.id).toBe('running');
      expect(fake.client.index).not.toHaveBeenCalled();
    });

    it('returns the winner when a concurrent start creates the document first', async () => {
      fake.beforeIndex.mockImplementationOnce((id) =>
        fake.put(id, {
          schema_version: 1,
          owner,
          space_id: spaceId,
          job: { id: 'winner', status: 'pending', started_at: iso(T0), heartbeat_at: iso(T0) },
          expires_at: iso(T0 + BRIEF_RETENTION_MS),
        })
      );

      const started = await store.startJob({ owner, spaceId, jobId: 'loser' });

      expect(started).toEqual(expect.objectContaining({ reused: true }));
      expect(started.job.id).toBe('winner');
    });

    it('ignores every write from a job that was superseded', async () => {
      await store.startJob({ owner, spaceId, jobId: 'job-1' });
      nowMs = T0 + 61_000;
      await store.startJob({ owner, spaceId, jobId: 'job-2' });

      expect(await store.markRunning({ docId, jobId: 'job-1' })).toBe(false);
      expect(await store.heartbeat({ docId, jobId: 'job-1' })).toBe(false);
      expect(await store.setStage({ docId, jobId: 'job-1', stage: 'verify' })).toBe(false);
      expect(await store.completeJob({ docId, jobId: 'job-1', result })).toBe(false);
      expect(
        await store.failJob({ docId, jobId: 'job-1', error: { code: 'timeout', message: 'x' } })
      ).toBe(false);
      expect(stored()?.job).toEqual(expect.objectContaining({ id: 'job-2', status: 'pending' }));
    });

    it('does not recreate a document deleted while its job was running', async () => {
      await store.startJob({ owner, spaceId, jobId: 'job-1' });
      await store.delete({ ownerId: owner.id, spaceId });

      expect(await store.completeJob({ docId, jobId: 'job-1', result })).toBe(false);
      expect(fake.docs.has(docId)).toBe(false);
    });

    it('retries a job update that lost a race with another write to the same job', async () => {
      await store.startJob({ owner, spaceId, jobId: 'job-1' });
      fake.beforeIndex.mockImplementationOnce((id) => {
        const current = fake.docs.get(id);
        if (current) fake.put(id, current.source);
      });

      expect(await store.heartbeat({ docId, jobId: 'job-1' })).toBe(true);
      expect(fake.client.index).toHaveBeenCalledTimes(3);
    });
  });

  describe('stale jobs', () => {
    it('uses the heartbeat, or the start time when there is none', () => {
      const now = new Date(T0);
      expect(isJobStale(job({ status: 'running', heartbeat_at: iso(T0 - 59_000) }), now)).toBe(
        false
      );
      expect(isJobStale(job({ status: 'running', heartbeat_at: iso(T0 - 61_000) }), now)).toBe(
        true
      );
      expect(isJobStale(job({ status: 'pending', started_at: iso(T0 - 90_000) }), now)).toBe(true);
      expect(isJobStale(job({ status: 'succeeded', started_at: iso(T0 - 90_000) }), now)).toBe(
        false
      );
    });

    it('reports a stale job as failed with interrupted', () => {
      const document = succeededDoc({
        job: job({ status: 'running', heartbeat_at: iso(T0 - 61_000) }),
      });

      expect(withStaleJobAsInterrupted(document, new Date(T0)).job).toEqual(
        expect.objectContaining({
          status: 'failed',
          error: expect.objectContaining({ code: 'interrupted' }),
        })
      );
      const fresh = succeededDoc({ job: job({ status: 'running', heartbeat_at: iso(T0 - 1000) }) });
      expect(withStaleJobAsInterrupted(fresh, new Date(T0))).toBe(fresh);
    });

    it('replaces a stale job, keeping the previous brief and its expiry', async () => {
      const previous = succeededDoc({
        job: job({ id: 'stale', status: 'running', heartbeat_at: iso(T0 - 61_000) }),
      });
      fake.put(docId, previous);

      const started = await store.startJob({ owner, spaceId, jobId: 'job-3' });

      expect(started.reused).toBe(false);
      expect(stored()).toEqual(
        expect.objectContaining({
          job: expect.objectContaining({ id: 'job-3', status: 'pending' }),
          brief,
          generated_at: previous.generated_at,
          expires_at: previous.expires_at,
        })
      );
    });
  });

  describe('expiry', () => {
    it('cleans up only briefs whose expiry has passed', async () => {
      esClient.deleteByQuery.mockResolvedValue({ deleted: 2 });

      expect(await store.deleteExpired()).toBe(2);
      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: EXECUTIVE_BRIEF_INDEX,
          query: { range: { expires_at: { lt: iso(T0) } } },
          conflicts: 'proceed',
        }),
        undefined
      );
    });

    it('restarts the expiry from generated_at when a job succeeds', async () => {
      fake.put(docId, succeededDoc());
      await store.startJob({ owner, spaceId, jobId: 'job-1' });
      nowMs = T0 + 10_000;

      expect(await store.completeJob({ docId, jobId: 'job-1', result })).toBe(true);
      expect(stored()).toEqual(
        expect.objectContaining({
          job: expect.objectContaining({ id: 'job-1', status: 'succeeded' }),
          generated_at: iso(T0 + 10_000),
          expires_at: iso(T0 + 10_000 + BRIEF_RETENTION_MS),
        })
      );
    });

    it('replaces the previous brief when a run finds nothing', async () => {
      fake.put(docId, succeededDoc());
      await store.startJob({ owner, spaceId, jobId: 'job-1' });

      const { evidence: emptyEvidence, params } = result;
      expect(
        await store.completeJob({
          docId,
          jobId: 'job-1',
          result: { evidence: emptyEvidence, params },
        })
      ).toBe(true);
      expect(stored()?.job.status).toBe('succeeded');
      expect(stored()).not.toHaveProperty('brief');
      expect(stored()).not.toHaveProperty('tokens');
    });

    it('does not extend the previous brief when a regeneration fails', async () => {
      const previous = succeededDoc();
      fake.put(docId, previous);
      await store.startJob({ owner, spaceId, jobId: 'job-1' });
      nowMs = T0 + 10_000;

      await store.failJob({ docId, jobId: 'job-1', error: { code: 'llm_error', message: 'boom' } });

      expect(stored()).toEqual(
        expect.objectContaining({
          job: expect.objectContaining({
            status: 'failed',
            error: { code: 'llm_error', message: 'boom' },
          }),
          brief,
          generated_at: previous.generated_at,
          expires_at: previous.expires_at,
        })
      );
    });

    it('expires a document with no brief 30 days after its failed job started', async () => {
      await store.startJob({ owner, spaceId, jobId: 'job-1' });
      nowMs = T0 + 5000;

      await store.failJob({ docId, jobId: 'job-1', error: { code: 'internal', message: 'x' } });

      expect(stored()?.expires_at).toBe(iso(T0 + BRIEF_RETENTION_MS));
    });

    it('drops an expired previous brief when a new job starts', async () => {
      fake.put(docId, succeededDoc({ expires_at: iso(T0 - 1) }));

      await store.startJob({ owner, spaceId, jobId: 'job-1' });

      expect(stored()?.brief).toBeUndefined();
      expect(stored()?.generated_at).toBeUndefined();
      expect(stored()?.expires_at).toBe(iso(T0 + BRIEF_RETENTION_MS));
    });

    it('reads an expired document as missing, as it does for another owner or space', async () => {
      fake.put(docId, succeededDoc());
      expect(await store.get({ ownerId: owner.id, spaceId })).toBeDefined();
      expect(await store.get({ ownerId: 'someone-else', spaceId })).toBeUndefined();
      expect(await store.get({ ownerId: owner.id, spaceId: 'other' })).toBeUndefined();

      nowMs = Date.parse(succeededDoc().expires_at);
      expect(await store.get({ ownerId: owner.id, spaceId })).toBeUndefined();
    });
  });
});
