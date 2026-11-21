/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { KnowledgeEntry } from '../feeds/types';
import { BULK_BATCH, LAST_SEEN_REFRESH_MS, MGET_BATCH } from './constants';
import { toKnowledgeDoc } from './knowledge_doc';
import { writeKnowledge } from './writer';

const NOW = '2026-11-13T10:00:00.000Z';
const os = { family: 'ubuntu', version: 'noble' };
const context = { source: 'ubuntu' as const, os, now: NOW };

const entryFor = (n: number): KnowledgeEntry => ({
  kind: 'cve',
  id: `CVE-2026-${n}`,
  description: `Description ${n}`,
});
const idFor = (n: number) => `cve:ubuntu:noble:CVE-2026-${n}`;

const build = (count: number) => {
  const knowledge = new Map<string, KnowledgeEntry>();
  for (let n = 0; n < count; n++) knowledge.set(idFor(n), entryFor(n));
  return { knowledge, ids: new Set(knowledge.keys()) };
};

const params = (count: number) => ({ ...build(count), source: 'ubuntu' as const, os, now: NOW });

interface MgetHit {
  found: boolean;
  _source?: Record<string, string>;
}

/** Stores the doc for `n` as the writer would, optionally last seen `ageMs` ago. */
const stored = (n: number, ageMs = 0): MgetHit => {
  const doc = toKnowledgeDoc(idFor(n), entryFor(n), context);
  return {
    found: true,
    _source: {
      content_hash: doc.content_hash,
      last_seen_in_feed: new Date(Date.parse(NOW) - ageMs).toISOString(),
    },
  };
};

const mockMget = (
  es: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
  hit: (n: number) => MgetHit
) =>
  es.mget.mockImplementation((async ({ ids }: { ids: string[] }) => ({
    docs: ids.map((id) => ({ _id: id, ...hit(Number(id.split('-').pop())) })),
  })) as never);

describe('writeKnowledge', () => {
  it('indexes docs that are not stored yet and counts them as written', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    mockMget(es, () => ({ found: false }));
    es.bulk.mockResolvedValue({ errors: false, items: [], took: 1 } as never);

    const result = await writeKnowledge(es, params(3));

    expect(result).toEqual({ written: 3, unchanged: 0, failed: 0 });
    const [{ operations }] = es.bulk.mock.calls[0] as unknown as [{ operations: unknown[] }];
    expect(operations).toHaveLength(6);
    expect(operations[0]).toEqual({
      index: { _index: 'security_solution-native_knowledge.vulnerability_latest-1', _id: idFor(0) },
    });
  });

  it('writes only the ids the findings reference', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    mockMget(es, () => ({ found: false }));
    es.bulk.mockResolvedValue({ errors: false, items: [], took: 1 } as never);
    const { knowledge } = build(5);

    const result = await writeKnowledge(es, {
      ...params(0),
      knowledge,
      ids: new Set([idFor(1), idFor(3), 'cve:ubuntu:noble:CVE-9999-0']),
    });

    expect(result.written).toBe(2);
    expect(es.mget).toHaveBeenCalledTimes(1);
    expect((es.mget.mock.calls[0][0] as { ids: string[] }).ids).toEqual([idFor(1), idFor(3)]);
  });

  it('skips the bulk entirely when every stored hash matches and was seen today', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    mockMget(es, (n) => stored(n, 60 * 1000));

    const result = await writeKnowledge(es, params(4));

    expect(result).toEqual({ written: 0, unchanged: 4, failed: 0 });
    expect(es.bulk).not.toHaveBeenCalled();
  });

  it('re-indexes a doc whose text changed', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    mockMget(es, (n) =>
      n === 1
        ? { found: true, _source: { content_hash: 'old', last_seen_in_feed: NOW } }
        : stored(n, 1000)
    );
    es.bulk.mockResolvedValue({ errors: false, items: [], took: 1 } as never);

    const result = await writeKnowledge(es, params(3));

    expect(result).toEqual({ written: 1, unchanged: 2, failed: 0 });
    const [{ operations }] = es.bulk.mock.calls[0] as unknown as [{ operations: unknown[] }];
    expect(operations[0]).toMatchObject({ index: { _id: idFor(1) } });
  });

  it('refreshes last_seen_in_feed with a partial update once the stored value is a day old', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    mockMget(es, (n) => stored(n, n === 0 ? LAST_SEEN_REFRESH_MS : LAST_SEEN_REFRESH_MS - 1000));
    es.bulk.mockResolvedValue({ errors: false, items: [], took: 1 } as never);

    const result = await writeKnowledge(es, params(2));

    expect(result).toEqual({ written: 0, unchanged: 2, failed: 0 });
    expect(es.bulk).toHaveBeenCalledTimes(1);
    const [{ operations }] = es.bulk.mock.calls[0] as unknown as [{ operations: unknown[] }];
    expect(operations).toEqual([
      {
        update: {
          _index: 'security_solution-native_knowledge.vulnerability_latest-1',
          _id: idFor(0),
        },
      },
      { doc: { last_seen_in_feed: NOW } },
    ]);
  });

  it('does not count a failed touch as a write or a failure', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    mockMget(es, (n) => stored(n, LAST_SEEN_REFRESH_MS * 2));
    es.bulk.mockResolvedValue({
      errors: true,
      items: [{ update: { error: { type: 'x' } } }],
      took: 1,
    } as never);

    expect(await writeKnowledge(es, params(1))).toEqual({ written: 0, unchanged: 1, failed: 0 });
  });

  it('counts per-item bulk failures', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    mockMget(es, () => ({ found: false }));
    es.bulk.mockResolvedValue({
      errors: true,
      items: [
        { index: { status: 201 } },
        { index: { error: { type: 'strict_dynamic_mapping_exception' } } },
        { index: { status: 201 } },
      ],
      took: 1,
    } as never);

    expect(await writeKnowledge(es, params(3))).toEqual({ written: 2, unchanged: 0, failed: 1 });
  });

  it('batches mget at 1000 ids and bulk at 500 docs', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();
    mockMget(es, () => ({ found: false }));
    es.bulk.mockResolvedValue({ errors: false, items: [], took: 1 } as never);
    const count = MGET_BATCH * 2 + 1;

    const result = await writeKnowledge(es, params(count));

    expect(result.written).toBe(count);
    expect(es.mget.mock.calls.map(([req]) => (req as { ids: string[] }).ids.length)).toEqual([
      MGET_BATCH,
      MGET_BATCH,
      1,
    ]);
    expect(es.bulk).toHaveBeenCalledTimes(Math.ceil(count / BULK_BATCH));
    for (const [request] of es.bulk.mock.calls) {
      expect((request as { operations: unknown[] }).operations.length).toBeLessThanOrEqual(
        BULK_BATCH * 2
      );
    }
  });

  it('makes no calls when no referenced id has text', async () => {
    const es = elasticsearchServiceMock.createElasticsearchClient();

    const result = await writeKnowledge(es, {
      ...params(0),
      ids: new Set(['cve:ubuntu:noble:CVE-1-1']),
    });

    expect(result).toEqual({ written: 0, unchanged: 0, failed: 0 });
    expect(es.mget).not.toHaveBeenCalled();
    expect(es.bulk).not.toHaveBeenCalled();
  });
});
