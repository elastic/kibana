/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  materializeMemory,
  parseMemoryCatalog,
  parseRecalledSidecar,
  readRecalledIds,
} from './materialize';
import type { MemoryPageStore } from './page_store';
import type { MemoryPage } from '../../common/memory';

const page = (id: string, title: string): MemoryPage => ({
  id,
  slug: id.replace(/^memory_/, ''),
  title,
  content: `${title} body`,
  tags: ['memory'],
  status: 'established',
  agent_id: 'agent-1',
  categories: [],
  references: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  created_by: 'sre',
  updated_by: 'sre',
  telemetry: {
    impressions: 1,
    conversions: 0,
    last_impression_time: '2026-01-01T00:00:00.000Z',
  },
});

const createSession = () => ({
  isReset: false,
  mkdirs: jest.fn().mockResolvedValue([true]),
  writeFiles: jest.fn().mockResolvedValue([]),
  readFiles: jest.fn().mockResolvedValue([{ success: false, content: Buffer.from('') }]),
  statFiles: jest.fn().mockImplementation(async (paths: string[]) =>
    paths.map((path) => ({
      path,
      exists: false,
      is_dir: false,
      size: 0,
      modified_time_sec: 0,
    }))
  ),
});

describe('materializeMemory', () => {
  const candidates = [
    page('memory_a', 'Alpha'),
    page('memory_b', 'Bravo'),
    page('memory_c', 'Charlie'),
  ];

  const createStore = (pages: MemoryPage[]): MemoryPageStore =>
    ({
      list: jest.fn(),
      retrieve: jest.fn().mockResolvedValue(pages),
      get: jest.fn().mockResolvedValue(undefined),
      getByName: jest.fn(),
      upsert: jest.fn(),
      applyCounterUpdates: jest.fn(),
      archive: jest.fn(),
      delete: jest.fn(),
      pruneDuplicates: jest.fn(),
    } as never);

  it('writes only the ranked top-K files, not the full catalog', async () => {
    const store = createStore(candidates);
    const session = createSession();

    const { recalledIds } = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      keepCount: 2,
      sampleBeta: () => 0.5,
    });

    expect(store.retrieve).toHaveBeenCalledWith({ query: undefined, size: 20 });
    expect(recalledIds).toHaveLength(2);
    const pageWrite = session.writeFiles.mock.calls[0][0];
    expect(pageWrite).toHaveLength(2);
    expect(pageWrite.every((file: { path: string }) => file.path.endsWith('.md'))).toBe(true);
  });

  it('browse path reorders with Thompson samples', async () => {
    const store = createStore(candidates);
    const session = createSession();

    const { recalledIds } = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      sampleBeta: jest
        .fn()
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0.2),
    });

    expect(recalledIds).toEqual(['memory_b', 'memory_c', 'memory_a']);
  });

  it('search path keeps Elasticsearch hit order and does not sample', async () => {
    const store = createStore(candidates);
    const sampleBeta = jest.fn(() => 0.99);
    const session = createSession();

    const { recalledIds } = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      query: 'checkout lag',
      sampleBeta,
    });

    expect(store.retrieve).toHaveBeenCalledWith({ query: 'checkout lag', size: 50 });
    expect(store.retrieve).toHaveBeenCalledTimes(1);
    expect(sampleBeta).not.toHaveBeenCalled();
    expect(recalledIds).toEqual(['memory_a', 'memory_b', 'memory_c']);
  });

  it('falls back to browse when the prompt matches no memories', async () => {
    const retrieve = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(candidates);
    const store = createStore([]);
    store.retrieve = retrieve;
    const session = createSession();

    const { recalledIds } = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      query: 'try again',
      keepCount: 2,
      sampleBeta: () => 0.5,
    });

    expect(retrieve).toHaveBeenNthCalledWith(1, { query: 'try again', size: 50 });
    expect(retrieve).toHaveBeenNthCalledWith(2, { size: 20 });
    expect(recalledIds).toHaveLength(2);
  });

  it('writes a recalled-id sidecar for the optimizer', async () => {
    const store = createStore(candidates.slice(0, 1));
    const session = createSession();

    await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
    });

    const sidecar = session.writeFiles.mock.calls[1][0].find(
      (file: { path: string }) => file.path === '/workspace/memories/.recalled.json'
    );
    expect(JSON.parse(sidecar.content.toString('utf8'))).toEqual({ ids: ['memory_a'] });
    const indexWrite = session.writeFiles.mock.calls[1][0].find(
      (file: { path: string }) => file.path === '/workspace/memories/.index.json'
    );
    expect(JSON.parse(indexWrite.content.toString('utf8')).entries).toEqual([
      {
        id: 'memory_a',
        title: 'Alpha',
        path: '/workspace/memories/memory_a.md',
      },
    ]);
    expect(
      session.writeFiles.mock.calls[1][0].some((file: { path: string }) =>
        file.path.endsWith('INDEX.md')
      )
    ).toBe(false);
  });

  it('keeps 15 page files when more candidates match', async () => {
    const many = Array.from({ length: 16 }, (_, index) => page(`memory_p${index}`, `Pad ${index}`));
    const store = createStore(many);
    const session = createSession();

    const { recalledIds } = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      sampleBeta: () => 0.5,
    });

    expect(recalledIds).toHaveLength(15);
    expect(session.writeFiles.mock.calls[0][0]).toHaveLength(15);
  });

  it('unions the conversation catalog and notifies only paths that were not on disk', async () => {
    const turn2 = [page('memory_a', 'Alpha'), page('memory_b', 'Bravo')];
    const store = createStore(turn2);
    store.get = jest.fn().mockImplementation(async (id: string) => {
      if (id === 'memory_a') return page('memory_a', 'Alpha');
      return undefined;
    });
    const session = createSession();
    session.readFiles.mockResolvedValue([
      {
        success: true,
        content: Buffer.from(
          JSON.stringify({
            entries: [
              { id: 'memory_a', title: 'Alpha', path: '/workspace/memories/memory_a.md' },
              {
                id: 'memory_archived',
                title: 'Gone',
                path: '/workspace/memories/memory_archived.md',
              },
            ],
          }),
          'utf8'
        ),
      },
    ]);
    session.statFiles.mockImplementation(async (paths: string[]) =>
      paths.map((path) => ({
        path,
        exists: path.endsWith('memory_a.md'),
        is_dir: false,
        size: 1,
        modified_time_sec: 0,
      }))
    );

    const { recalledIds, notification } = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      sampleBeta: () => 0.5,
    });

    expect(recalledIds).toEqual(['memory_a', 'memory_b']);
    const sidecar = session.writeFiles.mock.calls[1][0].find(
      (file: { path: string }) => file.path === '/workspace/memories/.recalled.json'
    );
    expect(JSON.parse(sidecar.content.toString('utf8'))).toEqual({
      ids: ['memory_a', 'memory_b'],
    });
    const indexWrite = session.writeFiles.mock.calls[1][0].find(
      (file: { path: string }) => file.path === '/workspace/memories/.index.json'
    );
    expect(
      JSON.parse(indexWrite.content.toString('utf8')).entries.map((e: { id: string }) => e.id)
    ).toEqual(['memory_a', 'memory_b']);
    expect(notification).toBe(
      [
        'Semantic memories materialized this turn:',
        '- `/workspace/memories/memory_b.md` — Bravo',
      ].join('\n')
    );
    expect(notification).not.toContain('memory_a.md');
  });

  it('emits an empty notification when every keep-set path already exists', async () => {
    const store = createStore(candidates.slice(0, 1));
    const session = createSession();
    session.statFiles.mockImplementation(async (paths: string[]) =>
      paths.map((path) => ({
        path,
        exists: true,
        is_dir: false,
        size: 1,
        modified_time_sec: 0,
      }))
    );

    const { notification } = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
    });

    expect(notification).toBe('');
  });
});

