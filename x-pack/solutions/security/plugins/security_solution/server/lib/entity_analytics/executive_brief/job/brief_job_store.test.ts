/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { FIXTURE_JOB_SUCCEEDED } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import { POC_JOB_TIMEOUT_MS } from '../../../../../common/entity_analytics/executive_brief/constants';
import {
  BRIEF_JOB_MAPPINGS,
  createBriefJobStore,
  markInterruptedIfStale,
  STALE_JOB_GRACE_MS,
} from './brief_job_store';

describe('createBriefJobStore', () => {
  const setup = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const store = createBriefJobStore({
      esClient,
      logger: loggingSystemMock.createLogger(),
      spaceId: 'store-space',
      now: () => new Date('2026-10-08T12:00:00.000Z'),
    });
    return { esClient, store };
  };

  it('creates the hidden per-space index once, with snapshot and brief unindexed', async () => {
    const { esClient, store } = setup();
    esClient.indices.exists.mockResolvedValue(false);
    await store.ensureIndex();
    await store.ensureIndex();
    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.entity_analytics.executive-briefs.entity-store-space',
        mappings: BRIEF_JOB_MAPPINGS,
        settings: expect.objectContaining({ hidden: true }),
      })
    );
    expect(BRIEF_JOB_MAPPINGS.properties?.snapshot).toEqual({ type: 'object', enabled: false });
    expect(BRIEF_JOB_MAPPINGS.properties?.brief).toEqual({ type: 'object', enabled: false });
  });

  it('creates, updates (stamping updatedAt) and reads by id', async () => {
    const { esClient, store } = setup();
    await store.create(FIXTURE_JOB_SUCCEEDED);
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fixture-job-1', document: FIXTURE_JOB_SUCCEEDED })
    );
    await store.update('fixture-job-1', { status: 'running' });
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fixture-job-1',
        doc: { status: 'running', updatedAt: '2026-10-08T12:00:00.000Z' },
      })
    );
    esClient.get.mockResolvedValueOnce({
      _index: 'i',
      _id: 'x',
      found: true,
      _source: FIXTURE_JOB_SUCCEEDED,
    });
    expect(await store.get('x')).toEqual(FIXTURE_JOB_SUCCEEDED);
  });

  it('returns undefined for a missing job or a missing index', async () => {
    const { esClient, store } = setup();
    esClient.get.mockResolvedValueOnce({ _index: 'i', _id: 'x', found: false });
    expect(await store.get('x')).toBeUndefined();
    esClient.get.mockResolvedValueOnce({
      error: { type: 'index_not_found_exception' },
      status: 404,
    });
    expect(await store.get('x')).toBeUndefined();
  });
});

describe('markInterruptedIfStale', () => {
  const base = {
    ...FIXTURE_JOB_SUCCEEDED,
    status: 'running' as const,
    updatedAt: '2026-10-08T12:00:00.000Z',
  };
  const t0 = Date.parse(base.updatedAt);

  it('leaves a fresh running job alone', () => {
    expect(markInterruptedIfStale(base, t0 + POC_JOB_TIMEOUT_MS)).toBe(base);
  });

  it('reports interrupted once past timeout plus grace, for pending and running', () => {
    const late = t0 + POC_JOB_TIMEOUT_MS + STALE_JOB_GRACE_MS + 1;
    expect(markInterruptedIfStale(base, late)).toMatchObject({
      status: 'failed',
      error: { code: 'interrupted' },
    });
    expect(markInterruptedIfStale({ ...base, status: 'pending' }, late).status).toBe('failed');
  });

  it('never touches terminal jobs or unparsable timestamps', () => {
    const late = t0 + 10 * POC_JOB_TIMEOUT_MS;
    expect(markInterruptedIfStale(FIXTURE_JOB_SUCCEEDED, late)).toBe(FIXTURE_JOB_SUCCEEDED);
    const bad = { ...base, updatedAt: 'nope' };
    expect(markInterruptedIfStale(bad, late)).toBe(bad);
  });
});
