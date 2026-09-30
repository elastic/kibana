/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notFound } from '@hapi/boom';
import type { MemoryPage } from '../../common/memory';
import { getMemoryLineageRoute, MAX_LINEAGE_DEPTH } from './get_memory_lineage';

const { handler } = getMemoryLineageRoute['GET /internal/nightshift/memory/pages/{id}/lineage'];

const memory = (id: string, mergedFrom: string[] = []): MemoryPage =>
  ({
    id,
    slug: id.replace('memory_', ''),
    title: `Memory ${id}`,
    content: '',
    tags: ['memory'],
    archived: false,
    categories: [],
    references: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: 'investigator',
    updated_by: 'investigator',
    merged_from: mergedFrom,
    telemetry: {
      impressions: 10,
      conversions: 5,
      last_impression_time: '2026-01-01T00:00:00.000Z',
    },
  } as unknown as MemoryPage);

/** Serves the walk from a graph of `id -> merged_from`, one mget per level. */
const run = (root: MemoryPage | undefined, graph: Record<string, string[]>, enabled = true) => {
  const store = {
    get: jest.fn().mockResolvedValue(root),
    getMany: jest
      .fn()
      .mockImplementation(async (ids: string[]) => ids.map((id) => memory(id, graph[id] ?? []))),
  };
  const result = handler({
    request: {},
    params: { path: { id: root?.id ?? 'memory_missing' } },
    isMemoryEnabled: () => enabled,
    getMemoryPageStore: () => store,
  } as never);
  return { store, result };
};

describe('getMemoryLineageRoute', () => {
  it('returns no ancestors and a zero depth for a memory with no merges', async () => {
    const { result } = run(memory('memory_root'), {});
    await expect(result).resolves.toEqual({ ancestors: [], depth: 0 });
  });

  it('reports the depth actually walked, not the cap', async () => {
    // A single-level chain must report 1. Reporting MAX_LINEAGE_DEPTH whenever
    // any ancestor existed overstated every chain as maximally deep.
    const { result } = run(memory('memory_root', ['memory_a']), { memory_a: [] });

    await expect(result).resolves.toEqual({
      ancestors: [expect.objectContaining({ id: 'memory_a' })],
      depth: 1,
    });
  });

  it('counts each level of a multi-level chain', async () => {
    const { result } = run(memory('memory_root', ['memory_a']), {
      memory_a: ['memory_b'],
      memory_b: ['memory_c'],
      memory_c: [],
    });

    const lineage = await result;

    expect(lineage.depth).toBe(3);
    expect(lineage.ancestors.map((a: { id: string }) => a.id)).toEqual([
      'memory_a',
      'memory_b',
      'memory_c',
    ]);
  });

  it('reports the cap when the chain is longer than the walk allows', async () => {
    // A chain deeper than the cap must say it stopped at the cap.
    const deep: Record<string, string[]> = {};
    for (let i = 0; i < MAX_LINEAGE_DEPTH + 3; i++) {
      deep[`memory_${i}`] = [`memory_${i + 1}`];
    }
    const { result } = run(memory('memory_root', ['memory_0']), deep);

    const lineage = await result;

    expect(lineage.depth).toBe(MAX_LINEAGE_DEPTH);
    expect(lineage.ancestors).toHaveLength(MAX_LINEAGE_DEPTH);
  });

  it('terminates on a cycle instead of looping', async () => {
    const { store, result } = run(memory('memory_root', ['memory_a']), {
      memory_a: ['memory_b'],
      memory_b: ['memory_a'],
    });

    const lineage = await result;

    expect(lineage.ancestors.map((a: { id: string }) => a.id)).toEqual(['memory_a', 'memory_b']);
    expect(store.getMany).toHaveBeenCalledTimes(2);
  });

  it('reads a level with one mget rather than a get per ancestor', async () => {
    const { store, result } = run(memory('memory_root', ['memory_a', 'memory_b']), {
      memory_a: [],
      memory_b: [],
    });

    await result;

    expect(store.getMany).toHaveBeenCalledTimes(1);
    expect(store.getMany).toHaveBeenCalledWith(['memory_a', 'memory_b']);
    expect(store.get).toHaveBeenCalledTimes(1);
  });

  it('throws not found when the memory does not exist', async () => {
    const { result } = run(undefined, {});
    await expect(result).rejects.toEqual(
      notFound('Semantic Memory page memory_missing was not found')
    );
  });

  it('throws not found when Semantic Memory is disabled', async () => {
    const { store, result } = run(memory('memory_root'), {}, false);
    await expect(result).rejects.toEqual(notFound('Semantic Memory is not enabled'));
    expect(store.get).not.toHaveBeenCalled();
  });
});
