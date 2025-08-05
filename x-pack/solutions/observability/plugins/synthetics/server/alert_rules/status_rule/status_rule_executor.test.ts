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
import * as locationsUtils from '../../synthetics_service/get_all_locations';
import type { PublicLocation } from '../../../common/runtime_types';
import { SyntheticsServerSetup } from '../../types';
import {
  AlertStatusMetaData,
  AlertPendingStatusMetaData,
} from '../../../common/runtime_types/alert_rules/common';
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
  const configRepo = statusRule.monitorConfigRepository;

  describe('DefaultRule', () => {
    it('should only query enabled monitors', async () => {
      const spy = jest.spyOn(configRepo, 'getAll').mockResolvedValue([]);

      const { downConfigs, staleDownConfigs } = await statusRule.getConfigs({});

      expect(downConfigs).toEqual({});
      expect(staleDownConfigs).toEqual({});

      expect(spy).toHaveBeenCalledWith({
        filter: 'synthetics-monitor-multi-space.attributes.alert.status.enabled: true',
      });
    });

    it('should use all monitorLocationIds when params locations is an empty array', async () => {
      // Create a spy on the queryMonitorStatusAlert function
      const queryMonitorStatusAlertModule = await import('./queries/query_monitor_status_alert');
      const spy = jest
        .spyOn(queryMonitorStatusAlertModule, 'queryMonitorStatusAlert')
        .mockResolvedValue({
          upConfigs: {},
          downConfigs: {},
          enabledMonitorQueryIds: [],
          pendingConfigs: {},
          configStats: {},
        });

      // Create a new instance with empty locations array
      const statusRuleWithEmptyLocations = new StatusRuleExecutor(
        esClient,
        serverMock,
        monitorClient,
        {
          params: {
            locations: [], // Empty locations array
          },
          services: {
            uiSettingsClient,
            savedObjectsClient: soClient,
            scopedClusterClient: { asCurrentUser: mockEsClient },
          },
          rule: {
            name: 'test',
          },
        } as any
      );

      // Mock the getAll method to return test monitors with a location
      jest
        .spyOn(statusRuleWithEmptyLocations.monitorConfigRepository, 'getAll')
        .mockResolvedValue(testMonitors);

      // Execute
      await statusRuleWithEmptyLocations.getConfigs({});

      // Verify that queryMonitorStatusAlert was called passing the monitor location
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          monitorLocationIds: ['us_central_qa'],
        })
      );
    });

    it('marks deleted configs as expected', async () => {
      jest.spyOn(configRepo, 'getAll').mockResolvedValue(testMonitors);

      const { downConfigs } = await statusRule.getConfigs({});

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
      jest.spyOn(configRepo, 'getAll').mockResolvedValue([
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

      const { downConfigs } = await statusRule.getConfigs({});

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

    it('should send 2 alerts for grouped by location', async () => {
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

    it('should send 2 alerts for un-grouped with 2 different monitors', async () => {
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
          'id2-us_central_dev': {
            locationId: 'us_central_dev',
            configId: 'id2',
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
  });

  describe('handlePendingMonitorAlert', () => {
    let schedulePendingAlertPerConfigIdSpy: jest.SpyInstance;
    let schedulePendingAlertPerConfigIdPerLocationSpy: jest.SpyInstance;

    const MOCK_FIRST_MONITOR = {
      id: 'monitor-1',
      name: 'Monitor 1',
      type: 'browser',
      url: 'http://monitor.1.com',
    };
    const MOCK_SECOND_MONITOR = {
      id: 'monitor-2',
      name: 'Monitor 2',
      type: 'http',
      url: 'http://monitor.2.com',
    };
    const MOCK_FIRST_LOCATION = { id: 'location-1', name: 'Test Location 1' };
    const MOCK_SECOND_LOCATION = { id: 'location-2', name: 'Test Location 2' };
    const FIRST_CONFIG_ID = `${MOCK_FIRST_MONITOR.id}${MOCK_FIRST_LOCATION.id}`;
    const SECOND_CONFIG_ID = `${MOCK_SECOND_MONITOR.id}${MOCK_SECOND_LOCATION.id}`;

    const mockPendingConfigs: Record<string, AlertPendingStatusMetaData> = {
      [FIRST_CONFIG_ID]: {
        configId: MOCK_FIRST_MONITOR.id,
        locationId: MOCK_FIRST_LOCATION.id,
        status: 'pending',
        timestamp: '2025-05-15T10:00:00.000Z',
        monitorQueryId: MOCK_FIRST_MONITOR.id,
        ping: {
          '@timestamp': '2025-05-15T10:00:00.000Z',
          monitor: MOCK_FIRST_MONITOR,
          url: { full: MOCK_FIRST_MONITOR.url },
          observer: {
            geo: { name: MOCK_FIRST_LOCATION.name },
          },
        } as any,
        monitorInfo: {
          monitor: MOCK_FIRST_MONITOR,
          observer: { geo: { name: MOCK_FIRST_LOCATION.name } },
          tags: ['test', 'monitor1'],
          url: { full: MOCK_FIRST_MONITOR.url },
        },
      },
      [SECOND_CONFIG_ID]: {
        configId: MOCK_SECOND_MONITOR.id,
        locationId: MOCK_SECOND_LOCATION.id,
        status: 'pending',
        timestamp: '2025-05-15T10:00:00.000Z',
        monitorQueryId: MOCK_SECOND_MONITOR.id,
        ping: {
          '@timestamp': '2025-05-15T10:00:00.000Z',
          monitor: MOCK_SECOND_MONITOR,
          url: { full: MOCK_SECOND_MONITOR.url },
          observer: {
            geo: { name: MOCK_SECOND_LOCATION.name },
          },
        } as any,
        monitorInfo: {
          monitor: MOCK_SECOND_MONITOR,
          observer: { geo: { name: MOCK_SECOND_LOCATION.name } },
          tags: ['test', 'monitor2'],
          url: { full: MOCK_SECOND_MONITOR.url },
        },
      },
    };

    beforeEach(() => {
      schedulePendingAlertPerConfigIdSpy = jest.spyOn(
        statusRule,
        'schedulePendingAlertPerConfigId'
      );
      schedulePendingAlertPerConfigIdPerLocationSpy = jest.spyOn(
        statusRule,
        'schedulePendingAlertPerConfigIdPerLocation'
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call schedulePendingAlertPerConfigId when alertOnNoData is true and groupBy is not locationId', () => {
      // Set up params with alertOnNoData=true and groupBy='monitor'
      statusRule.params = {
        condition: {
          alertOnNoData: true,
          groupBy: 'monitor',
        } as any,
      };

      // Call the method
      statusRule.handlePendingMonitorAlert({ pendingConfigs: mockPendingConfigs });

      // Verify schedulePendingAlertPerConfigId was called with the correct arguments
      expect(schedulePendingAlertPerConfigIdSpy).toHaveBeenCalledTimes(1);
      expect(schedulePendingAlertPerConfigIdSpy).toHaveBeenCalledWith({
        pendingConfigs: mockPendingConfigs,
      });

      // Verify schedulePendingAlertPerConfigIdPerLocation was not called
      expect(schedulePendingAlertPerConfigIdPerLocationSpy).not.toHaveBeenCalled();
    });

    it('should call schedulePendingAlertPerConfigIdPerLocation when alertOnNoData is true and groupBy is locationId', () => {
      // Set up params with alertOnNoData=true and groupBy='locationId'
      statusRule.params = {
        condition: {
          alertOnNoData: true,
          groupBy: 'locationId',
        } as any,
      };

      // Call the method
      statusRule.handlePendingMonitorAlert({ pendingConfigs: mockPendingConfigs });

      // Verify schedulePendingAlertPerConfigIdPerLocation was called with the correct arguments
      expect(schedulePendingAlertPerConfigIdPerLocationSpy).toHaveBeenCalledTimes(1);
      expect(schedulePendingAlertPerConfigIdPerLocationSpy).toHaveBeenCalledWith({
        pendingConfigs: mockPendingConfigs,
      });

      // Verify schedulePendingAlertPerConfigId was not called
      expect(schedulePendingAlertPerConfigIdSpy).not.toHaveBeenCalled();
    });

    it('should call schedulePendingAlertPerConfigIdPerLocation when alertOnNoData is true and groupBy is undefined', () => {
      // Set up params with alertOnNoData=true and groupBy undefined
      statusRule.params = {
        condition: {
          alertOnNoData: true,
        } as any,
      };

      // Call the method
      statusRule.handlePendingMonitorAlert({ pendingConfigs: mockPendingConfigs });

      // Verify schedulePendingAlertPerConfigIdPerLocation was called with the correct arguments
      expect(schedulePendingAlertPerConfigIdPerLocationSpy).toHaveBeenCalledTimes(1);
      expect(schedulePendingAlertPerConfigIdPerLocationSpy).toHaveBeenCalledWith({
        pendingConfigs: mockPendingConfigs,
      });

      // Verify schedulePendingAlertPerConfigId was not called
      expect(schedulePendingAlertPerConfigIdSpy).not.toHaveBeenCalled();
    });

    it('should not call any scheduling methods when alertOnNoData is false', () => {
      // Set up params with alertOnNoData=false
      statusRule.params = {
        condition: {
          alertOnNoData: false,
          groupBy: 'locationId', // This shouldn't matter since alertOnNoData is false
        } as any,
      };

      // Call the method
      statusRule.handlePendingMonitorAlert({ pendingConfigs: mockPendingConfigs });

      // Verify neither method was called
      expect(schedulePendingAlertPerConfigIdSpy).not.toHaveBeenCalled();
      expect(schedulePendingAlertPerConfigIdPerLocationSpy).not.toHaveBeenCalled();
    });

    describe('schedulePendingAlertPerConfigIdPerLocation', () => {
      let scheduleAlertSpy: jest.SpyInstance;

      beforeEach(() => {
        // Set up statusRule with necessary parameters for getMonitorPendingSummary
        statusRule.dateFormat = 'Y-MM-DD HH:mm:ss';
        statusRule.tz = 'UTC';
        statusRule.params = {
          condition: {
            alertOnNoData: true,
          } as any,
        };

        scheduleAlertSpy = jest.spyOn(statusRule, 'scheduleAlert');
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should call scheduleAlert for each pending config with correct parameters', () => {
        // Call the method
        statusRule.schedulePendingAlertPerConfigIdPerLocation({
          pendingConfigs: mockPendingConfigs,
        });

        // Verify scheduleAlert was called with the correct parameters for each config
        expect(scheduleAlertSpy).toHaveBeenCalledTimes(2);

        expect(scheduleAlertSpy).toHaveBeenNthCalledWith(1, {
          alertId: FIRST_CONFIG_ID,
          idWithLocation: FIRST_CONFIG_ID,
          locationNames: [MOCK_FIRST_LOCATION.name],
          locationIds: [MOCK_FIRST_LOCATION.id],
          statusConfig: mockPendingConfigs[FIRST_CONFIG_ID],
          monitorSummary: {
            configId: MOCK_FIRST_MONITOR.id,
            downThreshold: 1,
            locationId: MOCK_FIRST_LOCATION.id,
            locationName: MOCK_FIRST_LOCATION.name,
            locationNames: MOCK_FIRST_LOCATION.name,
            monitorId: MOCK_FIRST_MONITOR.id,
            monitorName: MOCK_FIRST_MONITOR.name,
            monitorTags: ['test', 'monitor1'],
            monitorType: MOCK_FIRST_MONITOR.type,
            monitorUrl: MOCK_FIRST_MONITOR.url,
            monitorUrlLabel: 'URL',
            reason: `Monitor "${MOCK_FIRST_MONITOR.name}" from ${MOCK_FIRST_LOCATION.name} is pending.`,
            status: 'pending',
          },
        });
        expect(scheduleAlertSpy).toHaveBeenNthCalledWith(2, {
          alertId: SECOND_CONFIG_ID,
          idWithLocation: SECOND_CONFIG_ID,
          locationNames: [MOCK_SECOND_LOCATION.name],
          locationIds: [MOCK_SECOND_LOCATION.id],
          statusConfig: mockPendingConfigs[SECOND_CONFIG_ID],
          monitorSummary: {
            configId: MOCK_SECOND_MONITOR.id,
            downThreshold: 1,
            locationId: MOCK_SECOND_LOCATION.id,
            locationName: MOCK_SECOND_LOCATION.name,
            locationNames: MOCK_SECOND_LOCATION.name,
            monitorId: MOCK_SECOND_MONITOR.id,
            monitorName: MOCK_SECOND_MONITOR.name,
            monitorTags: ['test', 'monitor2'],
            monitorType: 'HTTP',
            monitorUrl: MOCK_SECOND_MONITOR.url,
            monitorUrlLabel: 'URL',
            reason: `Monitor "${MOCK_SECOND_MONITOR.name}" from ${MOCK_SECOND_LOCATION.name} is pending.`,
            status: 'pending',
          },
        });
      });

      it('should do nothing if pendingConfigs is empty', () => {
        // Call the method with empty pendingConfigs
        statusRule.schedulePendingAlertPerConfigIdPerLocation({ pendingConfigs: {} });

        // Verify scheduleAlert was not called
        expect(scheduleAlertSpy).not.toHaveBeenCalled();
      });
    });

    describe('schedulePendingAlertPerConfigId', () => {
      let scheduleAlertSpy: jest.SpyInstance;

      beforeEach(() => {
        // Set up statusRule with necessary parameters for getUngroupedPendingSummary
        statusRule.dateFormat = 'Y-MM-DD HH:mm:ss';
        statusRule.tz = 'UTC';
        statusRule.params = {
          condition: {
            alertOnNoData: true,
          } as any,
        };

        scheduleAlertSpy = jest.spyOn(statusRule, 'scheduleAlert');
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should group configs by configId and call scheduleAlert with combined location information', () => {
        // Call the method
        statusRule.schedulePendingAlertPerConfigId({ pendingConfigs: mockPendingConfigs });

        // Verify scheduleAlert was called twice (once for each unique configId)
        expect(scheduleAlertSpy).toHaveBeenCalledTimes(2);

        expect(scheduleAlertSpy).toHaveBeenNthCalledWith(1, {
          alertId: MOCK_FIRST_MONITOR.id,
          idWithLocation: MOCK_FIRST_MONITOR.id,
          locationNames: [MOCK_FIRST_LOCATION.name],
          locationIds: [MOCK_FIRST_LOCATION.id],
          statusConfig: mockPendingConfigs[FIRST_CONFIG_ID],
          monitorSummary: {
            configId: MOCK_FIRST_MONITOR.id,
            downThreshold: 1,
            locationId: MOCK_FIRST_LOCATION.id,
            locationName: MOCK_FIRST_LOCATION.name,
            locationNames: MOCK_FIRST_LOCATION.name,
            monitorId: MOCK_FIRST_MONITOR.id,
            monitorName: MOCK_FIRST_MONITOR.name,
            monitorTags: ['test', 'monitor1'],
            monitorType: MOCK_FIRST_MONITOR.type,
            monitorUrl: MOCK_FIRST_MONITOR.url,
            monitorUrlLabel: 'URL',
            reason: `Monitor "${MOCK_FIRST_MONITOR.name}" is pending 1 time from ${MOCK_FIRST_LOCATION.name}.`,
            status: 'pending',
          },
        });
        expect(scheduleAlertSpy).toHaveBeenNthCalledWith(2, {
          alertId: MOCK_SECOND_MONITOR.id,
          idWithLocation: MOCK_SECOND_MONITOR.id,
          locationNames: [MOCK_SECOND_LOCATION.name],
          locationIds: [MOCK_SECOND_LOCATION.id],
          statusConfig: mockPendingConfigs[SECOND_CONFIG_ID],
          monitorSummary: {
            configId: MOCK_SECOND_MONITOR.id,
            downThreshold: 1,
            locationId: MOCK_SECOND_LOCATION.id,
            locationName: MOCK_SECOND_LOCATION.name,
            locationNames: MOCK_SECOND_LOCATION.name,
            monitorId: MOCK_SECOND_MONITOR.id,
            monitorName: MOCK_SECOND_MONITOR.name,
            monitorTags: ['test', 'monitor2'],
            monitorType: 'HTTP',
            monitorUrl: MOCK_SECOND_MONITOR.url,
            monitorUrlLabel: 'URL',
            reason: `Monitor "${MOCK_SECOND_MONITOR.name}" is pending 1 time from ${MOCK_SECOND_LOCATION.name}.`,
            status: 'pending',
          },
        });
      });

      it('should do nothing if pendingConfigs is empty', () => {
        // Call the method with empty pendingConfigs
        statusRule.schedulePendingAlertPerConfigId({ pendingConfigs: {} });

        // Verify scheduleAlert was not called
        expect(scheduleAlertSpy).not.toHaveBeenCalled();
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
