/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { CoreStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ServiceManagedLocations } from './service_managed_locations';
import { loggerMock } from '@kbn/logging-mocks';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import times from 'lodash/times';
import type { HeartbeatConfig } from '../../common/runtime_types';
import { LocationStatus } from '../../common/runtime_types';
import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
import { mockEncryptedSO } from './utils/mocks';
import { getSyntheticsParams } from './get_synthetics_params';
import { getMaintenanceWindows } from './maintenance_windows/get_maintenance_windows';
import * as apiKeys from './get_api_key';
import * as monitorUpgradeSender from '../routes/telemetry/monitor_upgrade_sender';
import type { SyntheticsServerSetup } from '../types';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { SyntheticsTelemetry } from '../telemetry/synthetics_telemetry';

jest.mock('axios', () => jest.fn());
jest.mock('./get_synthetics_params');
jest.mock('./maintenance_windows/get_maintenance_windows');

const taskManagerSetup = taskManagerMock.createSetup();

const mockCoreStart = coreMock.createStart() as CoreStart;

const mockLicense = () => {
  mockCoreStart.elasticsearch.client.asInternalUser.license.get = jest.fn().mockResolvedValue({
    license: {
      status: 'active',
      uid: 'c5788419-1c6f-424a-9217-da7a0a9151a0',
      type: 'platinum',
      issue_date: '2022-11-29T00:00:00.000Z',
      issue_date_in_millis: 1669680000000,
      expiry_date: '2024-12-31T23:59:59.999Z',
      expiry_date_in_millis: 1735689599999,
      max_nodes: 100,
      max_resource_units: null,
      issued_to: 'Elastic - INTERNAL (development environments)',
      issuer: 'API',
      start_date_in_millis: 1669680000000,
    },
  });
};

