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
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import times from 'lodash/times';
import type { HeartbeatConfig } from '../../common/runtime_types';
import { LocationStatus } from '../../common/runtime_types';
import { syntheticsMonitorSOTypes } from '../../common/types/saved_objects';
import { mockEncryptedSO } from './utils/mocks';
import * as apiKeys from './get_api_key';
import { SyntheticsTelemetry } from '../telemetry/synthetics_telemetry';
import * as monitorUpgradeSender from '../routes/telemetry/monitor_upgrade_sender';
import type { SyntheticsServerSetup } from '../types';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';

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

const getServiceRequests = () =>
  (axios as jest.MockedFunction<typeof axios>).mock.calls.map(([request]) => request as any);

describe('SyntheticsService', () => {
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

  describe('deleteConfigs', () => {
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

      await service.deleteConfigs([getDeleteConfig([locations[0]]) as any]);

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

      await service.deleteConfigs([getDeleteConfig([locations[0]]) as any]);

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

      await service.deleteConfigs([
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

      await service.deleteConfigs([getDeleteConfig([locations[0]], overrides) as any]);

      const [monitor] = getServiceRequests()[0].data.monitors;
      expect(monitor.data_stream).toEqual({ namespace: expectedNamespace });
    });

    it('identifies the monitor by its heartbeat id when one is given', async () => {
      const { service, locations } = getMockedService();

      await service.deleteConfigs([
        { ...getDeleteConfig([locations[0]]), heartbeatId: 'heartbeat-id' } as any,
      ]);

      const [request] = getServiceRequests();
      expect(request.data.monitors[0].id).toBe('heartbeat-id');
    });

    it('sends monitors that share a location in a single request', async () => {
      const { service, locations } = getMockedService();

      await service.deleteConfigs([
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

      await service.deleteConfigs([getDeleteConfig([locations[0], locations[2]]) as any]);

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

      await service.deleteConfigs([
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

      await service.deleteConfigs([
        getDeleteConfig([
          { id: 'my-private-location', label: 'Private', isServiceManaged: false },
        ]) as any,
      ]);

      expect(axios).not.toHaveBeenCalled();
    });

    it('does not resolve params or maintenance windows to delete', async () => {
      const { service, locations } = getMockedService();

      await service.deleteConfigs([getDeleteConfig([locations[0]]) as any]);

      expect(service.getSyntheticsParams).not.toHaveBeenCalled();
      expect(service.getMaintenanceWindows).not.toHaveBeenCalled();
    });

    it('does not call the service when there is no valid API key', async () => {
      const { service, locations } = getMockedService();
      jest.spyOn(service, 'getOutput').mockResolvedValue({ output: null });

      await service.deleteConfigs([getDeleteConfig([locations[0]]) as any]);

      expect(axios).not.toHaveBeenCalled();
    });
  });

  describe('deleteAllConfigs', () => {
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

      await service.deleteAllConfigs();

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

      await service.deleteAllConfigs();

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

      await service.deleteAllConfigs();

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

      await service.deleteAllConfigs();

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

      const errors = await service.deleteAllConfigs();

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

      await service.deleteAllConfigs();

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

      await service.deleteAllConfigs();

      expect(close).toHaveBeenCalledTimes(1);
    });

    it('does not call the service when there is no valid API key', async () => {
      const { service, locations } = getMockedService();
      mockMonitorPages([[readMonitor('mon-1', 'http', [locations[0]])]]);
      jest.spyOn(service, 'getOutput').mockResolvedValue({ output: null });

      await service.deleteAllConfigs();

      expect(axios).not.toHaveBeenCalled();
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
