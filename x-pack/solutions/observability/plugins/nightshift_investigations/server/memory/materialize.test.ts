/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { materializeMemory, parseRecalledSidecar, readRecalledIds } from './materialize';
import type { MemoryPageStore } from './page_store';
import type { MemoryPage } from '../../common/memory';

const page = (id: string, title: string): MemoryPage => ({
  id,
  slug: id.replace(/^memory_/, ''),
  title,
  content: `${title} body`,
  tags: ['memory'],
  status: 'established',
  space_id: 'default',
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
  mkdirs: jest.fn().mockResolvedValue([true]),
  writeFiles: jest.fn().mockResolvedValue([]),
  readFiles: jest.fn(),
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
      get: jest.fn(),
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

    const ids = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      keepCount: 2,
      sampleBeta: () => 0.5,
    });

    expect(store.retrieve).toHaveBeenCalledWith({ query: undefined, size: 20 });
    expect(ids).toHaveLength(2);
    const pageWrite = session.writeFiles.mock.calls[0][0];
    expect(pageWrite).toHaveLength(2);
    expect(pageWrite.every((file: { path: string }) => file.path.endsWith('.md'))).toBe(true);
  });

  it('browse path reorders with Thompson samples', async () => {
    const store = createStore(candidates);
    const session = createSession();

    const ids = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      sampleBeta: jest
        .fn()
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.9)
        .mockReturnValueOnce(0.2),
    });

    expect(ids).toEqual(['memory_b', 'memory_c', 'memory_a']);
  });

  it('search path keeps Elasticsearch hit order and does not sample', async () => {
    const store = createStore(candidates);
    const sampleBeta = jest.fn(() => 0.99);
    const session = createSession();

    const ids = await materializeMemory({
      session: session as never,
      store,
      logger: loggerMock.create(),
      query: 'checkout lag',
      sampleBeta,
    });

    expect(store.retrieve).toHaveBeenCalledWith({ query: 'checkout lag', size: 50 });
    expect(sampleBeta).not.toHaveBeenCalled();
    expect(ids).toEqual(['memory_a', 'memory_b', 'memory_c']);
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
