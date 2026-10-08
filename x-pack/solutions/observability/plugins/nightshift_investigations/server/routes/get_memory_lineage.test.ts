/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notFound } from '@hapi/boom';
import type { MemoryPage } from '../../common/memory';
import { getMemoryLineageRoute } from './get_memory_lineage';

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

/** Serves the route from a graph of `id -> merged_from`, and reports only the ids it can resolve. */
const run = (root: MemoryPage | undefined, graph: Record<string, string[]>, enabled = true) => {
  const store = {
    get: jest.fn().mockResolvedValue(root),
    getMany: jest
      .fn()
      .mockImplementation(async (ids: string[]) =>
        ids.filter((id) => id in graph).map((id) => memory(id, graph[id] ?? []))
      ),
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
  it('returns no sources for a memory with no merges', async () => {
    const { store, result } = run(memory('memory_root'), {});

    await expect(result).resolves.toEqual({ sources: [] });
    // Nothing to read, so the store is not asked.
    expect(store.getMany).not.toHaveBeenCalled();
  });

  it('reports the direct sources of a merge', async () => {
    const { result } = run(memory('memory_root', ['memory_a', 'memory_b']), {
      memory_a: [],
      memory_b: [],
    });

    const lineage = await result;

    expect(lineage.sources).toEqual([
      { id: 'memory_a', title: 'Memory memory_a' },
      { id: 'memory_b', title: 'Memory memory_b' },
    ]);
  });

  it('does not walk past the direct sources', async () => {
    // `memory_a` was itself merged from `memory_b`. Reporting `memory_b` would be
    // a chain where the data records a fan-in, so only the direct source is read.
    const { store, result } = run(memory('memory_root', ['memory_a']), {
      memory_a: ['memory_b'],
      memory_b: [],
    });

    const lineage = await result;

    expect(lineage.sources.map(({ id }: { id: string }) => id)).toEqual(['memory_a']);
    expect(store.getMany).toHaveBeenCalledTimes(1);
    expect(store.getMany).toHaveBeenCalledWith(['memory_a']);
    expect(store.get).toHaveBeenCalledTimes(1);
  });

  it('reads every source in one mget rather than a get per source', async () => {
    const { store, result } = run(memory('memory_root', ['memory_a', 'memory_b']), {
      memory_a: [],
      memory_b: [],
    });

    await result;

    expect(store.getMany).toHaveBeenCalledTimes(1);
    expect(store.getMany).toHaveBeenCalledWith(['memory_a', 'memory_b']);
  });

  it('drops a source that no longer exists rather than reporting an empty crumb', async () => {
    // The store archives merge sources rather than deleting them, but one that is
    // gone must not appear as a link to nothing.
    const { result } = run(memory('memory_root', ['memory_a', 'memory_deleted']), {
      memory_a: [],
    });

    const lineage = await result;

    expect(lineage.sources.map(({ id }: { id: string }) => id)).toEqual(['memory_a']);
  });

  it('reports the real sources of a memory that lists itself among them', async () => {
    // Documents written before the write path stopped naming the target carry the
    // target's own id alongside the memories it really merged from. Skipping that
    // id must not cost the sources behind it.
    const { store, result } = run(memory('memory_root', ['memory_root', 'memory_a']), {
      memory_a: [],
    });

    const lineage = await result;

    expect(lineage.sources.map(({ id }: { id: string }) => id)).toEqual(['memory_a']);
    // The self id is dropped before the read, so the source is fetched once.
    expect(store.getMany).toHaveBeenCalledWith(['memory_a']);
  });

  it('emits nothing for a memory that lists only itself as its own source', async () => {
    const { store, result } = run(memory('memory_root', ['memory_root']), {});

    await expect(result).resolves.toEqual({ sources: [] });
    expect(store.getMany).not.toHaveBeenCalled();
  });

  it('reports a source listed twice only once', async () => {
    const { result } = run(memory('memory_root', ['memory_a', 'memory_a']), { memory_a: [] });

    const lineage = await result;

    expect(lineage.sources.map(({ id }: { id: string }) => id)).toEqual(['memory_a']);
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
