/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { CORPUS_NAMES } from './constants';
import { hasEvidence, partitionByEvidence } from './cohort';
import { loadCorpus, loadCorpusExamples } from './corpus_loader';
import { buildEvidence, EVIDENCE_PROVENANCE } from './evidence';
import {
  buildAttackDiscoveryFromPayload,
  seedCitedAlerts,
  seedRawEvidence,
  type EsClientLike,
} from './workflow_task';

interface AlertDoc {
  host: { id: string };
  user: { name: string };
}

const log = { info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() };
const toolingLog = log as unknown as ToolingLog;

const eventCases = CORPUS_NAMES.flatMap((name) => loadCorpus(name)).filter((c) =>
  hasEvidence(c.payload)
);

describe('buildEvidence over the real corpus', () => {
  it('finds the 39 event-bearing rows and 978 rows without events', () => {
    const all = CORPUS_NAMES.flatMap((name) => loadCorpusExamples(name));
    const { scored, excluded } = partitionByEvidence(all);
    expect(all).toHaveLength(1017);
    expect(scored).toHaveLength(39);
    expect(excluded).toBe(978);
  });

  it.each(eventCases.map((c) => [c.case_id, c] as const))(
    '%s: alert, events and entities share one host.id and user.name',
    (_id, c) => {
      const evidence = buildEvidence(c.payload, `ad-${c.case_id}`);
      expect(evidence.identities).toHaveLength(1);
      const [{ host, user }] = evidence.identities;

      const alertDocs: AlertDoc[] = [];
      const es = {
        bulk: async ({ body }: { body: unknown[] }) => {
          for (let i = 1; i < body.length; i += 2) alertDocs.push(body[i] as AlertDoc);
          return { errors: false };
        },
      } as unknown as EsClientLike;
      return seedCitedAlerts(
        { fetch: jest.fn(), log: toolingLog, esClient: es },
        buildAttackDiscoveryFromPayload(c.case_id, c.payload),
        `ad-${c.case_id}`,
        evidence
      ).then(() => {
        expect(alertDocs.length).toBeGreaterThan(0);
        for (const alert of alertDocs) {
          expect(alert.host.id).toBe(host.id);
          expect(alert.user.name).toBe(user.name);
        }
        expect(evidence.events.length).toBeGreaterThan(0);
        for (const event of evidence.events) {
          expect((event.host as { id: string }).id).toBe(host.id);
          expect((event.user as { name: string }).name).toBe(user.name);
        }
        const hostEntities = evidence.entities.filter((e) => e.entity.type === 'host');
        expect(hostEntities).toHaveLength(1);
        expect((hostEntities[0] as unknown as AlertDoc).host.id).toBe(host.id);
        const userEntities = evidence.entities.filter((e) => e.entity.type === 'user');
        expect(userEntities).toHaveLength(1);
        expect((userEntities[0] as unknown as AlertDoc).user.name).toBe(user.name);
      });
    }
  );

  it('keeps every event timestamp inside the discovery ±2h window', () => {
    for (const c of eventCases) {
      const evidence = buildEvidence(c.payload, `ad-${c.case_id}`);
      const anchor = Date.parse(buildAttackDiscoveryFromPayload(c.case_id, c.payload).timestamp!);
      for (const event of evidence.events) {
        expect(Math.abs(Date.parse(event['@timestamp']) - anchor)).toBeLessThanOrEqual(
          2 * 60 * 60_000
        );
      }
    }
  });

  it('adds no fabricated attributes: entity docs carry only identity, timestamp and provenance', () => {
    for (const c of eventCases) {
      for (const entity of buildEvidence(c.payload, `ad-${c.case_id}`).entities) {
        expect(Object.keys(entity).sort()).toEqual(
          ['@timestamp', 'entity', entity.entity.type, 'labels'].sort()
        );
        expect(Object.keys(entity.entity).sort()).toEqual(['id', 'name', 'type']);
        expect(entity.labels.provenance).toBe(EVIDENCE_PROVENANCE);
        expect(JSON.stringify(entity)).not.toMatch(/criticality|risk|owner|allowlist|asset/i);
      }
    }
  });

  it('uses a distinct host.id per attack discovery so repeated reps do not share evidence', () => {
    const c = eventCases[0];
    const a = buildEvidence(c.payload, 'ad-1').identities[0].host.id;
    const b = buildEvidence(c.payload, 'ad-2').identities[0].host.id;
    expect(a).not.toBe(b);
  });

  it('does not let one case match another case through a shared user.name', () => {
    const hostDocsCarryingUser = eventCases.flatMap((c) =>
      buildEvidence(c.payload, `ad-${c.case_id}`).entities.filter(
        (e) => e.entity.type === 'host' && 'user' in e
      )
    );
    expect(hostDocsCarryingUser).toEqual([]);
  });

  it('does not pad rows without events', () => {
    const empty = buildEvidence({ Timestamp: '2026-01-01T00:00:00Z' }, 'ad-x');
    expect(empty).toEqual({ events: [], entities: [], identities: [] });
  });

  it('rejects an event without observed host/user names instead of inventing them', () => {
    expect(() =>
      buildEvidence({ events: [{ '@timestamp': '2026-01-01T00:00:00Z', host: {} }] }, 'ad-x')
    ).toThrow(/host\.name\/user\.name/);
  });
});

