/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import {
  __MY_TEAMS_PATH,
  __PLUGIN_OWNERS_PATH,
  __resetPluginOwnersStoreForTests,
  getPluginOwnersStore,
} from './duplicate_detections_owners';

const createFakeHttp = (
  impl: (path: string) => Promise<unknown> = async () => ({ owners: {}, knownTeams: [] })
) => {
  const fetch = jest.fn((path: string) => impl(path));
  const http = { fetch } as unknown as HttpStart;
  return { http, fetch };
};

describe('PluginOwnersStore', () => {
  beforeEach(() => {
    __resetPluginOwnersStoreForTests();
  });

  afterEach(() => {
    __resetPluginOwnersStoreForTests();
  });

  it('starts with an empty snapshot so consumers can render immediately', () => {
    expect(getPluginOwnersStore().get()).toEqual({ owners: {}, knownTeams: [] });
  });

  it('fetches the owners endpoint once and publishes the result on snapshot$', async () => {
    const payload = {
      owners: { synthetics: ['@elastic/actionable-obs-team'] },
      knownTeams: ['@elastic/actionable-obs-team'],
    };
    const { http, fetch } = createFakeHttp(async () => payload);

    const store = getPluginOwnersStore();
    await store.ensureLoaded(http);
    await store.ensureLoaded(http);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(__PLUGIN_OWNERS_PATH, { method: 'GET' });
    expect(store.get()).toEqual(payload);
  });

  it('shares a single in-flight promise across concurrent ensureLoaded() callers', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    const { http, fetch } = createFakeHttp(
      () =>
        new Promise((res) => {
          resolve = res;
        })
    );

    const store = getPluginOwnersStore();
    const a = store.ensureLoaded(http);
    const b = store.ensureLoaded(http);

    expect(fetch).toHaveBeenCalledTimes(1);
    resolve?.({ owners: { slo: ['@elastic/x'] }, knownTeams: ['@elastic/x'] });
    await Promise.all([a, b]);

    expect(store.get().knownTeams).toEqual(['@elastic/x']);
  });

  it('treats fetch failures (e.g. 404 in production) as an empty snapshot', async () => {
    const { http } = createFakeHttp(async () => {
      throw new Error('not found');
    });

    const store = getPluginOwnersStore();
    await store.ensureLoaded(http);

    expect(store.get()).toEqual({ owners: {}, knownTeams: [] });
  });

  it('sanitizes malformed responses (drops non-string entries, ignores extra keys)', async () => {
    const malformed = {
      owners: {
        synthetics: ['@elastic/actionable-obs-team', 42, null, ''],
        bad_plugin: 'not-an-array',
        empty_plugin: [],
      },
      knownTeams: ['@elastic/actionable-obs-team', 99, undefined, ''],
      extraneous: 'ignored',
    };
    const { http } = createFakeHttp(async () => malformed);

    const store = getPluginOwnersStore();
    await store.ensureLoaded(http);

    expect(store.get()).toEqual({
      owners: { synthetics: ['@elastic/actionable-obs-team'] },
      knownTeams: ['@elastic/actionable-obs-team'],
    });
  });

  describe('detectMyTeams', () => {
    it('returns the server payload sanitized into a MyTeamsResult', async () => {
      const payload = {
        detectedEmail: 'shahzad@elastic.co',
        suggestedTeams: [
          { team: '@elastic/actionable-obs-team', evidenceCount: 47 },
          { team: '@elastic/kibana-security', evidenceCount: 3 },
        ],
        matchedFileCount: 50,
        scannedFileCount: 73,
        detectedAt: '2026-05-21T00:00:00.000Z',
      };
      const { http, fetch } = createFakeHttp(async () => payload);

      const result = await getPluginOwnersStore().detectMyTeams(http);

      expect(fetch).toHaveBeenCalledWith(__MY_TEAMS_PATH, { method: 'GET' });
      expect(result).toEqual(payload);
    });

    it('treats a fetch failure as an empty suggestion list (route 404 in non-dev)', async () => {
      const { http } = createFakeHttp(async () => {
        throw new Error('not found');
      });

      const result = await getPluginOwnersStore().detectMyTeams(http);
      expect(result).toEqual({
        detectedEmail: undefined,
        suggestedTeams: [],
        matchedFileCount: 0,
        scannedFileCount: 0,
        detectedAt: expect.any(String),
      });
    });

    it('drops malformed suggestion rows without throwing', async () => {
      const malformed = {
        detectedEmail: 'me@x.com',
        suggestedTeams: [
          { team: '@elastic/ok', evidenceCount: 5 },
          { team: '', evidenceCount: 5 }, // empty team
          { team: '@elastic/no-count' }, // missing evidenceCount
          { evidenceCount: 3 }, // missing team
          null,
          'not-an-object',
        ],
        matchedFileCount: 'not-a-number',
        scannedFileCount: null,
      };
      const { http } = createFakeHttp(async () => malformed);

      const result = await getPluginOwnersStore().detectMyTeams(http);
      expect(result.suggestedTeams).toEqual([{ team: '@elastic/ok', evidenceCount: 5 }]);
      expect(result.matchedFileCount).toBe(0);
      expect(result.scannedFileCount).toBe(0);
    });

    it('re-fetches on every call (the server caches; clients should not)', async () => {
      const { http, fetch } = createFakeHttp(async () => ({
        detectedEmail: 'x@y.z',
        suggestedTeams: [],
        matchedFileCount: 0,
        scannedFileCount: 0,
        detectedAt: '2026-05-21T00:00:00.000Z',
      }));

      const store = getPluginOwnersStore();
      await store.detectMyTeams(http);
      await store.detectMyTeams(http);
      await store.detectMyTeams(http);

      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  it('does not refetch on subsequent ensureLoaded() once a non-empty snapshot is published', async () => {
    const { http, fetch } = createFakeHttp(async () => ({
      owners: { slo: ['@elastic/x'] },
      knownTeams: ['@elastic/x'],
    }));

    const store = getPluginOwnersStore();
    await store.ensureLoaded(http);
    await store.ensureLoaded(http);
    await store.ensureLoaded(http);

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
