/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SuggestedDashboardsClient } from './suggested_dashboards_client';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { IContentClient } from '@kbn/content-management-plugin/server/types';
import type { InvestigateAlertsClient } from './investigate_alerts_client';
import type { AlertData } from './alert_data';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ReferencedPanelManager } from './referenced_panel_manager';
import type { SearchResponse } from '@kbn/content-management-plugin/server/core/crud';

describe('SuggestedDashboardsClient', () => {
  let logger: jest.Mocked<Logger>;
  let dashboardClient: jest.Mocked<IContentClient<any>>;
  let alertsClient: jest.Mocked<InvestigateAlertsClient>;
  let alertId: string;
  let client: SuggestedDashboardsClient;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let referencedPanelManager: jest.Mocked<ReferencedPanelManager>;

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
      getAlertById: jest.fn().mockResolvedValue(baseMockAlert),
    } as unknown as jest.Mocked<InvestigateAlertsClient>;

    alertId = 'test-alert-id';

    soClientMock = savedObjectsClientMock.create();

    referencedPanelManager = {
      addReferencedPanel: jest.fn(),
      fetchReferencedPanels: jest.fn().mockResolvedValue(undefined),
      getPanelFields: jest.fn().mockReturnValue(['field1']),
      getPanelIndices: jest.fn().mockReturnValue(['index1']),
    } as unknown as jest.Mocked<ReferencedPanelManager>;

    client = new SuggestedDashboardsClient(
      logger,
      dashboardClient,
      alertsClient,
      alertId,
      referencedPanelManager
    );

    jest.clearAllMocks();
  });

  describe('fetchSuggested', () => {
    it('should fetch and score dashboards correctly', async () => {
      // Mock search responses for unfiltered matches
      dashboardClient.search.mockImplementation((params) => {
        if (!params.text) {
          // Unfiltered search
          return Promise.resolve({
            result: {
              hits: [
                {
                  id: 'dashboard1',
                  attributes: {
                    title: 'Dashboard 1',
                    panels: [{ type: 'lens', panelRefName: 'panel_0' }],
                  },
                  managed: false,
                },
              ],
              pagination: { total: 1 },
            },
          } as unknown as SearchResponse<any>);
        } else {
          // Text search
          return Promise.resolve({
            result: {
              hits: [
                {
                  id: 'dashboard2',
                  attributes: {
                    title: 'Dashboard 2',
                    panels: [{ type: 'lens', panelRefName: 'panel_1' }],
                  },
                  managed: false,
                },
              ],
              pagination: { total: 1 },
            },
          } as unknown as SearchResponse<any>);
        }
      });

      const result = await client.fetchSuggested(baseMockAlert);

      // Should have merged and scored dashboards from both searches
      expect(result.length).toBe(2);
      expect(result.find((d) => d.id === 'dashboard1')).toBeDefined();
      expect(result.find((d) => d.id === 'dashboard2')).toBeDefined();

      // Verify the scoring is working (exact values may vary based on implementation)
      expect(result.every((d) => d.score > 0)).toBe(true);

      // Verify calls to referencedPanelManager
      expect(referencedPanelManager.fetchReferencedPanels).toHaveBeenCalled();
    });

    it('should handle empty rule name', async () => {
      const mockAlert = {
        ...baseMockAlert,
        getRuleName: jest.fn().mockReturnValue(''),
      } as unknown as AlertData;

      // Mock unfiltered search
      dashboardClient.search.mockResolvedValueOnce({
        result: {
          hits: [
            {
              id: 'dashboard1',
              attributes: {
                title: 'Dashboard 1',
                panels: [{ type: 'lens', panelRefName: 'panel_0' }],
              },
              managed: false,
            },
          ],
          pagination: { total: 1 },
        },
      } as unknown as SearchResponse<any>);

      const result = await client.fetchSuggested(mockAlert);

      // Should only have results from unfiltered search
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('dashboard1');

      // Should have only made one search call (unfiltered only)
      expect(dashboardClient.search).toHaveBeenCalledTimes(1);
    });

    it('should penalize managed dashboards', async () => {
      // Mock search responses with managed and unmanaged dashboards
      dashboardClient.search.mockImplementation((params) => {
        if (!params.text) {
          // Unfiltered search
          return Promise.resolve({
            result: {
              hits: [
                {
                  id: 'dashboard1',
                  attributes: {
                    title: 'Dashboard 1',
                    panels: [{ type: 'lens', panelRefName: 'panel_0' }],
                  },
                  managed: false,
                },
                {
                  id: 'dashboard2',
                  attributes: {
                    title: 'Dashboard 2',
                    panels: [{ type: 'lens', panelRefName: 'panel_1' }],
                  },
                  managed: true,
                },
              ],
              pagination: { total: 2 },
            },
          } as unknown as SearchResponse<any>);
        } else {
          return Promise.resolve({
            result: {
              hits: [],
              pagination: { total: 0 },
            },
          } as unknown as SearchResponse<any>);
        }
      });

      const result = await client.fetchSuggested(baseMockAlert);

      // Both dashboards should be included
      expect(result.length).toBe(2);

      // The managed dashboard should have a lower score
      const managedDashboard = result.find((d) => d.id === 'dashboard2');
      const unmanagedDashboard = result.find((d) => d.id === 'dashboard1');

      expect(managedDashboard!.score).toBeLessThan(unmanagedDashboard!.score);
    });
  });
});
