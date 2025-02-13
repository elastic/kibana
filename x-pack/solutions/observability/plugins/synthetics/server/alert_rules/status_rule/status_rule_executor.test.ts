/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { getDoesMonitorMeetLocationThreshold, StatusRuleExecutor } from './status_rule_executor';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import * as monitorUtils from '../../saved_objects/synthetics_monitor/get_all_monitors';
import * as locationsUtils from '../../synthetics_service/get_all_locations';
import type { PublicLocation } from '../../../common/runtime_types';
import { SyntheticsServerSetup } from '../../types';
import { AlertStatusMetaData } from '../../../common/runtime_types/alert_rules/common';
import { SyntheticsEsClient } from '../../lib';
import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';

describe('StatusRuleExecutor', () => {
  // @ts-ignore
  Date.now = jest.fn(() => new Date('2024-05-13T12:33:37.000Z'));

  const mockEsClient = elasticsearchClientMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const soClient = savedObjectsClientMock.create();
  jest.spyOn(locationsUtils, 'getAllLocations').mockResolvedValue({
    // @ts-ignore
    publicLocations: [
      {
        id: 'us_central_qa',
        label: 'US Central QA',
      },
      {
        id: 'us_central_dev',
        label: 'US Central DEV',
      },
    ] as unknown as PublicLocation,
    privateLocations: [],
  });

  const serverMock: SyntheticsServerSetup = {
    logger,
    syntheticsEsClient: mockEsClient,
    authSavedObjectsClient: soClient,
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue('test-space'),
      },
    },
    encryptedSavedObjects: mockEncryptedSO(),
  } as unknown as SyntheticsServerSetup;

  const syntheticsService = new SyntheticsService(serverMock);

  const monitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);

  const mockStart = coreMock.createStart();
  const uiSettingsClient = mockStart.uiSettings.asScopedToClient(soClient);
  const esClient = new SyntheticsEsClient(soClient, mockEsClient, {
    heartbeatIndices: SYNTHETICS_INDEX_PATTERN,
  });

  const statusRule = new StatusRuleExecutor(esClient, serverMock, monitorClient, {
    params: {},
    services: {
      uiSettingsClient,
      savedObjectsClient: soClient,
      scopedClusterClient: { asCurrentUser: mockEsClient },
    },
    rule: {
      name: 'test',
    },
  } as any);

  describe('DefaultRule', () => {
    it('should only query enabled monitors', async () => {
      const spy = jest.spyOn(monitorUtils, 'getAllMonitors').mockResolvedValue([]);

      const { downConfigs, staleDownConfigs } = await statusRule.getDownChecks({});

      expect(downConfigs).toEqual({});
      expect(staleDownConfigs).toEqual({});

      expect(spy).toHaveBeenCalledWith({
        filter: 'synthetics-monitor.attributes.alert.status.enabled: true',
        soClient,
      });
    });

    it('marks deleted configs as expected', async () => {
      jest.spyOn(monitorUtils, 'getAllMonitors').mockResolvedValue(testMonitors);

      const { downConfigs } = await statusRule.getDownChecks({});

      expect(downConfigs).toEqual({});

      const staleDownConfigs = await statusRule.markDeletedConfigs({
        id2: {
          locationId: 'us-east-1',
          configId: 'id2',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          monitorQueryId: 'test',
          ping: {} as any,
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
        'id1-us_central_dev': {
          locationId: 'us_central_dev',
          configId: 'id1',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          monitorQueryId: 'test',
          ping: {} as any,
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
        'id1-us_central_qa': {
          locationId: 'us_central_qa',
          configId: 'id1',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          monitorQueryId: 'test',
          ping: {} as any,
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
      });

      expect(staleDownConfigs).toEqual({
        id2: {
          configId: 'id2',
          isDeleted: true,
          locationId: 'us-east-1',
          monitorQueryId: 'test',
          ping: {},
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
        'id1-us_central_dev': {
          configId: 'id1',
          isLocationRemoved: true,
          locationId: 'us_central_dev',
          monitorQueryId: 'test',
          ping: {},
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
      });
    });

    it('does not mark deleted config when monitor does not contain location label', async () => {
      jest.spyOn(monitorUtils, 'getAllMonitors').mockResolvedValue([
        {
          ...testMonitors[0],
          attributes: {
            ...testMonitors[0].attributes,
            locations: [
              {
                geo: { lon: -95.86, lat: 41.25 },
                isServiceManaged: true,
                id: 'us_central_qa',
              },
            ],
          },
        },
      ]);

      const { downConfigs } = await statusRule.getDownChecks({});

      expect(downConfigs).toEqual({});

      const staleDownConfigs = await statusRule.markDeletedConfigs({
        id2: {
          locationId: 'us-east-1',
          configId: 'id2',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          monitorQueryId: 'test',
          ping: {} as any,
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
        'id1-us_central_dev': {
          locationId: 'us_central_dev',
          configId: 'id1',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          monitorQueryId: 'test',
          ping: {} as any,
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
        'id1-us_central_qa': {
          locationId: 'us_central_qa',
          configId: 'id1',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          monitorQueryId: 'test',
          ping: {} as any,
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
      });

      expect(staleDownConfigs).toEqual({
        id2: {
          configId: 'id2',
          isDeleted: true,
          locationId: 'us-east-1',
          monitorQueryId: 'test',
          ping: {},
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
        'id1-us_central_dev': {
          configId: 'id1',
          isLocationRemoved: true,
          locationId: 'us_central_dev',
          monitorQueryId: 'test',
          ping: {},
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
      });
    });
  });

  describe('handleDownMonitorThresholdAlert', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should alert if monitor meet location threshold', async () => {
      const spy = jest.spyOn(statusRule, 'scheduleAlert');
      statusRule.handleDownMonitorThresholdAlert({
        downConfigs: {
          'id1-us_central_qa': {
            locationId: 'us_central_qa',
            configId: 'id1',
            status: 'down',
            timestamp: '2021-06-01T00:00:00.000Z',
            monitorQueryId: 'test',
            ping: testPing,
            checks: {
              downWithinXChecks: 1,
              down: 1,
            },
          },
        },
      });
      expect(spy).toHaveBeenCalledWith({
        alertId: 'id1-us_central_qa',
        downThreshold: 1,
        idWithLocation: 'id1-us_central_qa',
        locationNames: ['Test location'],
        locationIds: ['test'],
        monitorSummary: {
          checkedAt: '2024-05-13T12:33:37Z',
          checks: { down: 1, downWithinXChecks: 1 },
          configId: 'id1',
          downThreshold: 1,
          hostName: undefined,
          lastErrorMessage: undefined,
          locationId: 'us_central_qa',
          locationName: 'Test location',
          locationNames: 'Test location',
          monitorId: 'test',
          monitorName: 'test monitor',
          monitorTags: ['dev'],
          monitorType: 'browser',
          monitorUrl: 'https://www.google.com',
          monitorUrlLabel: 'URL',
          reason:
            'Monitor "test monitor" from Test location is down. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.',
          stateId: undefined,
          status: 'down',
          timestamp: '2024-05-13T12:33:37.000Z',
        },
        statusConfig: {
          checks: { down: 1, downWithinXChecks: 1 },
          configId: 'id1',
          locationId: 'us_central_qa',
          monitorQueryId: 'test',
          ping: testPing,
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
        useLatestChecks: true,
      });
    });

    it('should not alert if monitor do not meet location threshold', async () => {
      statusRule.params = {
        condition: {
          window: {
            numberOfChecks: 1,
          },
          downThreshold: 1,
          locationsThreshold: 2,
        },
      };

      const spy = jest.spyOn(statusRule, 'scheduleAlert');
      statusRule.handleDownMonitorThresholdAlert({
        downConfigs: {
          'id1-us_central_qa': {
            locationId: 'us_central_qa',
            configId: 'id1',
            status: 'down',
            timestamp: '2021-06-01T00:00:00.000Z',
            monitorQueryId: 'test',
            ping: testPing,
            checks: {
              downWithinXChecks: 1,
              down: 1,
            },
          },
        },
      });
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should send 2 alerts', async () => {
      statusRule.params = {
        condition: {
          window: {
            numberOfChecks: 1,
          },
          downThreshold: 1,
          locationsThreshold: 1,
        },
      };
      const spy = jest.spyOn(statusRule, 'scheduleAlert');
      statusRule.handleDownMonitorThresholdAlert({
        downConfigs: {
          'id1-us_central_qa': {
            locationId: 'us_central_qa',
            configId: 'id1',
            status: 'down',
            timestamp: '2021-06-01T00:00:00.000Z',
            monitorQueryId: 'test',
            ping: testPing,
            checks: {
              downWithinXChecks: 1,
              down: 1,
            },
          },
          'id1-us_central_dev': {
            locationId: 'us_central_dev',
            configId: 'id1',
            status: 'down',
            timestamp: '2021-06-01T00:00:00.000Z',
            monitorQueryId: 'test',
            ping: testPing,
            checks: {
              downWithinXChecks: 1,
              down: 1,
            },
          },
        },
      });
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should send 1 alert for un-grouped', async () => {
      statusRule.params = {
        condition: {
          groupBy: 'none',
          window: {
            numberOfChecks: 1,
          },
          downThreshold: 1,
          locationsThreshold: 1,
        },
      };
      const spy = jest.spyOn(statusRule, 'scheduleAlert');
      statusRule.handleDownMonitorThresholdAlert({
        downConfigs: {
          'id1-us_central_qa': {
            locationId: 'us_central_qa',
            configId: 'id1',
            status: 'down',
            timestamp: '2021-06-01T00:00:00.000Z',
            monitorQueryId: 'test',
            ping: testPing,
            checks: {
              downWithinXChecks: 1,
              down: 1,
            },
          },
          'id1-us_central_dev': {
            locationId: 'us_central_dev',
            configId: 'id1',
            status: 'down',
            timestamp: '2021-06-01T00:00:00.000Z',
            monitorQueryId: 'test',
            ping: testPing,
            checks: {
              downWithinXChecks: 1,
              down: 1,
            },
          },
        },
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({
        alertId: 'id1',
        downThreshold: 1,
        idWithLocation: 'id1',
        locationIds: ['test', 'test'],
        locationNames: ['Test location', 'Test location'],
        monitorSummary: {
          checkedAt: '2024-05-13T12:33:37Z',
          checks: { down: 1, downWithinXChecks: 1 },
          configId: 'id1',
          downThreshold: 1,
          hostName: undefined,
          lastErrorMessage: undefined,
          locationId: 'test and test',
          locationName: 'Test location',
          locationNames: 'Test location and Test location',
          monitorId: 'test',
          monitorName: 'test monitor',
          monitorTags: ['dev'],
          monitorType: 'browser',
          monitorUrl: 'https://www.google.com',
          monitorUrlLabel: 'URL',
          reason:
            'Monitor "test monitor" is down 1 time from Test location and 1 time from Test location. Alert when down 1 time out of the last 1 checks from at least 1 location.',
          status: 'down',
          timestamp: '2024-05-13T12:33:37.000Z',
        },
        statusConfig: {
          checks: { down: 1, downWithinXChecks: 1 },
          configId: 'id1',
          locationId: 'us_central_qa',
          monitorQueryId: 'test',
          ping: testPing,
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
        useLatestChecks: true,
      });
    });
  });
});

describe('getDoesMonitorMeetLocationThreshold', () => {
  describe('when useTimeWindow is false', () => {
    it('should return false if monitor does not meets location threshold', () => {
      const matchesByLocation: AlertStatusMetaData[] = [
        {
          checks: { down: 0, downWithinXChecks: 0 },
          locationId: 'us_central_qa',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
      ];
      const res = getDoesMonitorMeetLocationThreshold({
        matchesByLocation,
        locationsThreshold: 1,
        downThreshold: 1,
        useTimeWindow: false,
      });
      expect(res).toBe(false);
    });

    it('should return true if monitor meets location threshold', () => {
      const matchesByLocation: AlertStatusMetaData[] = [
        {
          checks: { down: 1, downWithinXChecks: 1 },
          locationId: 'us_central_qa',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
      ];
      const res = getDoesMonitorMeetLocationThreshold({
        matchesByLocation,
        locationsThreshold: 1,
        downThreshold: 1,
        useTimeWindow: false,
      });
      expect(res).toBe(true);
    });

    it('should return false if monitor does not meets 2 location threshold', () => {
      const matchesByLocation: AlertStatusMetaData[] = [
        {
          checks: { down: 1, downWithinXChecks: 1 },
          locationId: 'us_central_qa',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
      ];
      const res = getDoesMonitorMeetLocationThreshold({
        matchesByLocation,
        locationsThreshold: 2,
        downThreshold: 1,
        useTimeWindow: false,
      });
      expect(res).toBe(false);
    });

    it('should return true if monitor meets 2 location threshold', () => {
      const matchesByLocation: AlertStatusMetaData[] = [
        {
          checks: { down: 1, downWithinXChecks: 1 },
          locationId: 'us_central_qa',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
        {
          checks: { down: 1, downWithinXChecks: 1 },
          locationId: 'us_central',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
      ];
      const res = getDoesMonitorMeetLocationThreshold({
        matchesByLocation,
        locationsThreshold: 2,
        downThreshold: 1,
        useTimeWindow: false,
      });
      expect(res).toBe(true);
    });
  });

  describe('when useTimeWindow is true', () => {
    it('should return false if monitor does not meets location threshold', () => {
      const matchesByLocation: AlertStatusMetaData[] = [
        {
          checks: { down: 0, downWithinXChecks: 0 },
          locationId: 'us_central_qa',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
      ];
      const res = getDoesMonitorMeetLocationThreshold({
        matchesByLocation,
        locationsThreshold: 1,
        downThreshold: 1,
        useTimeWindow: true,
      });
      expect(res).toBe(false);
    });

    it('should return true if monitor meets location threshold', () => {
      const matchesByLocation: AlertStatusMetaData[] = [
        {
          checks: { down: 1, downWithinXChecks: 0 },
          locationId: 'us_central_qa',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
      ];
      const res = getDoesMonitorMeetLocationThreshold({
        matchesByLocation,
        locationsThreshold: 1,
        downThreshold: 1,
        useTimeWindow: true,
      });
      expect(res).toBe(true);
    });

    it('should return false if monitor does not meets 2 location threshold', () => {
      const matchesByLocation: AlertStatusMetaData[] = [
        {
          checks: { down: 1, downWithinXChecks: 0 },
          locationId: 'us_central_qa',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
      ];
      const res = getDoesMonitorMeetLocationThreshold({
        matchesByLocation,
        locationsThreshold: 2,
        downThreshold: 1,
        useTimeWindow: true,
      });
      expect(res).toBe(false);
    });

    it('should return true if monitor meets 2 location threshold', () => {
      const matchesByLocation: AlertStatusMetaData[] = [
        {
          checks: { down: 1, downWithinXChecks: 0 },
          locationId: 'us_central_qa',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
        {
          checks: { down: 1, downWithinXChecks: 1 },
          locationId: 'us_central',
          ping: testPing,
          configId: 'id1',
          monitorQueryId: 'test',
          status: 'down',
          timestamp: '2021-06-01T00:00:00.000Z',
        },
      ];
      const res = getDoesMonitorMeetLocationThreshold({
        matchesByLocation,
        locationsThreshold: 2,
        downThreshold: 1,
        useTimeWindow: true,
      });
      expect(res).toBe(true);
    });
  });
});

const testMonitors = [
  {
    type: 'synthetics-monitor',
    id: 'id1',
    attributes: {
      type: 'browser',
      form_monitor_type: 'multistep',
      enabled: true,
      alert: { status: { enabled: false } },
      schedule: { unit: 'm', number: '10' },
      'service.name': '',
      config_id: 'id1',
      tags: [],
      timeout: null,
      name: 'https://www.google.com',
      locations: [
        {
          geo: { lon: -95.86, lat: 41.25 },
          isServiceManaged: true,
          id: 'us_central_qa',
          label: 'US Central QA',
        },
      ],
      namespace: 'test_monitor',
      origin: 'ui',
      journey_id: '',
      hash: '',
      id: 'id1',
      project_id: '',
      playwright_options: '',
      __ui: {
        script_source: { is_generated_script: false, file_name: '' },
      },
      'url.port': null,
      playwright_text_assertion: '',
      urls: 'https://www.google.com',
      screenshots: 'on',
      'filter_journeys.match': '',
      'filter_journeys.tags': [],
      ignore_https_errors: false,
      throttling: {
        id: 'custom',
        label: 'Custom',
        value: {
          download: '5',
          upload: '3',
          latency: '20',
        },
      },
      'ssl.certificate_authorities': '',
      'ssl.certificate': '',
      'ssl.verification_mode': 'full',
      'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
      revision: 3,
    },
    references: [],
    migrationVersion: { 'synthetics-monitor': '8.6.0' },
    coreMigrationVersion: '8.0.0',
    updated_at: '2023-02-23T21:19:21.041Z',
    created_at: '2023-02-23T21:04:19.579Z',
    version: 'WzY1MjUwLDNd',
    namespaces: ['test-monitor'],
    score: null,
    sort: ['https://www.google.com', 1889],
  },
] as any;

const testPing = {
  '@timestamp': '2024-05-13T12:33:37.000Z',
  monitor: {
    id: 'test',
    name: 'test monitor',
    type: 'browser',
  },
  tags: ['dev'],
  url: {
    full: 'https://www.google.com',
  },
  observer: {
    name: 'test',
    geo: {
      name: 'Test location',
    },
  },
} as any;
