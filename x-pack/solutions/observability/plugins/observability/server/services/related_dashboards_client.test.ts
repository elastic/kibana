/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RelatedDashboardsClient } from './related_dashboards_client';
import type { Logger } from '@kbn/core/server';
import type { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import type { AlertData } from './alert_data';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ReferencedPanelManager } from './referenced_panel_manager';
import { SuggestedDashboardsClient } from './suggested_dashboards_client';
import { LinkedDashboardsClient } from './linked_dashboards_client';

jest.mock('./suggested_dashboards_client');
jest.mock('./linked_dashboards_client');

describe('RelatedDashboardsClient', () => {
  let logger: jest.Mocked<Logger>;
  let dashboardClient: jest.Mocked<IContentClient<any>>;
  let alertsClient: jest.Mocked<InvestigateAlertsClient>;
  let alertId: string;
  let client: RelatedDashboardsClient;
  let soClientMock: jest.Mocked<any>;
  let mockSuggestedDashboardsClient: jest.Mocked<SuggestedDashboardsClient>;
  let mockLinkedDashboardsClient: jest.Mocked<LinkedDashboardsClient>;
  let referencedPanelManager: ReferencedPanelManager;

  const baseMockAlert = {
    getAllRelevantFields: jest.fn().mockReturnValue(new Set(['field1', 'field2'])),
    getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
    getRuleId: jest.fn().mockReturnValue('rule-id'),
    getRuleName: jest.fn().mockReturnValue('Test Rule'),
    getRuleTypeId: jest.fn().mockReturnValue(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID),
  } as unknown as AlertData;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      trace: jest.fn(),
      log: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    dashboardClient = {
      search: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<IContentClient<any>>;

    alertsClient = {
      getAlertById: jest.fn(),
      getRuleById: jest.fn(),
    } as unknown as jest.Mocked<InvestigateAlertsClient>;

    alertId = 'test-alert-id';

    soClientMock = savedObjectsClientMock.create();

    referencedPanelManager = new ReferencedPanelManager(logger, soClientMock);

    // Set up our mocked clients that will be instantiated within RelatedDashboardsClient
    mockSuggestedDashboardsClient = {
      fetchSuggested: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SuggestedDashboardsClient>;

    mockLinkedDashboardsClient = {
      getLinkedDashboardsByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<LinkedDashboardsClient>;

    // Mock the constructors
    (SuggestedDashboardsClient as jest.Mock).mockImplementation(
      () => mockSuggestedDashboardsClient
    );
    (LinkedDashboardsClient as jest.Mock).mockImplementation(() => mockLinkedDashboardsClient);

    client = new RelatedDashboardsClient(
      logger,
      dashboardClient,
      alertsClient,
      alertId,
      referencedPanelManager
    );

    jest.clearAllMocks();
  });

  describe('fetch', () => {
    it('should throw error if no alert is found', async () => {
      alertsClient.getAlertById.mockResolvedValue(null as unknown as AlertData);

      await expect(client.fetch()).rejects.toThrow(
        `Alert with id ${alertId} not found. Could not fetch related dashboards.`
      );
    });

    it('should throw error if alert has no rule ID', async () => {
      const mockAlert = {
        ...baseMockAlert,
        getRuleId: jest.fn().mockReturnValue(undefined),
      } as unknown as AlertData;
      alertsClient.getAlertById.mockResolvedValue(mockAlert);

      await expect(client.fetch()).rejects.toThrow(
        `Alert with id ${alertId} does not have a rule ID. Could not fetch linked dashboards.`
      );
    });

    it('should fetch and filter dashboards correctly', async () => {
      const mockAlert = {
        ...baseMockAlert,
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);
      alertsClient.getRuleById.mockResolvedValue({
        id: 'rule-id',
        name: 'Test Rule',
        tags: [],
        consumer: 'test',
        schedule: { interval: '1m' },
        enabled: true,
        actions: [],
        createdBy: null,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        apiKey: null,
        throttle: null,
        notifyWhen: 'onActiveAlert',
        params: {},
        executionStatus: {
          status: 'ok',
          lastExecutionDate: new Date(),
        },
        ruleTypeId: 'test',
        artifacts: {
          dashboards: [{ id: 'dashboard2' }, { id: 'dashboard4' }],
        },
      } as any);

      const suggestedDashboards = [
        {
          id: 'dashboard1',
          title: 'Dashboard 1',
          description: '',
          matchedBy: { index: [], fields: [], textMatch: 0, isManaged: false },
          score: 10,
          tags: [],
        },
        {
          id: 'dashboard2',
          title: 'Dashboard 2',
          description: '',
          matchedBy: { index: [], fields: [], textMatch: 0, isManaged: false },
          score: 8,
          tags: [],
        },
        {
          id: 'dashboard3',
          title: 'Dashboard 3',
          description: '',
          matchedBy: { index: [], fields: [], textMatch: 0, isManaged: false },
          score: 6,
          tags: [],
        },
      ];

      const linkedDashboards = [
        {
          id: 'dashboard2',
          title: 'Dashboard 2',
          description: '',
          matchedBy: { linked: true },
          tags: [],
        },
        {
          id: 'dashboard4',
          title: 'Dashboard 4',
          description: '',
          matchedBy: { linked: true },
          tags: [],
        },
      ];

      mockSuggestedDashboardsClient.fetchSuggested.mockResolvedValue(suggestedDashboards);
      mockLinkedDashboardsClient.getLinkedDashboardsByIds.mockResolvedValue(linkedDashboards);

      const result = await client.fetch();

      expect(result).toEqual({
        suggestedDashboards: [
          {
            id: 'dashboard1',
            title: 'Dashboard 1',
            description: '',
            matchedBy: { index: [], fields: [], textMatch: 0, isManaged: false },
            score: 10,
            tags: [],
          },
          {
            id: 'dashboard3',
            title: 'Dashboard 3',
            description: '',
            matchedBy: { index: [], fields: [], textMatch: 0, isManaged: false },
            score: 6,
            tags: [],
          },
        ],
        linkedDashboards: [
          {
            id: 'dashboard2',
            title: 'Dashboard 2',
            description: '',
            matchedBy: { linked: true },
            tags: [],
          },
          {
            id: 'dashboard4',
            title: 'Dashboard 4',
            description: '',
            matchedBy: { linked: true },
            tags: [],
          },
        ],
      });

      expect(mockSuggestedDashboardsClient.fetchSuggested).toHaveBeenCalledWith(mockAlert);
      expect(mockLinkedDashboardsClient.getLinkedDashboardsByIds).toHaveBeenCalledWith([
        'dashboard2',
        'dashboard4',
      ]);
    });

    it('should limit suggested dashboards to 10', async () => {
      const mockAlert = {
        ...baseMockAlert,
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);
      alertsClient.getRuleById.mockResolvedValue({
        id: 'rule-id',
        name: 'Test Rule',
        tags: [],
        consumer: 'test',
        schedule: { interval: '1m' },
        enabled: true,
        actions: [],
        createdBy: null,
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        apiKey: null,
        throttle: null,
        notifyWhen: 'onActiveAlert',
        params: {},
        executionStatus: {
          status: 'ok',
          lastExecutionDate: new Date(),
        },
        ruleTypeId: 'test',
        artifacts: {
          dashboards: [{ id: 'dashboard2' }],
        },
      } as any);

      // Create more than 10 suggested dashboards
      const suggestedDashboards = Array.from({ length: 15 }, (_, i) => ({
        id: `dashboard${i}`,
        title: `Dashboard ${i}`,
        description: '',
        matchedBy: { index: [], fields: [], textMatch: 0, isManaged: false },
        score: 20 - i,
        tags: [],
      }));

      const linkedDashboards = [
        {
          id: 'dashboard2',
          title: 'Dashboard 2',
          description: '',
          matchedBy: { linked: true },
          tags: [],
        },
      ];

      mockSuggestedDashboardsClient.fetchSuggested.mockResolvedValue(suggestedDashboards);
      mockLinkedDashboardsClient.getLinkedDashboardsByIds.mockResolvedValue(linkedDashboards);

      const result = await client.fetch();

      // Should have excluded dashboard2 from suggestions since it's in linked dashboards
      // And limited to 10 total suggested dashboards
      expect(result.suggestedDashboards.length).toBe(10);
      expect(result.suggestedDashboards.find((d) => d.id === 'dashboard2')).toBeUndefined();
      expect(result.linkedDashboards).toEqual(linkedDashboards);
    });
  });
});
