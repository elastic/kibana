/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import {
  type RuleBasedSourceInput,
  updateWatchlistWithSources,
  type UpdateWatchlistWithSourcesParams,
} from './update_watchlist_with_sources';
import { createWatchlistValidationError } from './watchlist_config';

const WATCHLIST_ID = 'wl-1';

const createFakes = ({
  sources,
  managed = false,
}: {
  sources: MonitoringEntitySource[];
  managed?: boolean;
}) => {
  const state = {
    watchlist: { id: WATCHLIST_ID, name: 'original', riskModifier: 1, managed },
    linkedSourceIds: sources.map(({ id }) => id),
    sources: new Map(sources.map((source) => [source.id, source])),
    failWatchlistUpdate: false,
    failDeleteOf: undefined as string | undefined,
    failUnlinkOf: undefined as string | undefined,
    nextId: 1,
  };

  // The watchlist name check finds no other watchlist with the name
  const soClient = savedObjectsClientMock.create();
  soClient.find.mockResolvedValue({ saved_objects: [], total: 0, page: 1, per_page: 2 });

  const existingSource = (id: string) => {
    const source = state.sources.get(id);
    return source ? [source] : [];
  };

  const watchlistClient = {
    get: async () => ({
      ...state.watchlist,
      entityCount: 0,
      entitySourceIds: [...state.linkedSourceIds],
    }),
    update: async (_id: string, attrs: { name?: string; riskModifier?: number }) => {
      if (state.failWatchlistUpdate) {
        throw new Error('watchlist update failed');
      }
      state.watchlist = { ...state.watchlist, ...attrs };
      return {
        ...state.watchlist,
        entityCount: 0,
        entitySourceIds: [...state.linkedSourceIds],
      };
    },
    getEntitySourceIds: async () => [...state.linkedSourceIds],
    addEntitySourceReference: async (_id: string, sourceId: string) => {
      state.linkedSourceIds.push(sourceId);
    },
    removeEntitySourceReference: async (_id: string, source: MonitoringEntitySource) => {
      if (state.failUnlinkOf === source.id) {
        throw new Error('unlink failed');
      }
      if (!state.linkedSourceIds.includes(source.id)) {
        throw createWatchlistValidationError(404, 'not linked');
      }
      state.linkedSourceIds = state.linkedSourceIds.filter((id) => id !== source.id);
    },
  };

  const sourceClient = {
    validate: async () => undefined,
    list: async (_query: object, ids?: string[]) => ({
      sources: (ids ?? []).flatMap((id) => existingSource(id)),
      page: 1,
      per_page: 10,
      total: ids?.length ?? 0,
    }),
    create: async (attrs: Partial<MonitoringEntitySource>) => {
      const created = { ...attrs, id: `new-${state.nextId++}` } as MonitoringEntitySource;
      state.sources.set(created.id, created);
      return created;
    },
    update: async (attrs: Partial<MonitoringEntitySource> & { id: string }) => {
      const updated = { ...state.sources.get(attrs.id), ...attrs } as MonitoringEntitySource;
      state.sources.set(attrs.id, updated);
      return updated;
    },
    delete: async (id: string) => {
      if (state.failDeleteOf === id) {
        throw new Error('delete failed');
      }
      state.sources.delete(id);
    },
  };

  /** The sources the watchlist really has: linked to it and still existing. */
  const linkedSources = () => state.linkedSourceIds.flatMap((id) => existingSource(id));

  return { state, soClient, watchlistClient, sourceClient, linkedSources };
};

const indexSource: MonitoringEntitySource = {
  id: 'idx-1',
  type: 'index',
  name: 'original-logs-*',
  indexPattern: 'logs-*',
};
const oktaSource: MonitoringEntitySource = {
  id: 'okta-1',
  type: 'entity_analytics_integration',
  name: 'okta',
  managed: true,
};
const storeInput: RuleBasedSourceInput = {
  type: 'store',
  name: 'renamed-store',
  queryRule: 'risk > 50',
};