const getFakePayload = (locations: HeartbeatConfig['locations']) => {
  return {
    type: 'http',
    enabled: true,
    schedule: {
      number: '3',
      unit: 'm',
    },
    name: 'my mon',
    locations,
    urls: 'http://google.com',
    max_redirects: '0',
    password: '',
    proxy_url: '',
    id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
    fields: { config_id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d' },
    fields_under_root: true,
    secrets: '{}',
  };
};

const getServiceRequests = () =>
  (axios as jest.MockedFunction<typeof axios>).mock.calls.map(([request]) => request as any);

describe('ServiceManagedLocations', () => {
  const mockEsClient = {
    search: jest.fn(),
  };

  const logger = loggerMock.create();

  const telemetry = new SyntheticsTelemetry(coreMock.createSetup().analytics, loggerMock.create());

  const serverMock: SyntheticsServerSetup = {
    logger,
    syntheticsEsClient: mockEsClient,
    authSavedObjectsClient: {
      bulkUpdate: jest.fn(),
    },
    basePath: {
      publicBaseUrl: 'https://localhost:5601',
    },
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
      enabled: true,
    },
    coreStart: mockCoreStart,
    encryptedSavedObjects: mockEncryptedSO(),
    savedObjectsClient: savedObjectsClientMock.create()!,
    telemetry,
    isElasticsearchServerless: false,
    stackVersion: '9.5.0',
  } as unknown as SyntheticsServerSetup;

  const mockConfig = {
    service: {
      devUrl: 'http://localhost',
      manifestUrl: 'https://test-manifest.com',
    },
    enabled: true,
  };

  mockLicense();

  const getMockedService = (locationsNum: number = 1) => {
    const locations = times(locationsNum).map((n) => {
      return {
        id: `loc-${n}`,
        label: `Location ${n}`,
        url: `https://example.com/${n}`,
        geo: {
          lat: 0,
          lon: 0,
        },
        isServiceManaged: true,
        status: LocationStatus.GA,
      };
    });
    serverMock.config = mockConfig;
    if (serverMock.savedObjectsClient) {
      serverMock.savedObjectsClient.find = jest.fn().mockResolvedValue({
        saved_objects: [
          getFakePayload([
            {
              id: `loc-1`,
              label: `Location 1`,
              url: `https://example.com/1`,
              geo: {
                lat: 0,
                lon: 0,
              },
              isServiceManaged: true,
              status: LocationStatus.GA,
            },
          ]),
        ],
        total: 1,
        per_page: 20,
        page: 1,
      });
    }
    const service = new ServiceManagedLocations(serverMock);

    service.httpClient.locations = locations;
    service.locations = locations;
    service.isAllowed = true;

    jest.spyOn(service, 'getOutput').mockResolvedValue({
      output: { hosts: ['es'], api_key: 'i:k' },
    });
    (getSyntheticsParams as jest.Mock).mockResolvedValue({});
    (getMaintenanceWindows as jest.Mock).mockResolvedValue([]);

    return { service, locations };
  };

  beforeEach(() => {
    (axios as jest.MockedFunction<typeof axios>).mockReset();
    jest.clearAllMocks();
  });

  it('setup properly', async () => {
    const service = new ServiceManagedLocations(serverMock);

    expect(service.isAllowed).toEqual(false);

    await service.setup(taskManagerSetup);

    expect(service.isAllowed).toEqual(true);
    expect(service.locations).toEqual([]);
    expect(service.signupUrl).toEqual(null);
  });

  it('setup properly with basic auth', async () => {
    const service = new ServiceManagedLocations(serverMock);

    await service.setup(taskManagerSetup);

    expect(service.isAllowed).toEqual(true);
  });

  it('setup properly with locations with dev', async () => {
    serverMock.config = {
      service: {
        devUrl: 'http://localhost',
        username: 'dev',
        password: '12345',
      },
      enabled: true,
    };
    const service = new ServiceManagedLocations(serverMock);

    await service.setup(taskManagerSetup);

    expect(service.isAllowed).toEqual(true);
    expect(service.locations).toEqual([
      {
        geo: {
          lat: 0,
          lon: 0,
        },
        id: 'dev',
        isInvalid: false,
        label: 'Dev Service',
        url: 'http://localhost',
        isServiceManaged: true,
        status: LocationStatus.EXPERIMENTAL,
      },
      {
        geo: {
          lat: 0,
          lon: 0,
        },
        id: 'dev2',
        isInvalid: false,
        isServiceManaged: true,
        label: 'Dev Service 2',
        status: 'experimental',
        url: 'http://localhost',
      },
    ]);
  });

  describe('addConfig', () => {
    it('saves configs only to the selected locations', async () => {
      const { service, locations } = getMockedService(3);

      const payload = getFakePayload([locations[0]]);

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.addMonitors({ monitor: payload } as any, []);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: locations[0].url + '/monitors',
        })
      );
    });
  });

  describe('apiKey errors', () => {
    const sendErrorTelemetryEventsSpy = jest.spyOn(
      monitorUpgradeSender,
      'sendErrorTelemetryEvents'
    );

    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(apiKeys, 'getAPIKeyForSyntheticsService').mockResolvedValue({
        isValid: false,
        reason: 'invalid',
      });
    });

    it('does not call api and does not throw error when monitors.length === 0', async () => {
      const { service } = getMockedService();
      jest.spyOn(service, 'getOutput').mockRestore();

      serverMock.encryptedSavedObjects = mockEncryptedSO();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.syncAllMonitors(ALL_SPACES_ID);

      expect(axios).not.toHaveBeenCalled();

      expect(serverMock.logger.error).not.toHaveBeenCalledWith(
        'API key is not valid. Cannot push monitor configuration to synthetics public testing locations'
      );
      expect(sendErrorTelemetryEventsSpy).not.toHaveBeenCalled();
    });

    it('emits structured invalidApiKey telemetry when api key is invalid', async () => {
      const { service, locations } = getMockedService();
      jest.spyOn(service, 'getOutput').mockRestore();
      jest.spyOn(apiKeys, 'getAPIKeyForSyntheticsService').mockResolvedValue({
        apiKey: { id: 'key-id', apiKey: 'secret', name: 'service-api-key' },
        isValid: false,
        reason: 'insufficient_privileges',
        missingPrivileges: ['read'],
      });

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        monitors: [
          {
            attributes: getFakePayload([locations[0]]),
          },
        ],
      });

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.syncAllMonitors(ALL_SPACES_ID);

      expect(serverMock.logger.debug).toHaveBeenCalledWith(
        'API key is not valid. Cannot push monitor configuration to synthetics public testing locations'
      );
      expect(sendErrorTelemetryEventsSpy).toHaveBeenCalledWith(
        serverMock.logger,
        telemetry,
        expect.objectContaining({
          type: 'invalidApiKey',
          code: 'insufficient_privileges',
          reason: 'API key is missing required index privileges.',
          message:
            'Failed to push configs. API key is missing required index privileges. Missing privileges: read.',
          stackVersion: '9.5.0',
        })
      );
    });
  });

  describe('syncAllMonitors', () => {
    it('includes the isEdit flag on edit requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.editMonitors({ monitor: payload } as any, true, []);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_edit: true }),
        })
      );
    });

    it('includes the license level flag on edit requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.editMonitors({ monitor: payload } as any, true, []);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ license_level: 'platinum' }),
        })
      );
    });

    it('includes the license level flag on add config requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.addMonitors({ monitor: payload } as any, []);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ license_level: 'platinum' }),
        })
      );
    });

    it('includes the license level flag on push configs requests', async () => {
      const { service, locations } = getMockedService();

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        monitors: [
          {
            attributes: getFakePayload([locations[0]]),
          },
        ],
      });

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.syncAllMonitors(ALL_SPACES_ID);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ license_level: 'platinum' }),
        })
      );
    });

    it.each([
      [true, 'Cannot sync monitors with the Synthetics service. License is expired.'],
      [
        false,
        'Cannot sync monitors with the Synthetics service. Unable to determine license level.',
      ],
    ])(
      'does not call api when license is expired or unavailable',
      async (isExpired, errorMessage) => {
        const { service, locations } = getMockedService();

        mockCoreStart.elasticsearch.client.asInternalUser.license.get = jest
          .fn()
          .mockResolvedValue({
            license: isExpired
              ? {
                  status: 'expired',
                  uid: 'c5788419-1c6f-424a-9217-da7a0a9151a0',
                  type: 'platinum',
                  issue_date: '2022-11-29T00:00:00.000Z',
                  issue_date_in_millis: 1669680000000,
                  expiry_date: '2022-12-31T23:59:59.999Z',
                  expiry_date_in_millis: 1735689599999,
                  max_nodes: 100,
                  max_resource_units: null,
                  issued_to: 'Elastic - INTERNAL (development environments)',
                  issuer: 'API',
                  start_date_in_millis: 1669680000000,
                }
              : undefined,
          });

        serverMock.encryptedSavedObjects = mockEncryptedSO({
          monitors: {
            attributes: getFakePayload([locations[0]]),
          },
        });

        (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

        await expect(service.syncAllMonitors(ALL_SPACES_ID)).rejects.toThrow(errorMessage);
      }
    );
  });

  describe('syncAllMonitors with sync state', () => {
    const MONITOR_TYPE = 'synthetics-monitor-multi-space';

    type MonitorSO = ReturnType<typeof monitorSO>;

    const monitorSO = (
      id: string,
      attributes: Record<string, unknown> = {},
      locations: HeartbeatConfig['locations'] = [
        { id: 'loc-0', label: 'Location 0', isServiceManaged: true },
      ]
    ) => ({
      id: `so-${id}`,
      type: MONITOR_TYPE,
      namespaces: ['default'],
      updated_at: '2026-10-05T10:00:00.000Z',
      attributes: { ...getFakePayload(locations), id, ...attributes },
    });

    interface Stores {
      /** Monitors edited since the last sync, read decrypted. */
      changed?: MonitorSO[];
      /** Monitors not edited since the last sync, listed without their configuration. */
      unchanged?: MonitorSO[];
      /** Monitors that can be read one by one, by saved object id, or the error reading one throws. */
      byId?: Record<string, MonitorSO | Error>;
      paramsUpdatedAt?: string[];
    }

    const mockStores = ({
      changed = [],
      unchanged = [],
      byId = {},
      paramsUpdatedAt = ['2026-10-01T10:00:00.000Z'],
    }: Stores = {}) => {
      const internalRepository = {
        find: jest.fn().mockResolvedValue({ total: changed.length + unchanged.length }),
        createPointInTimeFinder: jest.fn().mockImplementation(({ type }) => ({
          close: jest.fn(async () => {}),
          find: async function* find() {
            yield {
              saved_objects:
                type === 'synthetics-param'
                  ? paramsUpdatedAt.map((updated_at) => ({ updated_at }))
                  : unchanged,
            };
          },
        })),
      };
      (mockCoreStart.savedObjects.createInternalRepository as jest.Mock).mockReturnValue(
        internalRepository
      );

      const encryptedClient = {
        getDecryptedAsInternalUser: jest.fn(async (type: string, id: string) => {
          const monitor = byId[id];
          if (monitor instanceof Error) {
            throw monitor;
          }
          if (!monitor) {
            throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
          }
          return monitor;
        }),
        createPointInTimeFinderDecryptedAsInternalUser: jest.fn().mockImplementation(() => ({
          close: jest.fn(async () => {}),
          find: async function* find() {
            yield { saved_objects: changed };
          },
        })),
      };
      serverMock.encryptedSavedObjects = {
        getClient: jest.fn().mockReturnValue(encryptedClient),
      } as unknown as SyntheticsServerSetup['encryptedSavedObjects'];

      return { internalRepository, encryptedClient };
    };

    const notFound = (failedIds: string[]) => ({
      message: 'Request failed with status code 404',
      response: {
        status: 404,
        data: {
          status: 404,
          reason: 'failed to sync monitors',
          failed_monitors: failedIds.map((id) => ({ id, message: 'monitor not found' })),
        },
      },
    });

    const failure = (status: number, data: unknown) => ({
      message: `Request failed with status code ${status}`,
      response: { status, data },
    });

    /** Answers the retain and sync endpoints, rejecting those given a rejection. */
    const mockServiceResponses = ({ retain, sync }: { retain?: unknown; sync?: unknown } = {}) => {
      (axios as jest.MockedFunction<typeof axios>).mockImplementation(async (req: any) => {
        const rejection = req.url.endsWith('/monitors/sync/retain') ? retain : sync;
        if (rejection) {
          throw rejection;
        }
        return { status: 202 } as AxiosResponse;
      });
    };

    const requests = () => {
      const calls = (axios as jest.MockedFunction<typeof axios>).mock.calls.map(([req]) => {
        const { url = '', data } = req as AxiosRequestConfig;
        return { url, data: data as { monitors: Array<{ id: string; type: string }> } };
      });
      return {
        retained: calls.filter(({ url }) => url.endsWith('/monitors/sync/retain')),
        synced: calls.filter(({ url }) => url.endsWith('/monitors/sync')),
      };
    };

    const idsOf = (calls: Array<{ data: { monitors: Array<{ id: string }> } }>) =>
      calls.flatMap(({ data }) => data.monitors.map(({ id }) => id));

    const getService = () => {
      const { service } = getMockedService();
      (getMaintenanceWindows as jest.Mock).mockResolvedValue([]);
      return service;
    };

    /** Runs a first sync so the following ones start from the state it leaves behind. */
    const syncOnce = async (service: ServiceManagedLocations) => {
      const state: Record<string, string> = {};
      mockStores({ changed: [monitorSO('first')] });
      mockServiceResponses();
      await service.syncAllMonitors(ALL_SPACES_ID, state);
      (axios as jest.MockedFunction<typeof axios>).mockClear();
      return state;
    };

    beforeEach(() => {
      // earlier tests leave the license mocked as expired or missing
      mockLicense();
      jest.useFakeTimers({ now: new Date('2026-10-05T12:00:00.000Z'), doNotFake: ['nextTick'] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('the first sync', () => {
      it('sends every monitor in full and records when it happened', async () => {
        const service = getService();
        const state: Record<string, string> = {};
        const { encryptedClient } = mockStores({ changed: [monitorSO('a'), monitorSO('b')] });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        const { retained, synced } = requests();
        expect(retained).toHaveLength(0);
        expect(synced).toHaveLength(1);
        expect(idsOf(synced)).toEqual(['a', 'b']);
        expect(
          encryptedClient.createPointInTimeFinderDecryptedAsInternalUser.mock.calls[0][0].filter
        ).toBeUndefined();
        expect(state).toEqual({
          lastSyncedAt: '2026-10-05T12:00:00.000Z',
          lastFullSyncAt: '2026-10-05T12:00:00.000Z',
          syncFingerprint: expect.any(String),
        });
      });

      it('does not record anything when there are no monitors, nor ask for the API key', async () => {
        const service = getService();
        const state: Record<string, string> = {};
        mockStores();
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(axios).not.toHaveBeenCalled();
        expect(service.getOutput).not.toHaveBeenCalled();
        expect(state).toEqual({});
      });

      it('does not record anything when pushing the monitors fails', async () => {
        const service = getService();
        const state: Record<string, string> = {};
        mockStores({ changed: [monitorSO('a')] });
        mockServiceResponses({
          sync: failure(500, { status: 500, reason: 'failed to sync monitors' }),
        });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(service.syncErrors).toHaveLength(1);
        expect(state).toEqual({});
      });
    });

    describe('later syncs', () => {
      it('only retains the monitors that were not edited, without reading or decrypting them', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        const { encryptedClient, internalRepository } = mockStores({
          unchanged: [monitorSO('a'), monitorSO('b', { type: 'browser' })],
        });
        mockServiceResponses();
        (getSyntheticsParams as jest.Mock).mockClear();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        const { retained, synced } = requests();
        expect(synced).toHaveLength(0);
        expect(retained).toHaveLength(1);
        expect(retained[0].url).toBe('https://example.com/0/monitors/sync/retain');
        expect(retained[0].data.monitors).toEqual([
          { id: 'a', type: 'http' },
          { id: 'b', type: 'browser' },
        ]);
        expect(encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        expect(getSyntheticsParams).not.toHaveBeenCalled();

        const monitorFinder = internalRepository.createPointInTimeFinder.mock.calls
          .map(([options]) => options)
          .find(({ type }) => type !== 'synthetics-param');
        expect(monitorFinder).toEqual(
          expect.objectContaining({
            namespaces: ['*'],
            filter:
              'not (synthetics-monitor-multi-space.updated_at >= "2026-10-05T11:59:00.000Z" or synthetics-monitor.updated_at >= "2026-10-05T11:59:00.000Z")',
            fields: ['id', 'type', 'enabled', 'locations'],
          })
        );
        expect(
          encryptedClient.createPointInTimeFinderDecryptedAsInternalUser.mock.calls[0][0].filter
        ).toBe(
          '(synthetics-monitor-multi-space.updated_at >= "2026-10-05T11:59:00.000Z" or synthetics-monitor.updated_at >= "2026-10-05T11:59:00.000Z")'
        );
      });

      it('moves the time it last synced forward but not the time of the last full sync', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        mockStores({ unchanged: [monitorSO('a')] });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(state.lastSyncedAt).toBe('2026-10-05T12:05:00.000Z');
        expect(state.lastFullSyncAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('sends the monitors that were edited in full and retains the rest', async () => {
        const service = getService();
        const state = await syncOnce(service);
        (getSyntheticsParams as jest.Mock).mockClear();
        mockStores({
          changed: [monitorSO('edited', { name: 'renamed' })],
          unchanged: [monitorSO('same')],
        });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        const { retained, synced } = requests();
        expect(idsOf(retained)).toEqual(['same']);
        expect(idsOf(synced)).toEqual(['edited']);
        expect(getSyntheticsParams).toHaveBeenCalledTimes(1);
      });

      it('sends monitors the service did not retain in full, and only those', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        const { encryptedClient } = mockStores({
          unchanged: [monitorSO('still-cached'), monitorSO('evicted')],
          byId: { 'so-evicted': monitorSO('evicted', { name: 'evicted monitor' }) },
        });
        mockServiceResponses({ retain: notFound(['evicted']) });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        const { retained, synced } = requests();
        expect(idsOf(retained)).toEqual(['still-cached', 'evicted']);
        expect(idsOf(synced)).toEqual(['evicted']);
        expect(encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(1);
        expect(encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
          MONITOR_TYPE,
          'so-evicted',
          { namespace: 'default' }
        );
        expect(state.lastSyncedAt).toBe('2026-10-05T12:05:00.000Z');
      });

      it('skips monitors that were deleted after they were listed, and still records the sync', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        mockStores({ unchanged: [monitorSO('deleted')], byId: {} });
        mockServiceResponses({ retain: notFound(['deleted']) });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(requests().synced).toHaveLength(0);
        expect(service.syncErrors).toEqual([]);
        expect(logger.warn).not.toHaveBeenCalledWith(
          expect.stringContaining('Could not read monitor')
        );
        expect(state.lastSyncedAt).toBe('2026-10-05T12:05:00.000Z');
      });

      it('keeps the time of the last sync when a monitor the service lost cannot be read', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        mockStores({
          unchanged: [monitorSO('lost')],
          byId: { 'so-lost': new Error('Unable to decrypt attribute "secrets"') },
        });
        mockServiceResponses({ retain: notFound(['lost']) });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(requests().synced).toHaveLength(0);
        expect(logger.warn).toHaveBeenCalledWith(
          'Could not read monitor so-lost to sync it: Unable to decrypt attribute "secrets"'
        );
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('keeps the time of the last sync when an edited monitor could not be read, and sends the others', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        mockStores({
          changed: [
            monitorSO('readable'),
            {
              ...monitorSO('undecryptable'),
              error: {
                error: 'Internal Server Error',
                message: 'Unable to decrypt attribute "secrets"',
                statusCode: 500,
              },
            } as unknown as MonitorSO,
          ],
        });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(idsOf(requests().synced)).toEqual(['readable']);
        expect(logger.warn).toHaveBeenCalledWith(
          '1 monitors could not be read and were not synced'
        );
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('keeps the time of the last sync when another request overwrites the sync errors', async () => {
        const { service, locations } = getMockedService(2);
        const bothLocations = locations.map(({ id, label }) => ({
          id,
          label,
          isServiceManaged: true,
        }));
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        mockStores({ changed: [monitorSO('edited', {}, bothLocations)] });
        (axios as jest.MockedFunction<typeof axios>).mockImplementation(async (req: any) => {
          if (req.url === `${locations[0].url}/monitors/sync`) {
            throw failure(500, { status: 500, reason: 'failed to sync monitors' });
          }
          // The second location answers later. By then an add or edit request that finished in the
          // meantime has replaced the errors the run collected from the first one.
          for (let tick = 0; tick < 50; tick++) {
            await Promise.resolve();
          }
          service.syncErrors = [];
          return { status: 202 } as AxiosResponse;
        });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(service.syncErrors).toEqual([]);
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('keeps the time of the last sync while no service locations are known', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        // the manifest could not be fetched, so there is nowhere to send anything
        service.locations = [];
        service.httpClient.locations = [];
        mockStores({ changed: [monitorSO('edited')], unchanged: [monitorSO('same')] });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(axios).not.toHaveBeenCalled();
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('does not record a first sync while no service locations are known', async () => {
        const service = getService();
        const state: Record<string, string> = {};
        service.locations = [];
        service.httpClient.locations = [];
        mockStores({ changed: [monitorSO('a')] });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(state).toEqual({});
      });

      it('scans every monitor in one pass while any location cannot retain, instead of reading its monitors one by one', async () => {
        const { service, locations } = getMockedService(2);
        const bothLocations = locations.map(({ id, label }) => ({
          id,
          label,
          isServiceManaged: true,
        }));
        const state = await syncOnce(service);
        // only the second location is a service without the retain endpoint
        (axios as jest.MockedFunction<typeof axios>).mockImplementation(async (req: any) => {
          if (req.url === `${locations[1].url}/monitors/sync/retain`) {
            throw failure(404, '404 page not found');
          }
          return { status: 202 } as AxiosResponse;
        });
        const first = mockStores({
          unchanged: [monitorSO('a', {}, bothLocations)],
          byId: { 'so-a': monitorSO('a', {}, bothLocations) },
        });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        // the first run finds out which location cannot retain
        expect(
          requests()
            .retained.map(({ url }) => url)
            .sort()
        ).toEqual([
          `${locations[0].url}/monitors/sync/retain`,
          `${locations[1].url}/monitors/sync/retain`,
        ]);
        expect(first.encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(1);

        (axios as jest.MockedFunction<typeof axios>).mockClear();
        const second = mockStores({ changed: [monitorSO('a', {}, bothLocations)] });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(requests().retained).toHaveLength(0);
        expect(second.encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        expect(
          second.encryptedClient.createPointInTimeFinderDecryptedAsInternalUser.mock.calls[0][0]
            .filter
        ).toBeUndefined();
        expect(idsOf(requests().synced)).toEqual(['a', 'a']);
      });

      it('sends every monitor in full to a service without the retain endpoint, and stops asking it', async () => {
        const service = getService();
        const state = await syncOnce(service);
        mockStores({
          unchanged: [monitorSO('a'), monitorSO('b')],
          byId: { 'so-a': monitorSO('a'), 'so-b': monitorSO('b') },
        });
        mockServiceResponses({ retain: failure(404, '404 page not found') });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(requests().retained).toHaveLength(1);
        expect(idsOf(requests().synced)).toEqual(['a', 'b']);

        // from then on every monitor is scanned in one pass, rather than read one by one
        (axios as jest.MockedFunction<typeof axios>).mockClear();
        const { encryptedClient } = mockStores({ changed: [monitorSO('a'), monitorSO('b')] });
        mockServiceResponses({ retain: failure(404, '404 page not found') });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(requests().retained).toHaveLength(0);
        expect(idsOf(requests().synced)).toEqual(['a', 'b']);
        expect(encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        expect(
          encryptedClient.createPointInTimeFinderDecryptedAsInternalUser.mock.calls[0][0].filter
        ).toBeUndefined();
        expect(state.lastFullSyncAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('sends monitors it cannot look up by id in full', async () => {
        const service = getService();
        const state = await syncOnce(service);
        mockStores({
          unchanged: [monitorSO('', { id: undefined }), monitorSO('listed')],
          byId: { 'so-': monitorSO('', { id: undefined }) },
        });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(idsOf(requests().retained)).toEqual(['listed']);
        expect(requests().synced).toHaveLength(1);
      });

      it('does not retain disabled monitors nor monitors that only run at private locations', async () => {
        const service = getService();
        const state = await syncOnce(service);
        mockStores({
          unchanged: [
            monitorSO('disabled', { enabled: false }),
            monitorSO('private', {}, [
              { id: 'private-loc', label: 'Private', isServiceManaged: false },
            ]),
            monitorSO('no-locations', {}, []),
          ],
        });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(axios).not.toHaveBeenCalled();
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('retains a monitor at each service location it runs at', async () => {
        const { service } = getMockedService(2);
        (getMaintenanceWindows as jest.Mock).mockResolvedValue([]);
        const state = await syncOnce(service);
        mockStores({
          unchanged: [
            monitorSO('everywhere', {}, [
              { id: 'loc-0', label: 'Location 0', isServiceManaged: true },
              { id: 'loc-1', label: 'Location 1', isServiceManaged: true },
            ]),
          ],
        });
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(
          requests()
            .retained.map(({ url }) => url)
            .sort()
        ).toEqual([
          'https://example.com/0/monitors/sync/retain',
          'https://example.com/1/monitors/sync/retain',
        ]);
      });

      it('does nothing once the last monitor is gone', async () => {
        const service = getService();
        const state = await syncOnce(service);
        mockStores();
        mockServiceResponses();
        (service.getOutput as jest.Mock).mockClear();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(axios).not.toHaveBeenCalled();
        expect(service.getOutput).not.toHaveBeenCalled();
      });

      it('keeps the time of the last sync when the edited monitors could not be pushed', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        mockStores({ changed: [monitorSO('edited')], unchanged: [monitorSO('same')] });
        mockServiceResponses({
          sync: failure(500, { status: 500, reason: 'failed to sync monitors' }),
        });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(idsOf(requests().retained)).toEqual(['same']);
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('does not push when the API key is not usable', async () => {
        const service = getService();
        const state = await syncOnce(service);
        mockStores({ unchanged: [monitorSO('a')] });
        mockServiceResponses();
        (service.getOutput as jest.Mock).mockResolvedValue({
          output: null,
          invalidDetails: { reason: 'invalid' },
        });

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(axios).not.toHaveBeenCalled();
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });
    });

    describe('sends every monitor in full when', () => {
      const expectFullSync = async (
        service: ServiceManagedLocations,
        state: Record<string, string>,
        stores: Stores
      ) => {
        const { encryptedClient } = mockStores(stores);
        mockServiceResponses();

        await service.syncAllMonitors(ALL_SPACES_ID, state);

        expect(requests().retained).toHaveLength(0);
        expect(idsOf(requests().synced)).toEqual(['a', 'b']);
        expect(
          encryptedClient.createPointInTimeFinderDecryptedAsInternalUser.mock.calls[0][0].filter
        ).toBeUndefined();
      };

      it('a param was added or edited', async () => {
        const service = getService();
        const state = await syncOnce(service);

        await expectFullSync(service, state, {
          changed: [monitorSO('a'), monitorSO('b')],
          paramsUpdatedAt: ['2026-10-01T10:00:00.000Z', '2026-10-05T12:02:00.000Z'],
        });
      });

      it('a maintenance window was edited', async () => {
        const service = getService();
        const state = await syncOnce(service);
        (getMaintenanceWindows as jest.Mock).mockResolvedValue([
          { id: 'mw', updatedAt: '2026-10-05T12:02:00.000Z' },
        ]);

        await expectFullSync(service, state, { changed: [monitorSO('a'), monitorSO('b')] });
      });

      it('the API key was replaced', async () => {
        const service = getService();
        const state = await syncOnce(service);
        (service.getOutput as jest.Mock).mockResolvedValue({
          output: { hosts: ['es'], api_key: 'rotated:key' },
        });

        await expectFullSync(service, state, { changed: [monitorSO('a'), monitorSO('b')] });
      });

      it('the full sync is a day old', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-06T12:00:00.000Z'));

        await expectFullSync(service, state, { changed: [monitorSO('a'), monitorSO('b')] });
        expect(state.lastFullSyncAt).toBe('2026-10-06T12:00:00.000Z');
      });
    });
  });

  describe('deleteMonitors', () => {
    const SECRETS = [
      'hunter2',
      's3cr3t-script',
      'abc-token',
      'Bearer token-xyz',
      'secret-body',
      'My very private monitor',
    ];

    const getDeleteConfig = (
      locations: HeartbeatConfig['locations'],
      overrides: Record<string, unknown> = {}
    ) => ({
      spaceId: 'default',
      configId: 'so-id-1',
      params: { token: 'abc-token' },
      monitor: {
        ...getFakePayload(locations),
        name: 'My very private monitor',
        username: 'elastic',
        password: 'hunter2',
        'check.request.headers': { Authorization: 'Bearer token-xyz' },
        'check.request.body': { type: 'text', value: 'secret-body' },
        'source.inline.script':
          'step("login", async () => { await page.fill("#pw", "s3cr3t-script") })',
        ...overrides,
      },
    });

    beforeEach(() => {
      mockLicense();
      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);
    });

    it('sends only the id and type of an http monitor, never its config or secrets', async () => {
      const { service, locations } = getMockedService();

      await service.deleteMonitors([getDeleteConfig([locations[0]]) as any]);

      expect(axios).toHaveBeenCalledTimes(1);
      const [request] = getServiceRequests();
      expect(request).toEqual(
        expect.objectContaining({ method: 'DELETE', url: `${locations[0].url}/monitors` })
      );
      expect(request.data.monitors).toEqual([
        {
          type: 'http',
          id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
          enabled: true,
          data_stream: { namespace: 'default' },
          streams: [
            {
              data_stream: { dataset: 'http', type: 'synthetics' },
              type: 'http',
              id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
            },
          ],
        },
      ]);
      const wireBody = JSON.stringify(request.data);
      SECRETS.forEach((secret) => expect(wireBody).not.toContain(secret));
    });

    it('keeps the output and license on the request', async () => {
      const { service, locations } = getMockedService();

      await service.deleteMonitors([getDeleteConfig([locations[0]]) as any]);

      const [request] = getServiceRequests();
      expect(request.data).toEqual(
        expect.objectContaining({
          output: { hosts: ['es'], api_key: 'i:k' },
          license_level: 'platinum',
          stack_version: '9.5.0',
        })
      );
    });

    it('sends the id, type and schedule of a browser monitor, never its script or params', async () => {
      const { service, locations } = getMockedService();

      await service.deleteMonitors([
        getDeleteConfig([locations[0]], {
          type: 'browser',
          params: '{"token":"abc-token"}',
        }) as any,
      ]);

      const [request] = getServiceRequests();
      expect(request.data.monitors).toEqual([
        {
          type: 'browser',
          id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
          schedule: '@every 3m',
          enabled: true,
          data_stream: { namespace: 'default' },
          streams: [
            {
              data_stream: { dataset: 'browser', type: 'synthetics' },
              type: 'browser',
              id: '7af7e2f0-d5dc-11ec-87ac-bdfdb894c53d',
              schedule: '@every 3m',
            },
          ],
        },
      ]);
      const wireBody = JSON.stringify(request.data);
      SECRETS.forEach((secret) => expect(wireBody).not.toContain(secret));
    });

    it.each([
      ['a custom namespace', { namespace: 'custom-ns' }, 'custom-ns'],
      ['a space id used as the namespace', { namespace: 'my-space' }, 'my-space'],
      ['no namespace', {}, 'default'],
    ])('sends the monitor namespace for %s', async (_label, overrides, expectedNamespace) => {
      const { service, locations } = getMockedService();

      await service.deleteMonitors([getDeleteConfig([locations[0]], overrides) as any]);

      const [monitor] = getServiceRequests()[0].data.monitors;
      expect(monitor.data_stream).toEqual({ namespace: expectedNamespace });
    });

    it('identifies the monitor by its heartbeat id when one is given', async () => {
      const { service, locations } = getMockedService();

      await service.deleteMonitors([
        { ...getDeleteConfig([locations[0]]), heartbeatId: 'heartbeat-id' } as any,
      ]);

      const [request] = getServiceRequests();
      expect(request.data.monitors[0].id).toBe('heartbeat-id');
    });

    it('sends monitors that share a location in a single request', async () => {
      const { service, locations } = getMockedService();

      await service.deleteMonitors([
        getDeleteConfig([locations[0]], { id: 'http-1' }) as any,
        getDeleteConfig([locations[0]], { id: 'http-2', type: 'tcp' }) as any,
        getDeleteConfig([locations[0]], { id: 'http-3', type: 'icmp' }) as any,
      ]);

      expect(axios).toHaveBeenCalledTimes(1);
      const [request] = getServiceRequests();
      expect(request.data.monitors.map(({ id, type }: any) => ({ id, type }))).toEqual([
        { id: 'http-1', type: 'http' },
        { id: 'http-2', type: 'tcp' },
        { id: 'http-3', type: 'icmp' },
      ]);
    });

    it('sends the monitor to each service location it runs in, without the locations', async () => {
      const { service, locations } = getMockedService(3);

      await service.deleteMonitors([getDeleteConfig([locations[0], locations[2]]) as any]);

      const requests = getServiceRequests();
      expect(requests.map(({ url }) => url).sort()).toEqual([
        `${locations[0].url}/monitors`,
        `${locations[2].url}/monitors`,
      ]);
      requests.forEach(({ data }) => {
        expect(JSON.stringify(data)).not.toContain('loc-');
        expect(data.monitors).toHaveLength(1);
      });
    });

    it('only calls the service locations of a monitor that also runs in a private location', async () => {
      const { service, locations } = getMockedService(2);

      await service.deleteMonitors([
        getDeleteConfig([
          locations[1],
          { id: 'my-private-location', label: 'Private', isServiceManaged: false },
        ]) as any,
      ]);

      expect(axios).toHaveBeenCalledTimes(1);
      expect(getServiceRequests()[0].url).toBe(`${locations[1].url}/monitors`);
    });

    it('does not call the service for a monitor that only runs in a private location', async () => {
      const { service } = getMockedService();

      await service.deleteMonitors([
        getDeleteConfig([
          { id: 'my-private-location', label: 'Private', isServiceManaged: false },
        ]) as any,
      ]);

      expect(axios).not.toHaveBeenCalled();
    });

    it('does not resolve params or maintenance windows to delete', async () => {
      const { service, locations } = getMockedService();

      await service.deleteMonitors([getDeleteConfig([locations[0]]) as any]);

      expect(getSyntheticsParams).not.toHaveBeenCalled();
      expect(getMaintenanceWindows).not.toHaveBeenCalled();
    });

    it('does not call the service when there is no valid API key', async () => {
      const { service, locations } = getMockedService();
      jest.spyOn(service, 'getOutput').mockResolvedValue({ output: null });

      await service.deleteMonitors([getDeleteConfig([locations[0]]) as any]);

      expect(axios).not.toHaveBeenCalled();
    });
  });

  describe('deleteAllMonitors', () => {
    const SECRETS = ['hunter2', 's3cr3t-script', 'My very private monitor'];

    const mockMonitorPages = (pages: unknown[][]) => {
      const close = jest.fn(async () => {});
      const createPointInTimeFinder = jest.fn().mockReturnValue({
        close,
        find: jest.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            for (const page of pages) {
              yield { saved_objects: page };
            }
          },
        }),
      });
      (mockCoreStart.savedObjects.createInternalRepository as jest.Mock).mockReturnValue({
        createPointInTimeFinder,
      });
      return { createPointInTimeFinder, close };
    };

    const readMonitor = (
      id: string,
      type: string,
      locations: HeartbeatConfig['locations'],
      namespace?: string
    ) => ({
      id: `so-${id}`,
      type: 'synthetics-monitor-multi-space',
      attributes: { id, type, locations, schedule: { number: '5', unit: 'm' }, namespace },
    });
    const privateLocation = {
      id: 'my-private-location',
      label: 'Private',
      isServiceManaged: false,
    };

    beforeEach(() => {
      mockLicense();
      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);
    });

    it('reads the monitors without decrypting them and only the fields a delete needs', async () => {
      const { service, locations } = getMockedService();
      const { createPointInTimeFinder } = mockMonitorPages([
        [readMonitor('mon-1', 'http', [locations[0]])],
      ]);
      const decryptedFinder = (serverMock.encryptedSavedObjects.getClient() as any)
        .createPointInTimeFinderDecryptedAsInternalUser;
      decryptedFinder.mockClear();

      await service.deleteAllMonitors();

      expect(decryptedFinder).not.toHaveBeenCalled();
      expect(createPointInTimeFinder).toHaveBeenCalledWith({
        type: syntheticsMonitorSOTypes,
        perPage: 100,
        namespaces: [ALL_SPACES_ID],
        fields: ['id', 'type', 'locations', 'schedule', 'namespace'],
      });
    });

    it('sends the id and type of every monitor with a service location, nothing else', async () => {
      const { service, locations } = getMockedService();
      mockMonitorPages([
        [
          readMonitor('mon-1', 'http', [locations[0]]),
          readMonitor('mon-2', 'icmp', [locations[0]]),
          readMonitor('mon-private', 'tcp', [
            { id: 'my-private-location', label: 'Private', isServiceManaged: false },
          ]),
        ],
      ]);

      await service.deleteAllMonitors();

      expect(axios).toHaveBeenCalledTimes(1);
      const [request] = getServiceRequests();
      expect(request).toEqual(
        expect.objectContaining({ method: 'DELETE', url: `${locations[0].url}/monitors` })
      );
      expect(request.data.monitors.map(({ id, type }: any) => ({ id, type }))).toEqual([
        { id: 'mon-1', type: 'http' },
        { id: 'mon-2', type: 'icmp' },
      ]);
      const wireBody = JSON.stringify(request.data);
      SECRETS.forEach((secret) => expect(wireBody).not.toContain(secret));
    });

    it('skips pages that only hold private location monitors', async () => {
      const { service, locations } = getMockedService();
      mockMonitorPages([
        [readMonitor('mon-private', 'http', [privateLocation])],
        [readMonitor('mon-public', 'http', [locations[0]])],
      ]);

      await service.deleteAllMonitors();

      expect(axios).toHaveBeenCalledTimes(1);
      expect(getServiceRequests()[0].data.monitors.map(({ id }: any) => id)).toEqual([
        'mon-public',
      ]);
    });

    it('sends every page that holds a service location monitor, not only the first', async () => {
      const { service, locations } = getMockedService();
      mockMonitorPages([
        [readMonitor('mon-1', 'http', [locations[0]]), readMonitor('mon-2', 'tcp', [locations[0]])],
        [readMonitor('mon-private', 'http', [privateLocation])],
        [readMonitor('mon-3', 'browser', [locations[0]])],
        [readMonitor('mon-4', 'icmp', [locations[0]])],
      ]);

      await service.deleteAllMonitors();

      const requests = getServiceRequests();
      expect(requests).toHaveLength(3);
      expect(requests.map(({ data }) => data.monitors.map(({ id }: any) => id))).toEqual([
        ['mon-1', 'mon-2'],
        ['mon-3'],
        ['mon-4'],
      ]);
    });

    it('keeps going and returns the errors when the service rejects a page', async () => {
      const { service, locations } = getMockedService();
      mockMonitorPages([
        [readMonitor('mon-1', 'http', [locations[0]])],
        [readMonitor('mon-2', 'http', [locations[0]])],
      ]);
      (axios as jest.MockedFunction<typeof axios>)
        .mockRejectedValueOnce({ response: { status: 500, data: { reason: 'boom' } } })
        .mockResolvedValueOnce({} as AxiosResponse);

      const errors = await service.deleteAllMonitors();

      expect(axios).toHaveBeenCalledTimes(2);
      expect(errors).toEqual([{ locationId: locations[0].id, error: { reason: 'boom' } }]);
    });

    it('sends the namespace each monitor has', async () => {
      const { service, locations } = getMockedService();
      mockMonitorPages([
        [
          readMonitor('mon-1', 'http', [locations[0]], 'custom-ns'),
          readMonitor('mon-2', 'http', [locations[0]]),
        ],
      ]);

      await service.deleteAllMonitors();

      const { monitors } = getServiceRequests()[0].data;
      expect(
        monitors.map(({ id, data_stream: dataStream }: any) => [id, dataStream.namespace])
      ).toEqual([
        ['mon-1', 'custom-ns'],
        ['mon-2', 'default'],
      ]);
    });

    it('closes the finder once every page was read', async () => {
      const { service, locations } = getMockedService();
      const { close } = mockMonitorPages([[readMonitor('mon-1', 'http', [locations[0]])]]);

      await service.deleteAllMonitors();

      expect(close).toHaveBeenCalledTimes(1);
    });

    it('does not call the service when there is no valid API key', async () => {
      const { service, locations } = getMockedService();
      mockMonitorPages([[readMonitor('mon-1', 'http', [locations[0]])]]);
      jest.spyOn(service, 'getOutput').mockResolvedValue({ output: null });

      await service.deleteAllMonitors();

      expect(axios).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    const service = new ServiceManagedLocations(serverMock);

    const locations = times(5).map((n) => {
      return {
        id: `loc-${n}`,
        label: `Location ${n}`,
        url: `https://example.com/${n}`,
        geo: {
          lat: 0,
          lon: 0,
        },
        isServiceManaged: true,
        status: LocationStatus.GA,
      };
    });
    service.httpClient.locations = locations;
    service.locations = locations;
    jest.spyOn(service, 'getOutput').mockResolvedValue({
      output: { hosts: ['es'], api_key: 'i:k' },
    });
    (getSyntheticsParams as jest.Mock).mockResolvedValue({});
    (getMaintenanceWindows as jest.Mock).mockResolvedValue([]);

    it('paginates the results', async () => {
      serverMock.config = mockConfig;

      mockLicense();

      const syncSpy = jest.spyOn(service.httpClient, 'syncMonitors');

      let num = -1;
      const data = times(10000).map((n) => {
        if (num === 4) {
          num = -1;
        }
        num++;
        if (locations?.[num + 1]) {
          return {
            attributes: getFakePayload([locations[num], locations[num + 1]]),
          };
        }
        return {
          attributes: getFakePayload([locations[num]]),
        };
      });

      serverMock.encryptedSavedObjects = mockEncryptedSO({ monitors: data });

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      await service.syncAllMonitors(ALL_SPACES_ID);

      expect(syncSpy).toHaveBeenCalledTimes(72);
      expect(axios).toHaveBeenCalledTimes(72);
      expect(logger.debug).toHaveBeenCalledTimes(112);
      expect(logger.info).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
  });

  describe('start method - manifestUrl logging', () => {
    const taskManagerStart = taskManagerMock.createStart();
    const expectedLogMessage =
      'Synthetics sync task is not being scheduled because manifestUrl is not configured.';

    const createServerMock = (
      cloudConfig?:
        | {
            isServerlessEnabled?: boolean;
            isCloudEnabled?: boolean;
            deploymentId?: string;
          }
        | undefined,
      manifestUrl?: string
    ): SyntheticsServerSetup => {
      return {
        ...serverMock,
        config: {
          service: {
            username: 'dev',
            password: '12345',
            ...(manifestUrl && { manifestUrl }),
          },
          enabled: true,
        },
        cloud: cloudConfig as any,
      } as SyntheticsServerSetup;
    };

    beforeEach(() => {
      jest.clearAllMocks();
      logger.error.mockClear();
      logger.debug.mockClear();
    });

    it('logs ERROR for Serverless environment when manifestUrl is missing', () => {
      const serverMockWithoutManifest = createServerMock({
        isServerlessEnabled: true,
        isCloudEnabled: true,
        deploymentId: undefined,
      });

      const service = new ServiceManagedLocations(serverMockWithoutManifest);
      service.start(taskManagerStart);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(expectedLogMessage);
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('logs ERROR for ECH (stateful) environment when manifestUrl is missing', () => {
      const serverMockWithoutManifest = createServerMock({
        isServerlessEnabled: false,
        isCloudEnabled: true,
        deploymentId: 'test-deployment-id',
      });

      const service = new ServiceManagedLocations(serverMockWithoutManifest);
      service.start(taskManagerStart);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(expectedLogMessage);
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('logs DEBUG for ECE environment when manifestUrl is missing', () => {
      const serverMockWithoutManifest = createServerMock({
        isServerlessEnabled: false,
        isCloudEnabled: true,
        deploymentId: undefined,
      });

      const service = new ServiceManagedLocations(serverMockWithoutManifest);
      service.start(taskManagerStart);

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(expectedLogMessage);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs DEBUG for self-managed environment when manifestUrl is missing', () => {
      const serverMockWithoutManifest = createServerMock(undefined);

      const service = new ServiceManagedLocations(serverMockWithoutManifest);
      service.start(taskManagerStart);

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(expectedLogMessage);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs DEBUG for self-managed environment (isCloudEnabled=false) when manifestUrl is missing', () => {
      const serverMockWithoutManifest = createServerMock({
        isServerlessEnabled: false,
        isCloudEnabled: false,
        deploymentId: undefined,
      });

      const service = new ServiceManagedLocations(serverMockWithoutManifest);
      service.start(taskManagerStart);

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(expectedLogMessage);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('does not log when manifestUrl is present', () => {
      const serverMockWithManifest = createServerMock(
        {
          isServerlessEnabled: true,
          isCloudEnabled: true,
          deploymentId: 'test-deployment-id',
        },
        'http://localhost:8080/api/manifest'
      );

      const service = new ServiceManagedLocations(serverMockWithManifest);
      service.start(taskManagerStart);

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });
});
