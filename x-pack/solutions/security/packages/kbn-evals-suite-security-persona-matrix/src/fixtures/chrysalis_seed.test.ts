/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { PARITY_DOCS } from './chrysalis_parity_docs';

const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const fixture = (profile: string) => {
  jest.resetModules();
  process.env.SEED_PROFILE = profile;
  return jest.requireActual<typeof import('./chrysalis_seed')>('./chrysalis_seed');
};

afterEach(() => {
  delete process.env.SEED_PROFILE;
});

describe('Chrysalis fixture ownership', () => {
  it('deletes only tagged parity documents in each snapshot index without deleting streams', async () => {
    const { cleanupChrysalisAlerts } = fixture('parity');
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 3 });
    const deleteDataStream = jest.fn();
    const esClient = { deleteByQuery, indices: { deleteDataStream } } as unknown as EsClient;
    await cleanupChrysalisAlerts({ esClient, log });
    const indices = [...new Set(PARITY_DOCS.map(({ index }) => index))];
    expect(deleteByQuery).toHaveBeenCalledTimes(indices.length);
    expect(deleteByQuery.mock.calls.map(([request]) => request.index)).toEqual(indices);
    for (const [request] of deleteByQuery.mock.calls) {
      const field =
        request.index === 'on-call-schedule' ? 'labels.simulation.keyword' : 'labels.simulation';
      expect(request.query).toEqual({ term: { [field]: 'chrysalis-sim' } });
    }
    expect(deleteDataStream).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('3 Chrysalis parity docs'));
  });

  it('a missing minimal alert index cannot prevent parity cleanup', async () => {
    const { cleanupChrysalisAlerts } = fixture('parity');
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 1 });
    await cleanupChrysalisAlerts({ esClient: { deleteByQuery } as unknown as EsClient, log });
    expect(
      deleteByQuery.mock.calls.every(
        ([request]) => request.index !== '.internal.alerts-security.alerts-default-000001'
      )
    ).toBe(true);
  });

  it('re-stamps all nested parity timestamps, including original and workflow times', async () => {
    const { seedChrysalisAlerts } = fixture('parity');
    const bulk = jest.fn().mockResolvedValue({ errors: false });
    await seedChrysalisAlerts({ esClient: { bulk } as unknown as EsClient, log });
    const sourceDocs = PARITY_DOCS.map(({ doc }) => doc);
    const seeded = bulk.mock.calls.flatMap(([request]) =>
      request.operations.filter((_: unknown, i: number) => i % 2 === 1)
    );
    expect(seeded).toHaveLength(sourceDocs.length);
    for (const key of ['original_time', 'workflow_status_updated_at', 'first_seen', 'last_seen']) {
      const original = JSON.stringify(sourceDocs).match(new RegExp(`"${key}":"([^"]+)"`));
      const shifted = JSON.stringify(seeded).match(new RegExp(`"${key}":"([^"]+)"`));
      expect(original).not.toBeNull();
      expect(shifted).not.toBeNull();
      expect(shifted?.[1]).not.toEqual(original?.[1]);
    }
  });

  it('minimal cleanup deletes only its tagged alerts', async () => {
    const { cleanupChrysalisAlerts } = fixture('minimal');
    const deleteByQuery = jest.fn().mockResolvedValue({ deleted: 2 });
    await cleanupChrysalisAlerts({ esClient: { deleteByQuery } as unknown as EsClient, log });
    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { term: { 'labels.simulation': 'persona-matrix-minimal' } },
      })
    );
  });
});