describe('seedRawEvidence', () => {
  const evidence = buildEvidence(eventCases[0].payload, 'ad-seed');

  const makeClient = (overrides: Partial<EsClientLike> = {}) => {
    const calls = { bulk: [] as Array<{ body: unknown[] }>, templates: [] as unknown[] };
    const client = {
      get: jest.fn(),
      deleteByQuery: jest.fn(),
      bulk: async (p: { body: unknown[] }) => {
        calls.bulk.push(p);
        return { errors: false };
      },
      indices: {
        create: async () => ({}),
        putIndexTemplate: async (p: unknown) => {
          calls.templates.push(p);
          return {};
        },
      },
      ...overrides,
    } as unknown as EsClientLike;
    return { calls, client };
  };

  it('writes events with create ops into endpoint data streams and entities into entities-latest', async () => {
    const { calls, client } = makeClient();
    await seedRawEvidence(
      { fetch: jest.fn(), log: toolingLog, esClient: client },
      evidence,
      'ad-seed'
    );
    const [events, entities] = calls.bulk;
    const eventHeaders = events.body.filter((_, i) => i % 2 === 0) as Array<{
      create: { _index: string };
    }>;
    expect(eventHeaders).toHaveLength(evidence.events.length);
    expect(
      eventHeaders.every((h) => /^logs-endpoint\.events\.\w+-default$/.test(h.create._index))
    ).toBe(true);
    const entityHeaders = entities.body.filter((_, i) => i % 2 === 0) as Array<{
      index: { _index: string };
    }>;
    expect(entityHeaders.every((h) => h.index._index === 'entities-latest-default')).toBe(true);
    expect(calls.templates).toHaveLength(1);
  });

  it('fails loudly when the raw-event bulk reports item errors', async () => {
    const { client } = makeClient({
      bulk: async () => ({ errors: true, items: [{ create: { status: 400 } }] }),
    });
    await expect(
      seedRawEvidence({ fetch: jest.fn(), log: toolingLog, esClient: client }, evidence, 'ad-seed')
    ).rejects.toThrow(/raw events bulk had item errors/);
  });

  it('fails loudly when the entity bulk reports item errors', async () => {
    let n = 0;
    const { client } = makeClient({
      bulk: async () =>
        ++n === 2 ? { errors: true, items: [{ index: { status: 400 } }] } : { errors: false },
    });
    await expect(
      seedRawEvidence({ fetch: jest.fn(), log: toolingLog, esClient: client }, evidence, 'ad-seed')
    ).rejects.toThrow(/entities bulk had item errors/);
  });

  it('fails loudly without an ES client for a row that carries events', async () => {
    await expect(
      seedRawEvidence({ fetch: jest.fn(), log: toolingLog }, evidence, 'ad-seed')
    ).rejects.toThrow(/No esClient/);
  });

  it('seeds nothing for a row without events', async () => {
    const { calls, client } = makeClient();
    await seedRawEvidence(
      { fetch: jest.fn(), log: toolingLog, esClient: client },
      buildEvidence({}, 'ad-none'),
      'ad-none'
    );
    expect(calls.bulk).toHaveLength(0);
  });
});
