/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { SyncFingerprintInputs } from './incremental_sync';
import {
  FULL_SYNC_INTERVAL_MS,
  getChangedMonitorsFilter,
  getChangedSince,
  getParamsVersion,
  getSyncFingerprint,
  getUnchangedMonitorsFilter,
  needsFullSync,
} from './incremental_sync';

const inputs: SyncFingerprintInputs = {
  stackVersion: '9.5.0',
  licenseType: 'platinum',
  licenseIssuedTo: 'Elastic',
  kibanaUrl: 'https://kibana.example.com',
  esHosts: ['https://es.example.com:443'],
  apiKeyId: 'key-id',
  paramsVersion: '2:2026-10-01T10:00:00.000Z',
  maintenanceWindows: [
    { id: 'mw-1', updatedAt: '2026-09-01T10:00:00.000Z' },
    { id: 'mw-2', updatedAt: '2026-09-02T10:00:00.000Z' },
  ],
};

describe('getSyncFingerprint', () => {
  it('is the same for the same inputs, whatever the order of the maintenance windows', () => {
    expect(getSyncFingerprint(inputs)).toBe(
      getSyncFingerprint({
        ...inputs,
        maintenanceWindows: [...inputs.maintenanceWindows].reverse(),
      })
    );
  });

  it.each<[string, Partial<SyncFingerprintInputs>]>([
    ['the stack version', { stackVersion: '9.6.0' }],
    ['the license type', { licenseType: 'enterprise' }],
    ['the license holder', { licenseIssuedTo: 'Someone else' }],
    ['the Kibana url', { kibanaUrl: 'https://other.example.com' }],
    ['the Elasticsearch hosts', { esHosts: ['https://other-es.example.com:443'] }],
    ['the API key', { apiKeyId: 'rotated-key-id' }],
    ['a param being added', { paramsVersion: '3:2026-10-02T10:00:00.000Z' }],
    ['a param being edited', { paramsVersion: '2:2026-10-02T10:00:00.000Z' }],
    ['a param being removed', { paramsVersion: '1:2026-10-01T10:00:00.000Z' }],
    [
      'a maintenance window being edited',
      {
        maintenanceWindows: [
          { id: 'mw-1', updatedAt: '2026-09-03T10:00:00.000Z' },
          { id: 'mw-2', updatedAt: '2026-09-02T10:00:00.000Z' },
        ],
      },
    ],
    ['a maintenance window being removed', { maintenanceWindows: [inputs.maintenanceWindows[0]] }],
  ])('changes with %s', (_, change) => {
    expect(getSyncFingerprint({ ...inputs, ...change })).not.toBe(getSyncFingerprint(inputs));
  });
});

describe('needsFullSync', () => {
  const now = Date.parse('2026-10-05T12:00:00.000Z');
  const fingerprint = getSyncFingerprint(inputs);
  const state = {
    lastSyncedAt: '2026-10-05T11:55:00.000Z',
    lastFullSyncAt: '2026-10-05T08:00:00.000Z',
    syncFingerprint: fingerprint,
  };

  it('is false when the last sync was recent and nothing else changed', () => {
    expect(needsFullSync({ state, fingerprint, now })).toBe(false);
  });

  it.each([
    ['nothing has been synced yet', {}],
    ['there is no last sync', { ...state, lastSyncedAt: undefined }],
    ['no full sync was ever recorded', { ...state, lastFullSyncAt: undefined }],
    ['the fingerprint differs', { ...state, syncFingerprint: 'another' }],
    ['the fingerprint was never recorded', { ...state, syncFingerprint: undefined }],
    ['the last full sync is unreadable', { ...state, lastFullSyncAt: 'yesterday-ish' }],
  ])('is true when %s', (_, changedState) => {
    expect(needsFullSync({ state: changedState, fingerprint, now })).toBe(true);
  });

  it('is true once the last full sync is a day old', () => {
    const justUnderADay = new Date(now - FULL_SYNC_INTERVAL_MS + 1).toISOString();
    const aDay = new Date(now - FULL_SYNC_INTERVAL_MS).toISOString();

    expect(
      needsFullSync({
        state: { ...state, lastFullSyncAt: justUnderADay },
        fingerprint,
        now,
      })
    ).toBe(false);
    expect(needsFullSync({ state: { ...state, lastFullSyncAt: aDay }, fingerprint, now })).toBe(
      true
    );
  });
});

describe('changed monitors', () => {
  it('starts a minute before the last sync', () => {
    expect(getChangedSince('2026-10-05T11:55:00.000Z')).toBe('2026-10-05T11:54:00.000Z');
  });

  it('filters on the updated time of both monitor types', () => {
    expect(getChangedMonitorsFilter('2026-10-05T11:54:00.000Z')).toBe(
      '(synthetics-monitor-multi-space.updated_at >= "2026-10-05T11:54:00.000Z" or synthetics-monitor.updated_at >= "2026-10-05T11:54:00.000Z")'
    );
  });

  it('treats everything that is not changed as unchanged, including monitors without an update time', () => {
    expect(getUnchangedMonitorsFilter('2026-10-05T11:54:00.000Z')).toBe(
      `not ${getChangedMonitorsFilter('2026-10-05T11:54:00.000Z')}`
    );
  });
});

describe('getParamsVersion', () => {
  const mockParams = (pages: Array<Array<{ updated_at?: string }>>) => {
    const soClient = savedObjectsRepositoryMock.create();
    const close = jest.fn().mockResolvedValue(undefined);
    soClient.createPointInTimeFinder.mockReturnValue({
      close,
      find: async function* find() {
        for (const savedObjects of pages) {
          yield { saved_objects: savedObjects };
        }
      },
    } as unknown as ReturnType<typeof soClient.createPointInTimeFinder>);
    return { soClient, close };
  };

  it('counts the params and reports the latest time one was saved', async () => {
    const { soClient, close } = mockParams([
      [{ updated_at: '2026-10-01T10:00:00.000Z' }, { updated_at: '2026-10-03T10:00:00.000Z' }],
      [{ updated_at: '2026-10-02T10:00:00.000Z' }],
    ]);

    await expect(getParamsVersion(soClient)).resolves.toBe('3:2026-10-03T10:00:00.000Z');
    expect(close).toHaveBeenCalled();
  });

  it('reads the params of every space without their values', async () => {
    const { soClient } = mockParams([[]]);

    await getParamsVersion(soClient);

    expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'synthetics-param',
        namespaces: ['*'],
        fields: ['key'],
      })
    );
  });

  it('is stable when there are no params', async () => {
    const { soClient } = mockParams([[]]);

    await expect(getParamsVersion(soClient)).resolves.toBe('0:');
  });
});