describe('parseMemoryCatalog', () => {
  it('reads entries and ignores junk', () => {
    expect(
      parseMemoryCatalog(
        JSON.stringify({
          entries: [
            { id: 'memory_a', title: 'Alpha', path: '/workspace/memories/memory_a.md' },
            { id: '', title: 'nope', path: '/x' },
            { title: 'missing id' },
          ],
        })
      )
    ).toEqual([{ id: 'memory_a', title: 'Alpha', path: '/workspace/memories/memory_a.md' }]);
    expect(parseMemoryCatalog('not-json')).toEqual([]);
  });
});

describe('parseRecalledSidecar', () => {
  it('reads string ids and ignores junk', () => {
    expect(parseRecalledSidecar('{"ids":["memory_a","",1,null,"memory_b"]}')).toEqual([
      'memory_a',
      'memory_b',
    ]);
    expect(parseRecalledSidecar('not-json')).toEqual([]);
    expect(parseRecalledSidecar('{"ids":"memory_a"}')).toEqual([]);
  });
});

describe('readRecalledIds', () => {
  it('returns an empty list when the sidecar cannot be read', async () => {
    const ids = await readRecalledIds({
      session: {
        readFiles: jest
          .fn()
          .mockResolvedValue([{ path: '/workspace/memories/.recalled.json', success: false }]),
      } as never,
    });
    expect(ids).toEqual([]);
  });

  it('parses the sidecar written by hydrate', async () => {
    const ids = await readRecalledIds({
      session: {
        readFiles: jest.fn().mockResolvedValue([
          {
            path: '/workspace/memories/.recalled.json',
            success: true,
            content: Buffer.from(JSON.stringify({ ids: ['memory_a'] }), 'utf8'),
          },
        ]),
      } as never,
    });
    expect(ids).toEqual(['memory_a']);
  });
});
