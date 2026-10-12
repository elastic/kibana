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
import type { BriefDocument } from '../../../../../common/entity_analytics/executive_brief/document';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import {
  BriefStore,
  getBriefDocId,
  isJobActive,
  isJobStale,
  withStaleJobAsInterrupted,
} from './brief_store';
import type { BriefStorageClient } from './storage';

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    body: { error: { type: 'test' } },
    headers: {},
    meta: {},
    statusCode,
    warnings: null,
  } as unknown as ConstructorParameters<typeof errors.ResponseError>[0]);

interface FakeDoc {
  source: BriefDocument;
  seqNo: number;
}

const matches = (filter: QueryDslQueryContainer, id: string, source: BriefDocument): boolean => {
  if (!filter) return false;
  if (filter.ids) {
    const values = filter.ids.values ?? [];
    return (Array.isArray(values) ? values : [values]).includes(id);
  }
  if (filter.term) {
    const [field, value] = Object.entries(filter.term)[0];
    return get(source, field) === value;
  }
  if (filter.terms) {
    const [field, values] = Object.entries(filter.terms)[0];
    return (values as unknown[]).includes(get(source, field));
  }
  if (filter.range) {
    const [field, bounds] = Object.entries(filter.range)[0] as [
      string,
      { gt?: string; gte?: string; lt?: string }
    ];
    const raw = get(source, field);
    if (typeof raw !== 'string') return false;
    const value = Date.parse(raw);
    if (bounds.gt !== undefined && !(value > Date.parse(bounds.gt))) return false;
    if (bounds.gte !== undefined && !(value >= Date.parse(bounds.gte))) return false;
    if (bounds.lt !== undefined && !(value < Date.parse(bounds.lt))) return false;
    return true;
  }
  throw new Error(`Unsupported filter ${JSON.stringify(filter)}`);
};

/** In-memory stand-in for the storage adapter client with ES-like optimistic concurrency. */
const createFakeStorage = () => {
  const docs = new Map<string, FakeDoc>();
  let seq = 0;
  const beforeIndex = jest.fn<void, [string]>();

  const client = {
    search: jest.fn(
      async (request: { size: number; query: { bool: { filter: QueryDslQueryContainer[] } } }) => {
        const found = [...docs.entries()].filter(([id, doc]) =>
          request.query.bool.filter.every((filter) => matches(filter, id, doc.source))
        );
        return {
          hits: {
            total: { value: found.length, relation: 'eq' },
            hits: found.slice(0, request.size).map(([id, doc]) => ({
              _id: id,
              _index: `${EXECUTIVE_BRIEF_INDEX}-000001`,
              _source: structuredClone(doc.source),
              _seq_no: doc.seqNo,
              _primary_term: 1,
            })),
          },
        };
      }
    ),
    index: jest.fn(
      async ({
        id,
        document,
        if_seq_no: ifSeqNo,
        op_type: opType,
      }: {
        id: string;
        document: BriefDocument;
        if_seq_no?: number;
        op_type?: string;
      }) => {
        beforeIndex(id);
        const current = docs.get(id);
        if (opType === 'create' && current) throw responseError(409);
        if (ifSeqNo !== undefined && current?.seqNo !== ifSeqNo) throw responseError(409);
        docs.set(id, { source: structuredClone(document), seqNo: ++seq });
        return { _id: id, result: 'created' };
      }
    ),
    delete: jest.fn(async ({ id }: { id: string }) => ({
      acknowledged: true,
      result: docs.delete(id) ? 'deleted' : 'not_found',
    })),
  };

  return {
    docs,
    client,
    beforeIndex,
    put: (id: string, source: BriefDocument) => docs.set(id, { source, seqNo: ++seq }),
  };
};

const T0 = Date.parse('2026-10-12T10:00:00.000Z');
const owner = { id: 'profile-1', username: 'alice' };
const spaceId = 'default';
const docId = getBriefDocId(owner.id, spaceId);

const brief = { verdict: { level: 'clear' } } as unknown as Brief;
const evidence: Evidence = { entities: {}, facts: [], links: [], signals: [] };
const params = {
  range: '7d' as const,
  from: '2026-10-05T10:00:00.000Z',
  to: '2026-10-12T10:00:00.000Z',
  connector_id: 'c1',
};
const result = {
  brief,
  evidence,
  verification: { dropped: {}, flags: [], repaired: false },
  model: 'model-x',
  tokens: { prompt: 10, completion: 5, total: 15 },
  params,
};

