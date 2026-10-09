/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { buildLabels, sampleBase, seededDocId } from '../datasets/labels';
import { loadManifest, loadSamples, type CorpusSample } from '../fixtures/load_corpus';
import {
  PhaseSeeder,
  buildPhasePlan,
  rebaseTimestamp,
  seededIndexNames,
  stripAzqaEntityIds,
} from './seeder';

const samples = loadSamples();
const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);

const twinSample = (): Record<string, CorpusSample> => ({
  'aaaaaaaa-twin.json': {
    chain: 'c',
    step: 's',
    positive: {
      docs: [
        { stream: 'logs-a', at: -60, doc: { host: { name: 'h1' }, msg: 'bad' } },
        { stream: 'logs-a', at: -30, doc: { host: { name: 'h1' }, msg: 'same' } },
      ],
    },
    negative: {
      docs: [
        { stream: 'logs-a', at: -60, doc: { host: { name: 'h1' }, msg: 'changed' } },
        { stream: 'logs-a', at: -30, doc: { host: { name: 'h1' }, msg: 'same' } },
      ],
    },
    fixtures: [
      { stream: 'logs-ti', at: -3600, doc: { threat: { indicator: { ip: '203.0.113.1' } } } },
    ],
  },
});

describe('buildPhasePlan', () => {
  it('E0 seeds only fixtures; E+ adds positive docs; E- adds negative docs', () => {
    const s = twinSample();
    const e0 = buildPhasePlan('E0', s, NOW);
    const ep = buildPhasePlan('E+', s, NOW);
    const em = buildPhasePlan('E-', s, NOW);
    expect(e0.docs.map((d) => d.id)).toEqual(['aaaaaaaa#0#fixture']);
    expect(ep.docs.map((d) => d.id)).toEqual([
      'aaaaaaaa#0#fixture',
      'aaaaaaaa#0#positive',
      'aaaaaaaa#1#positive',
    ]);
    expect(em.docs.map((d) => d.id)).toEqual([
      'aaaaaaaa#0#fixture',
      'aaaaaaaa#0#negative',
      'aaaaaaaa#1#negative',
    ]);
  });

  it('indexes into `${stream}-default` with the explicit label-space id', () => {
    const ep = buildPhasePlan('E+', twinSample(), NOW);
    const pos = ep.docs.find((d) => d.id === seededDocId('aaaaaaaa', 0, 'positive'));
    expect(pos?.index).toBe('logs-a-default');
  });

  it('splits E- twins into changed vs retained and lists fixtures', () => {
    const em = buildPhasePlan('E-', twinSample(), NOW);
    expect(em.buckets.twinChanged).toEqual(['aaaaaaaa#0#negative']);
    expect(em.buckets.twinRetained).toEqual(['aaaaaaaa#1#negative']);
    expect(em.buckets.fixture).toEqual(['aaaaaaaa#0#fixture']);
    expect(em.buckets.noise).toEqual([]);
  });

  it('rebases `at` seconds relative to now into ISO timestamps', () => {
    expect(rebaseTimestamp(-3600, NOW)).toBe('2026-10-09T11:00:00.000Z');
    const ep = buildPhasePlan('E+', twinSample(), NOW);
    expect(ep.docs.find((d) => d.id === 'aaaaaaaa#0#positive')?.body['@timestamp']).toBe(
      '2026-10-09T11:59:00.000Z'
    );
  });

  it('produces ids that are exactly the label-space ids for the real corpus', () => {
    const labels = buildLabels({ manifest: loadManifest(), samples });
    const ep = new Set(buildPhasePlan('E+', samples, NOW).docs.map((d) => d.id));
    for (const b of labels.plantedBehaviours) {
      for (const id of b.positiveDocIds ?? []) expect(ep).toContain(id);
    }
    expect(ep.size).toBe(buildPhasePlan('E+', samples, NOW).docs.length); // ids are unique
  });

  it('seeds every stream the plan can write to into the reset set', () => {
    const names = new Set(seededIndexNames(samples));
    for (const phase of ['E0', 'E+', 'E-'] as const) {
      for (const d of buildPhasePlan(phase, samples, NOW).docs) expect(names).toContain(d.index);
    }
  });
});

describe('stripAzqaEntityIds', () => {
  it('drops azqa-* string values at any depth, including inside arrays', () => {
    expect(
      stripAzqaEntityIds({
        a: 'azqa-1',
        b: { c: 'keep', d: 'azqa-2' },
        e: ['azqa-3', 'keep', { f: 'azqa-4', g: 1 }],
      })
    ).toEqual({ b: { c: 'keep' }, e: ['keep', { g: 1 }] });
  });

  it('removes azqa-* ids from every doc the real corpus seeds', () => {
    for (const phase of ['E+', 'E-'] as const) {
      for (const d of buildPhasePlan(phase, samples, NOW).docs) {
        expect(JSON.stringify(d.body)).not.toContain('"azqa-');
      }
    }
  });
});

describe('PhaseSeeder', () => {
  const makeClient = (
    bulkResult: { errors: boolean; items: unknown[] } = { errors: false, items: [] }
  ) => {
    const calls: string[] = [];
    const bulk = jest.fn(async (_req: unknown) => {
      calls.push('bulk');
      return bulkResult;
    });
    const deleteByQuery = jest.fn(async (_req: unknown) => {
      calls.push('reset');
      return {};
    });
    return { client: { bulk, deleteByQuery } as unknown as Client, bulk, deleteByQuery, calls };
  };

  it('resets every seeded index before bulk-indexing, with refresh and create ops', async () => {
    const { client, bulk, deleteByQuery, calls } = makeClient();
    const plan = await new PhaseSeeder(client, twinSample()).seed('E+', NOW);
    expect(calls).toEqual(['reset', 'bulk']);
    expect(deleteByQuery.mock.calls[0][0]).toMatchObject({
      index: ['logs-a-default', 'logs-ti-default'],
      refresh: true,
    });
    const req = bulk.mock.calls[0][0] as { operations: unknown[]; refresh: string };
    expect(req.refresh).toBe('wait_for');
    expect(req.operations).toHaveLength(plan.docs.length * 2);
    expect(req.operations[0]).toEqual({
      create: { _index: 'logs-ti-default', _id: 'aaaaaaaa#0#fixture' },
    });
  });

  it('throws on any bulk item error so a half-seeded phase never runs', async () => {
    const { client } = makeClient({
      errors: true,
      items: [{ create: { _id: 'aaaaaaaa#0#fixture', error: { type: 'boom' } } }],
    });
    await expect(new PhaseSeeder(client, twinSample()).seed('E0', NOW)).rejects.toThrow(
      /seeding E0 failed: aaaaaaaa#0#fixture/
    );
  });

  it('sample base is the first 8 chars of the file name', () => {
    expect(sampleBase('00140285-abc.json')).toBe('00140285');
  });
});