const run = (
  fakes: ReturnType<typeof createFakes>,
  overrides: Partial<UpdateWatchlistWithSourcesParams> = {}
) =>
  updateWatchlistWithSources({
    soClient: fakes.soClient,
    watchlistClient:
      fakes.watchlistClient as unknown as UpdateWatchlistWithSourcesParams['watchlistClient'],
    sourceClient: fakes.sourceClient as unknown as UpdateWatchlistWithSourcesParams['sourceClient'],
    request: httpServerMock.createKibanaRequest(),
    logger: loggingSystemMock.createLogger(),
    watchlistId: WATCHLIST_ID,
    watchlist: { name: 'renamed', riskModifier: 1 },
    entitySources: [storeInput],
    ...overrides,
  });

describe('updateWatchlistWithSources', () => {
  describe('when the save is valid', () => {
    it('replaces the data source and renames the watchlist, keeping integration sources', async () => {
      const fakes = createFakes({ sources: [indexSource, oktaSource] });

      const result = await run(fakes);

      expect(result.watchlist.name).toBe('renamed');
      expect(fakes.linkedSources().map(({ name }) => name)).toEqual(['okta', 'renamed-store']);
      // The returned watchlist lists the sources it has after the save, without the removed one
      expect(result.watchlist.entitySourceIds).toEqual(['okta-1', 'new-1']);
      expect(result.shouldSync).toBe(true);
    });

    it('does not ask for a sync when an update in place does not change what the source matches', async () => {
      const fakes = createFakes({ sources: [indexSource] });

      const result = await run(fakes, {
        entitySources: [{ type: 'index', name: 'renamed-logs-*', indexPattern: 'logs-*' }],
      });

      expect(fakes.linkedSources()).toEqual([
        expect.objectContaining({ id: 'idx-1', name: 'renamed-logs-*' }),
      ]);
      expect(result.shouldSync).toBe(false);
    });

    it('asks for a sync when an update in place changes what the source matches', async () => {
      const fakes = createFakes({ sources: [indexSource] });

      const result = await run(fakes, {
        entitySources: [
          { type: 'index', name: 'original-logs-*', indexPattern: 'logs-*', queryRule: 'a: b' },
        ],
      });

      expect(result.shouldSync).toBe(true);
    });

    it('asks for a sync when the rule-based sources are removed, keeping integration sources', async () => {
      const fakes = createFakes({ sources: [indexSource, oktaSource] });

      const result = await run(fakes, { entitySources: [] });

      expect(fakes.linkedSources().map(({ id }) => id)).toEqual(['okta-1']);
      expect(result.shouldSync).toBe(true);
    });
  });

  it('rejects two data sources of the same type and changes nothing', async () => {
    const fakes = createFakes({ sources: [indexSource], managed: true });

    await expect(
      run(fakes, {
        watchlist: { name: 'original', riskModifier: 1 },
        entitySources: [storeInput, { ...storeInput, name: 'another-store' }],
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(fakes.state.watchlist.name).toBe('original');
    expect(fakes.linkedSources().map(({ id }) => id)).toEqual(['idx-1']);
  });

  describe('when removing the old data source goes wrong', () => {
    it('keeps it linked if it cannot be deleted, so a later save finds it again', async () => {
      const fakes = createFakes({ sources: [indexSource] });
      fakes.state.failDeleteOf = 'idx-1';

      await expect(run(fakes)).rejects.toThrow('delete failed');

      // The new source and the rename were saved, and the old source is still linked
      expect(fakes.state.watchlist.name).toBe('renamed');
      expect(fakes.linkedSources().map(({ type }) => type)).toEqual(['index', 'store']);
    });

    it('still succeeds if the deleted source cannot be unlinked', async () => {
      const fakes = createFakes({ sources: [indexSource] });
      fakes.state.failUnlinkOf = 'idx-1';

      const result = await run(fakes);

      expect(result.watchlist.name).toBe('renamed');
      expect(fakes.state.sources.has('idx-1')).toBe(false);
      expect(fakes.linkedSources().map(({ type }) => type)).toEqual(['store']);
    });
  });

  it('removes the sources it created and keeps the old one if the watchlist cannot be updated', async () => {
    const fakes = createFakes({ sources: [indexSource] });
    fakes.state.failWatchlistUpdate = true;

    await expect(run(fakes)).rejects.toThrow('watchlist update failed');

    expect(fakes.state.watchlist.name).toBe('original');
    expect(fakes.linkedSources().map(({ id }) => id)).toEqual(['idx-1']);
    expect([...fakes.state.sources.keys()]).toEqual(['idx-1']);
  });
});