const iso = (ms: number) => new Date(ms).toISOString();

describe('BriefStore', () => {
  let nowMs: number;
  let fake: ReturnType<typeof createFakeStorage>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let store: BriefStore;

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

  const succeededDoc = (overrides: Partial<BriefDocument> = {}): BriefDocument => ({
    schema_version: 1,
    owner,
    space_id: spaceId,
    job: { id: 'old', status: 'succeeded', started_at: iso(T0 - 60_000) },
    generated_at: iso(T0 - 30_000),
    expires_at: iso(T0 - 30_000 + BRIEF_RETENTION_MS),
    params,
    brief,
    evidence,
    verification: result.verification,
    tokens: result.tokens,
    ...overrides,
  });

  describe('getBriefDocId', () => {
    it('is deterministic per owner and space', () => {
      expect(getBriefDocId('a', 'default')).toBe(getBriefDocId('a', 'default'));
      expect(getBriefDocId('a', 'default')).not.toBe(getBriefDocId('a', 'other'));
      expect(getBriefDocId('a', 'default')).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('startJob', () => {
    it('creates a pending job with a heartbeat and a 30 day expiry when there is no document', async () => {
      const started = await store.startJob({ owner, spaceId, jobId: 'job-1' });

      expect(started).toEqual({
        docId,
        reused: false,
        job: { id: 'job-1', status: 'pending', started_at: iso(T0), heartbeat_at: iso(T0) },
      });
      expect(fake.client.index).toHaveBeenCalledWith(
        expect.objectContaining({ id: docId, op_type: 'create' })
      );
      expect(fake.docs.get(docId)?.source).toEqual({
        schema_version: 1,
        owner,
        space_id: spaceId,
        job: started.job,
        expires_at: iso(T0 + BRIEF_RETENTION_MS),
      });
    });

    it('returns the running job when its heartbeat is fresh', async () => {
      fake.put(
        docId,
        succeededDoc({
          job: {
            id: 'running',
            status: 'running',
            started_at: iso(T0 - 5000),
            heartbeat_at: iso(T0 - 5000),
          },
        })
      );

      const started = await store.startJob({ owner, spaceId, jobId: 'job-2' });

      expect(started.reused).toBe(true);
      expect(started.job.id).toBe('running');
      expect(fake.client.index).not.toHaveBeenCalled();
    });

    it('replaces a stale job and keeps the previous brief and its expiry', async () => {
      const previous = succeededDoc({
        job: {
          id: 'stale',
          status: 'running',
          started_at: iso(T0 - 120_000),
          heartbeat_at: iso(T0 - 61_000),
        },
      });
      fake.put(docId, previous);

      const started = await store.startJob({ owner, spaceId, jobId: 'job-3' });

      expect(started.reused).toBe(false);
      expect(fake.client.index).toHaveBeenCalledWith(
        expect.objectContaining({ if_seq_no: expect.any(Number), if_primary_term: 1 })
      );
      const stored = fake.docs.get(docId)?.source;
      expect(stored?.job.id).toBe('job-3');
      expect(stored?.brief).toEqual(brief);
      expect(stored?.generated_at).toBe(previous.generated_at);
      expect(stored?.expires_at).toBe(previous.expires_at);
    });

    it('drops an expired previous brief', async () => {
      fake.put(docId, succeededDoc({ expires_at: iso(T0 - 1) }));

      await store.startJob({ owner, spaceId, jobId: 'job-4' });

      const stored = fake.docs.get(docId)?.source;
      expect(stored?.brief).toBeUndefined();
      expect(stored?.generated_at).toBeUndefined();
      expect(stored?.expires_at).toBe(iso(T0 + BRIEF_RETENTION_MS));
    });

    it('returns the winner when a concurrent start creates the document first', async () => {
      fake.beforeIndex.mockImplementationOnce((id) => {
        fake.put(id, {
          schema_version: 1,
          owner,
          space_id: spaceId,
          job: { id: 'winner', status: 'pending', started_at: iso(T0), heartbeat_at: iso(T0) },
          expires_at: iso(T0 + BRIEF_RETENTION_MS),
        });
      });

      const started = await store.startJob({ owner, spaceId, jobId: 'loser' });

      expect(started).toEqual(expect.objectContaining({ reused: true }));
      expect(started.job.id).toBe('winner');
    });
  });

  describe('job updates', () => {
    beforeEach(async () => {
      fake.put(docId, succeededDoc());
      await store.startJob({ owner, spaceId, jobId: 'job-1' });
    });

    it('marks the job running, beats and sets the stage only when the job id matches', async () => {
      nowMs = T0 + 1000;
      expect(await store.markRunning({ docId, jobId: 'job-1' })).toBe(true);
      expect(fake.docs.get(docId)?.source.job).toEqual(
        expect.objectContaining({
          status: 'running',
          stage: 'gather',
          heartbeat_at: iso(T0 + 1000),
        })
      );

      nowMs = T0 + 2000;
      expect(await store.heartbeat({ docId, jobId: 'job-1' })).toBe(true);
      expect(await store.setStage({ docId, jobId: 'job-1', stage: 'compose' })).toBe(true);
      expect(fake.docs.get(docId)?.source.job).toEqual(
        expect.objectContaining({ stage: 'compose', heartbeat_at: iso(T0 + 2000) })
      );

      expect(await store.heartbeat({ docId, jobId: 'other' })).toBe(false);
      expect(await store.setStage({ docId, jobId: 'other', stage: 'verify' })).toBe(false);
    });

    it('retries on a version conflict', async () => {
      fake.beforeIndex.mockImplementationOnce((id) => {
        const current = fake.docs.get(id);
        if (current) fake.put(id, current.source);
      });
      expect(await store.heartbeat({ docId, jobId: 'job-1' })).toBe(true);
      expect(fake.client.index).toHaveBeenCalledTimes(3); // start + conflicted + retried
    });

    it('completes the job, replacing the brief and restarting the expiry', async () => {
      nowMs = T0 + 10_000;
      const newBrief = { verdict: { level: 'urgent' } } as unknown as Brief;

      expect(
        await store.completeJob({ docId, jobId: 'job-1', result: { ...result, brief: newBrief } })
      ).toBe(true);

      expect(fake.docs.get(docId)?.source).toEqual({
        schema_version: 1,
        owner,
        space_id: spaceId,
        job: {
          id: 'job-1',
          status: 'succeeded',
          started_at: iso(T0),
          heartbeat_at: iso(T0 + 10_000),
        },
        generated_at: iso(T0 + 10_000),
        expires_at: iso(T0 + 10_000 + BRIEF_RETENTION_MS),
        params,
        model: 'model-x',
        tokens: result.tokens,
        evidence,
        brief: newBrief,
        verification: result.verification,
      });
    });

    it('does not complete a superseded job', async () => {
      nowMs = T0 + 61_000;
      await store.startJob({ owner, spaceId, jobId: 'job-2' });

      expect(await store.completeJob({ docId, jobId: 'job-1', result })).toBe(false);
      expect(fake.docs.get(docId)?.source.job.id).toBe('job-2');
    });

    it('does not recreate a deleted document', async () => {
      await store.delete({ ownerId: owner.id, spaceId });

      expect(await store.completeJob({ docId, jobId: 'job-1', result })).toBe(false);
      expect(fake.docs.has(docId)).toBe(false);
    });

    it('fails the job, keeping the previous brief and its expiry', async () => {
      const before = fake.docs.get(docId)?.source;

      expect(
        await store.failJob({
          docId,
          jobId: 'job-1',
          error: { code: 'llm_error', message: 'boom' },
        })
      ).toBe(true);

      const stored = fake.docs.get(docId)?.source;
      expect(stored?.job).toEqual(
        expect.objectContaining({ status: 'failed', error: { code: 'llm_error', message: 'boom' } })
      );
      expect(stored?.brief).toEqual(brief);
      expect(stored?.expires_at).toBe(before?.expires_at);
    });

    it('does not fail a job that already finished', async () => {
      await store.completeJob({ docId, jobId: 'job-1', result });
      expect(
        await store.failJob({ docId, jobId: 'job-1', error: { code: 'timeout', message: 'late' } })
      ).toBe(false);
      expect(fake.docs.get(docId)?.source.job.status).toBe('succeeded');
    });
  });

  it('expires a document with no brief 30 days after its failed job started', async () => {
    await store.startJob({ owner, spaceId, jobId: 'job-1' });
    nowMs = T0 + 5000;

    await store.failJob({ docId, jobId: 'job-1', error: { code: 'internal', message: 'x' } });

    expect(fake.docs.get(docId)?.source.expires_at).toBe(iso(T0 + BRIEF_RETENTION_MS));
  });

  describe('get', () => {
    it('returns the owner document with its sequence number', async () => {
      fake.put(docId, succeededDoc());
      const stored = await store.get({ ownerId: owner.id, spaceId });
      expect(stored).toEqual({
        docId,
        document: succeededDoc(),
        seqNo: expect.any(Number),
        primaryTerm: 1,
      });
    });

    it('returns undefined for another space, another owner or an expired document', async () => {
      fake.put(docId, succeededDoc());
      expect(await store.get({ ownerId: owner.id, spaceId: 'other' })).toBeUndefined();
      expect(await store.get({ ownerId: 'someone-else', spaceId })).toBeUndefined();

      nowMs = Date.parse(succeededDoc().expires_at);
      expect(await store.get({ ownerId: owner.id, spaceId })).toBeUndefined();
    });

    it('filters on owner, space and expiry', async () => {
      await store.get({ ownerId: owner.id, spaceId });
      expect(fake.client.search).toHaveBeenCalledWith(
        expect.objectContaining({
          seq_no_primary_term: true,
          query: {
            bool: {
              filter: [
                { ids: { values: [docId] } },
                { term: { 'owner.id': owner.id } },
                { term: { space_id: spaceId } },
                { range: { expires_at: { gt: iso(T0) } } },
              ],
            },
          },
        })
      );
    });
  });

  describe('delete', () => {
    it('deletes the owner document', async () => {
      fake.put(docId, succeededDoc());
      expect(await store.delete({ ownerId: owner.id, spaceId })).toBe(true);
      expect(fake.docs.has(docId)).toBe(false);
    });

    it('returns false when there is nothing to delete', async () => {
      expect(await store.delete({ ownerId: owner.id, spaceId })).toBe(false);
      expect(fake.client.delete).not.toHaveBeenCalled();
    });
  });

  it('counts in-flight jobs with a fresh heartbeat across owners', async () => {
    const job = (id: string, status: 'pending' | 'running' | 'failed', beatAgoMs: number) => ({
      id,
      status,
      started_at: iso(T0 - beatAgoMs),
      heartbeat_at: iso(T0 - beatAgoMs),
    });
    fake.put('a', succeededDoc({ job: job('a', 'running', 1000) }));
    fake.put('b', succeededDoc({ job: job('b', 'pending', 2000) }));
    fake.put('c', succeededDoc({ job: job('c', 'running', 61_000) }));
    fake.put('d', succeededDoc({ job: job('d', 'failed', 1000) }));
    fake.put('e', succeededDoc());

    expect(await store.countRunning()).toBe(2);
  });

  describe('deleteExpired', () => {
    it('deletes by query with conflicts proceed', async () => {
      esClient.deleteByQuery.mockResolvedValue({ deleted: 3 });
      const abortController = new AbortController();

      expect(await store.deleteExpired({ abortSignal: abortController.signal })).toBe(3);
      expect(esClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          index: EXECUTIVE_BRIEF_INDEX,
          query: { range: { expires_at: { lt: iso(T0) } } },
          conflicts: 'proceed',
        }),
        { signal: abortController.signal }
      );
    });

    it('returns 0 when the index does not exist', async () => {
      esClient.deleteByQuery.mockRejectedValue(responseError(404));
      expect(await store.deleteExpired()).toBe(0);
    });
  });
});

describe('job staleness', () => {
  const now = new Date(T0);
  const job = (status: 'pending' | 'running' | 'succeeded', beatAgoMs?: number) => ({
    id: 'j',
    status,
    started_at: iso(T0 - 90_000),
    ...(beatAgoMs !== undefined ? { heartbeat_at: iso(T0 - beatAgoMs) } : {}),
  });

  it('uses the heartbeat, or the start time when there is none', () => {
    expect(isJobStale(job('running', 59_000), now)).toBe(false);
    expect(isJobStale(job('running', 61_000), now)).toBe(true);
    expect(isJobStale(job('pending'), now)).toBe(true);
    expect(isJobStale(job('succeeded', 120_000), now)).toBe(false);
    expect(isJobActive(job('running', 1000), now)).toBe(true);
    expect(isJobActive(job('succeeded', 1000), now)).toBe(false);
  });

  it('reports a stale job as failed with interrupted', () => {
    const document: BriefDocument = {
      schema_version: 1,
      owner,
      space_id: spaceId,
      job: job('running', 61_000),
      expires_at: iso(T0 + BRIEF_RETENTION_MS),
    };
    expect(withStaleJobAsInterrupted(document, now).job).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: expect.objectContaining({ code: 'interrupted' }),
      })
    );
    const fresh = { ...document, job: job('running', 1000) };
    expect(withStaleJobAsInterrupted(fresh, now)).toBe(fresh);
  });
});
