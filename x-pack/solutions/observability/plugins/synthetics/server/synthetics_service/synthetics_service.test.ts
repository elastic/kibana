/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { coreMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { CoreStart } from '@kbn/core/server';
import { SyntheticsService } from './synthetics_service';
import { loggerMock } from '@kbn/logging-mocks';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import times from 'lodash/times';
import type { HeartbeatConfig } from '../../common/runtime_types';
import { LocationStatus } from '../../common/runtime_types';
import { mockEncryptedSO } from './utils/mocks';
import * as apiKeys from './get_api_key';
import * as monitorUpgradeSender from '../routes/telemetry/monitor_upgrade_sender';
import type { SyntheticsServerSetup } from '../types';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { createMockTelemetryEventsSender } from '../telemetry/__mocks__';

jest.mock('axios', () => jest.fn());

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

describe('SyntheticsService', () => {
  const mockEsClient = {
    search: jest.fn(),
  };

  const logger = loggerMock.create();

  const telemetry = createMockTelemetryEventsSender(true);

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
    const service = new SyntheticsService(serverMock);

    service.apiClient.locations = locations;
    service.locations = locations;
    service.isAllowed = true;

    jest.spyOn(service, 'getOutput').mockResolvedValue({
      output: { hosts: ['es'], api_key: 'i:k' },
    });
    jest.spyOn(service, 'getSyntheticsParams').mockResolvedValue({});

    service.getMaintenanceWindows = jest.fn();

    return { service, locations };
  };

  beforeEach(() => {
    (axios as jest.MockedFunction<typeof axios>).mockReset();
    jest.clearAllMocks();
  });

  it('setup properly', async () => {
    const service = new SyntheticsService(serverMock);

    expect(service.isAllowed).toEqual(false);

    await service.setup(taskManagerSetup);

    expect(service.isAllowed).toEqual(true);
    expect(service.locations).toEqual([]);
    expect(service.signupUrl).toEqual(null);
  });

  it('setup properly with basic auth', async () => {
    const service = new SyntheticsService(serverMock);

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
    const service = new SyntheticsService(serverMock);

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

      await service.addConfigs({ monitor: payload } as any, []);

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

      await service.pushConfigs(ALL_SPACES_ID);

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

      await service.pushConfigs(ALL_SPACES_ID);

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

  describe('pushConfigs', () => {
    it('includes the isEdit flag on edit requests', async () => {
      const { service, locations } = getMockedService();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      const payload = getFakePayload([locations[0]]);

      await service.editConfig({ monitor: payload } as any, true, []);

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

      await service.editConfig({ monitor: payload } as any, true, []);

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

      await service.addConfigs({ monitor: payload } as any, []);

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

      await service.pushConfigs(ALL_SPACES_ID);

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

        await expect(service.pushConfigs(ALL_SPACES_ID)).rejects.toThrow(errorMessage);
      }
    );
  });

  describe('pushConfigs with sync state', () => {
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
      /** Monitors that can be read one by one, by saved object id. */
      byId?: Record<string, MonitorSO>;
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
        getDecryptedAsInternalUser: jest.fn(async (_type: string, id: string) => {
          if (!byId[id]) {
            throw new Error(`Saved object [${MONITOR_TYPE}/${id}] not found`);
          }
          return byId[id];
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
      service.getMaintenanceWindows = jest.fn().mockResolvedValue([]);
      return service;
    };

    /** Runs a first sync so the following ones start from the state it leaves behind. */
    const syncOnce = async (service: SyntheticsService) => {
      const state: Record<string, string> = {};
      mockStores({ changed: [monitorSO('first')] });
      mockServiceResponses();
      await service.pushConfigs(ALL_SPACES_ID, state);
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

        await service.pushConfigs(ALL_SPACES_ID, state);

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

        await service.pushConfigs(ALL_SPACES_ID, state);

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

        await service.pushConfigs(ALL_SPACES_ID, state);

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
        (service.getSyntheticsParams as jest.Mock).mockClear();

        await service.pushConfigs(ALL_SPACES_ID, state);

        const { retained, synced } = requests();
        expect(synced).toHaveLength(0);
        expect(retained).toHaveLength(1);
        expect(retained[0].url).toBe('https://example.com/0/monitors/sync/retain');
        expect(retained[0].data.monitors).toEqual([
          { id: 'a', type: 'http' },
          { id: 'b', type: 'browser' },
        ]);
        expect(encryptedClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        expect(service.getSyntheticsParams).not.toHaveBeenCalled();

        const monitorFinder = internalRepository.createPointInTimeFinder.mock.calls
          .map(([options]) => options)
          .find(({ type }) => type !== 'synthetics-param');
        expect(monitorFinder).toEqual(
          expect.objectContaining({
            namespaces: ['*'],
            filter:
              'not (synthetics-monitor.updated_at >= "2026-10-05T11:59:00.000Z" or synthetics-monitor-multi-space.updated_at >= "2026-10-05T11:59:00.000Z")',
            fields: ['id', 'type', 'enabled', 'locations'],
          })
        );
        expect(
          encryptedClient.createPointInTimeFinderDecryptedAsInternalUser.mock.calls[0][0].filter
        ).toBe(
          '(synthetics-monitor.updated_at >= "2026-10-05T11:59:00.000Z" or synthetics-monitor-multi-space.updated_at >= "2026-10-05T11:59:00.000Z")'
        );
      });

      it('moves the time it last synced forward but not the time of the last full sync', async () => {
        const service = getService();
        const state = await syncOnce(service);
        jest.setSystemTime(new Date('2026-10-05T12:05:00.000Z'));
        mockStores({ unchanged: [monitorSO('a')] });
        mockServiceResponses();

        await service.pushConfigs(ALL_SPACES_ID, state);

        expect(state.lastSyncedAt).toBe('2026-10-05T12:05:00.000Z');
        expect(state.lastFullSyncAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('sends the monitors that were edited in full and retains the rest', async () => {
        const service = getService();
        const state = await syncOnce(service);
        (service.getSyntheticsParams as jest.Mock).mockClear();
        mockStores({
          changed: [monitorSO('edited', { name: 'renamed' })],
          unchanged: [monitorSO('same')],
        });
        mockServiceResponses();

        await service.pushConfigs(ALL_SPACES_ID, state);

        const { retained, synced } = requests();
        expect(idsOf(retained)).toEqual(['same']);
        expect(idsOf(synced)).toEqual(['edited']);
        expect(service.getSyntheticsParams).toHaveBeenCalledTimes(1);
      });

      it('sends monitors the service did not retain in full, and only those', async () => {
        const service = getService();
        const state = await syncOnce(service);
        const { encryptedClient } = mockStores({
          unchanged: [monitorSO('still-cached'), monitorSO('evicted')],
          byId: { 'so-evicted': monitorSO('evicted', { name: 'evicted monitor' }) },
        });
        mockServiceResponses({ retain: notFound(['evicted']) });

        await service.pushConfigs(ALL_SPACES_ID, state);

        const { retained, synced } = requests();
        expect(idsOf(retained)).toEqual(['still-cached', 'evicted']);
        expect(idsOf(synced)).toEqual(['evicted']);
        expect(encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(1);
        expect(encryptedClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
          MONITOR_TYPE,
          'so-evicted',
          { namespace: 'default' }
        );
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('skips monitors that were deleted after they were listed', async () => {
        const service = getService();
        const state = await syncOnce(service);
        mockStores({ unchanged: [monitorSO('deleted')], byId: {} });
        mockServiceResponses({ retain: notFound(['deleted']) });

        await service.pushConfigs(ALL_SPACES_ID, state);

        expect(requests().synced).toHaveLength(0);
        expect(service.syncErrors).toEqual([]);
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('sends every monitor in full to a service without the retain endpoint, and stops asking it', async () => {
        const service = getService();
        const state = await syncOnce(service);
        mockStores({
          unchanged: [monitorSO('a'), monitorSO('b')],
          byId: { 'so-a': monitorSO('a'), 'so-b': monitorSO('b') },
        });
        mockServiceResponses({ retain: failure(404, '404 page not found') });

        await service.pushConfigs(ALL_SPACES_ID, state);

        expect(requests().retained).toHaveLength(1);
        expect(idsOf(requests().synced)).toEqual(['a', 'b']);

        // from then on every monitor is scanned in one pass, rather than read one by one
        (axios as jest.MockedFunction<typeof axios>).mockClear();
        const { encryptedClient } = mockStores({ changed: [monitorSO('a'), monitorSO('b')] });
        mockServiceResponses({ retain: failure(404, '404 page not found') });

        await service.pushConfigs(ALL_SPACES_ID, state);

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

        await service.pushConfigs(ALL_SPACES_ID, state);

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

        await service.pushConfigs(ALL_SPACES_ID, state);

        expect(axios).not.toHaveBeenCalled();
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });

      it('retains a monitor at each service location it runs at', async () => {
        const { service } = getMockedService(2);
        service.getMaintenanceWindows = jest.fn().mockResolvedValue([]);
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

        await service.pushConfigs(ALL_SPACES_ID, state);

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

        await service.pushConfigs(ALL_SPACES_ID, state);

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

        await service.pushConfigs(ALL_SPACES_ID, state);

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

        await service.pushConfigs(ALL_SPACES_ID, state);

        expect(axios).not.toHaveBeenCalled();
        expect(state.lastSyncedAt).toBe('2026-10-05T12:00:00.000Z');
      });
    });

    describe('sends every monitor in full when', () => {
      const expectFullSync = async (
        service: SyntheticsService,
        state: Record<string, string>,
        stores: Stores
      ) => {
        const { encryptedClient } = mockStores(stores);
        mockServiceResponses();

        await service.pushConfigs(ALL_SPACES_ID, state);

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
        service.getMaintenanceWindows = jest
          .fn()
          .mockResolvedValue([{ id: 'mw', updatedAt: '2026-10-05T12:02:00.000Z' }]);

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

  describe('getSyntheticsParams', () => {
    it('returns the params for all spaces', async () => {
      const { service } = getMockedService();
      jest.spyOn(service, 'getSyntheticsParams').mockRestore();

      (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({} as AxiosResponse);

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        params: [
          {
            attributes: { key: 'username', value: 'elastic' },
            namespaces: ['*'],
          },
        ],
      });

      const params = await service.getSyntheticsParams();

      expect(params).toEqual({
        '*': {
          username: 'elastic',
        },
      });
    });

    it('returns the params for specific space', async () => {
      const { service } = getMockedService();
      jest.spyOn(service, 'getSyntheticsParams').mockRestore();

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        params: [
          {
            attributes: { key: 'username', value: 'elastic' },
            namespaces: ['*'],
          },
        ],
      });

      const params = await service.getSyntheticsParams({ spaceId: 'default' });

      expect(params).toEqual({
        '*': {
          username: 'elastic',
        },
        default: {
          username: 'elastic',
        },
      });
    });

    it('returns the space limited params', async () => {
      const { service } = getMockedService();
      jest.spyOn(service, 'getSyntheticsParams').mockRestore();

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        params: [
          {
            attributes: { key: 'username', value: 'elastic' },
            namespaces: ['default'],
          },
        ],
      });

      const params = await service.getSyntheticsParams({ spaceId: 'default' });

      expect(params).toEqual({
        default: {
          username: 'elastic',
        },
      });
    });

    it('returns the params from mixed spaces', async () => {
      const { service } = getMockedService();
      jest.spyOn(service, 'getSyntheticsParams').mockRestore();

      serverMock.encryptedSavedObjects = mockEncryptedSO({
        params: [
          {
            attributes: { key: 'username', value: 'elastic' },
            namespaces: ['default'],
          },
          {
            attributes: { key: 'username-shared', value: 'elastic' },
            namespaces: ['*'],
          },
          {
            attributes: { key: 'username-test-space', value: 'elastic' },
            namespaces: ['test'],
          },
        ],
      });

      const params = await service.getSyntheticsParams({ spaceId: 'default' });

      expect(params).toEqual({
        '*': {
          'username-shared': 'elastic',
        },
        default: {
          username: 'elastic',
          'username-shared': 'elastic',
        },
        test: {
          'username-shared': 'elastic',
          'username-test-space': 'elastic',
        },
      });
    });
  });

  describe('pagination', () => {
    const service = new SyntheticsService(serverMock);

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
    service.apiClient.locations = locations;
    service.locations = locations;
    jest.spyOn(service, 'getOutput').mockResolvedValue({
      output: { hosts: ['es'], api_key: 'i:k' },
    });
    jest.spyOn(service, 'getSyntheticsParams').mockResolvedValue({});

    service.getMaintenanceWindows = jest.fn();

    it('paginates the results', async () => {
      serverMock.config = mockConfig;

      mockLicense();

      const syncSpy = jest.spyOn(service.apiClient, 'syncMonitors');

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

      await service.pushConfigs(ALL_SPACES_ID);

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

      const service = new SyntheticsService(serverMockWithoutManifest);
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

      const service = new SyntheticsService(serverMockWithoutManifest);
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

      const service = new SyntheticsService(serverMockWithoutManifest);
      service.start(taskManagerStart);

      expect(logger.debug).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(expectedLogMessage);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs DEBUG for self-managed environment when manifestUrl is missing', () => {
      const serverMockWithoutManifest = createServerMock(undefined);

      const service = new SyntheticsService(serverMockWithoutManifest);
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

      const service = new SyntheticsService(serverMockWithoutManifest);
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

      const service = new SyntheticsService(serverMockWithManifest);
      service.start(taskManagerStart);

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });
});
