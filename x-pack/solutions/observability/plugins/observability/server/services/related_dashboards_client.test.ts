/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RelatedDashboardsClient } from './related_dashboards_client';
import { Logger } from '@kbn/core/server';
import { IContentClient } from '@kbn/content-management-plugin/server/types';
import { InvestigateAlertsClient } from './investigate_alerts_client';
import { AlertData } from './alert_data';

describe('RelatedDashboardsClient', () => {
  let logger: jest.Mocked<Logger>;
  let dashboardClient: jest.Mocked<IContentClient<any>>;
  let alertsClient: jest.Mocked<InvestigateAlertsClient>;
  let alertId: string;
  let client: RelatedDashboardsClient;

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
      search: jest.fn().mockReturnValue({
        result: {
          hits: [
            { id: 'dashboard1', attributes: { title: 'Dashboard 1', panels: [] } },
            { id: 'dashboard2', attributes: { title: 'Dashboard 2', panels: [] } },
          ],
          pagination: { total: 2 },
        },
      }),
    } as unknown as jest.Mocked<IContentClient<any>>;

    alertsClient = {
      getAlertById: jest.fn(),
    } as unknown as jest.Mocked<InvestigateAlertsClient>;

    alertId = 'test-alert-id';

    client = new RelatedDashboardsClient(logger, dashboardClient, alertsClient, alertId);
  });

  describe('fetchSuggestedDashboards', () => {
    it('should throw error if no alert is found', async () => {
      // @ts-ignore next-line
      alertsClient.getAlertById.mockResolvedValue(null);

      await expect(client.fetchSuggestedDashboards()).rejects.toThrow(
        `Alert with id ${alertId} not found. Could not fetch related dashboards.`
      );
    });

    it('should fetch dashboards and return suggested dashboards', async () => {
      const mockAlert = {
        getAllRelevantFields: jest.fn().mockReturnValue(['field1', 'field2']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);
      dashboardClient.search.mockResolvedValue({
        contentTypeId: 'dashboard',
        result: {
          hits: [],
          pagination: { total: 0 },
        },
      });

      const result = await client.fetchSuggestedDashboards();

      expect(result.suggestedDashboards).toEqual([]);
      expect(alertsClient.getAlertById).toHaveBeenCalledWith(alertId);
    });

    it('should sort dashboards by score', async () => {
      const mockAlert = {
        getAllRelevantFields: jest.fn().mockReturnValue(['field1']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);

      dashboardClient.search.mockResolvedValue({
        contentTypeId: 'dashboard',
        result: {
          hits: [
            {
              id: 'dashboard1',
              attributes: {
                title: 'Dashboard 1',
                panels: [
                  {
                    type: 'lens',
                    panelConfig: {
                      attributes: {
                        references: [
                          { name: 'indexpattern', id: 'index1' },
                          { name: 'irrelevant', id: 'index2' },
                        ],
                        state: {
                          datasourceStates: {
                            formBased: {
                              layers: [{ columns: [{ sourceField: 'field2' }] }],
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
            {
              id: 'dashboard2',
              attributes: {
                title: 'Dashboard 2',
                panels: [
                  {
                    type: 'lens',
                    panelConfig: {
                      attributes: {
                        references: [
                          { name: 'indexpattern', id: 'index1' },
                          { name: 'irrelevant', id: 'index2' },
                        ],
                        state: {
                          datasourceStates: {
                            formBased: {
                              layers: [{ columns: [{ sourceField: 'field1' }] }],
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
          pagination: { total: 2 },
        },
      });

      const result = await client.fetchSuggestedDashboards();

      expect(result.suggestedDashboards).toEqual([
        {
          id: 'dashboard1',
          matchedBy: { index: ['index1'] },
          relevantPanelCount: 1,
          relevantPanels: [
            {
              matchedBy: { index: ['index1'] },
              panel: {
                panelConfig: {
                  attributes: {
                    references: [
                      { id: 'index1', name: 'indexpattern' },
                      { id: 'index2', name: 'irrelevant' },
                    ],
                    state: {
                      datasourceStates: {
                        formBased: { layers: [{ columns: [{ sourceField: 'field2' }] }] },
                      },
                    },
                  },
                },
                panelIndex: expect.any(String),
                title: undefined,
                type: 'lens',
              },
            },
          ],
          score: 0.5,
          title: 'Dashboard 1',
        },
        {
          id: 'dashboard2',
          matchedBy: { fields: ['field1'], index: ['index1'] },
          relevantPanelCount: 2,
          relevantPanels: [
            {
              matchedBy: { index: ['index1'] },
              panel: {
                panelConfig: {
                  attributes: {
                    references: [
                      { id: 'index1', name: 'indexpattern' },
                      { id: 'index2', name: 'irrelevant' },
                    ],
                    state: {
                      datasourceStates: {
                        formBased: { layers: [{ columns: [{ sourceField: 'field1' }] }] },
                      },
                    },
                  },
                },
                panelIndex: expect.any(String),
                title: undefined,
                type: 'lens',
              },
            },
            {
              matchedBy: { fields: ['field1'] },
              panel: {
                panelConfig: {
                  attributes: {
                    references: [
                      { id: 'index1', name: 'indexpattern' },
                      { id: 'index2', name: 'irrelevant' },
                    ],
                    state: {
                      datasourceStates: {
                        formBased: { layers: [{ columns: [{ sourceField: 'field1' }] }] },
                      },
                    },
                  },
                },
                panelIndex: expect.any(String),
                title: undefined,
                type: 'lens',
              },
            },
          ],
          score: 0.5,
          title: 'Dashboard 2',
        },
      ]);
    });

    it('should return only the top 10 results', async () => {
      const mockAlert = {
        getAllRelevantFields: jest.fn().mockReturnValue(['field1']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);

      dashboardClient.search.mockResolvedValue({
        contentTypeId: 'dashboard',
        result: {
          hits: Array.from({ length: 20 }, (_, i) => ({
            id: `dashboard${i + 1}`,
            attributes: {
              title: `Dashboard ${i + 1}`,
              panels: [
                {
                  type: 'lens',
                  panelConfig: {
                    attributes: {
                      references: [
                        { name: 'indexpattern', id: 'index1' },
                        { name: 'irrelevant', id: 'index2' },
                      ],
                      state: {
                        datasourceStates: {
                          formBased: { layers: [{ columns: [{ sourceField: 'field1' }] }] },
                        },
                      },
                    },
                  },
                },
              ],
            },
          })),
          pagination: { total: 20 },
        },
      });

      const result = await client.fetchSuggestedDashboards();

      expect(result.suggestedDashboards).toHaveLength(10);
    });

    it('should deduplicate dashboards found by field and index', async () => {
      const mockAlert = {
        getAllRelevantFields: jest.fn().mockReturnValue(['field1']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);

      dashboardClient.search.mockResolvedValue({
        contentTypeId: 'dashboard',
        result: {
          hits: [
            {
              id: 'dashboard1',
              attributes: {
                title: 'Dashboard 1',
                panels: [
                  {
                    type: 'lens',
                    panelIndex: '123',
                    panelConfig: {
                      attributes: {
                        references: [{ name: 'indexpattern', id: 'index1' }], // matches by index which is handled by getDashboardsByIndex
                        state: {
                          datasourceStates: {
                            formBased: { layers: [{ columns: [{ sourceField: 'field1' }] }] }, // matches by field which is handled by getDashboardsByField
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
          pagination: { total: 1 },
        },
      });

      const result = await client.fetchSuggestedDashboards();

      expect(result.suggestedDashboards).toHaveLength(1);
      // should return only one dashboard even though it was found by both internal methods
      // should mark the relevant panel as matching by index and field
      expect(result.suggestedDashboards).toEqual([
        {
          id: 'dashboard1',
          matchedBy: { fields: ['field1'], index: ['index1'] },
          relevantPanelCount: 1,
          relevantPanels: [
            {
              matchedBy: { index: ['index1'], fields: ['field1'] },
              panel: {
                panelConfig: {
                  attributes: {
                    references: [{ id: 'index1', name: 'indexpattern' }],
                    state: {
                      datasourceStates: {
                        formBased: { layers: [{ columns: [{ sourceField: 'field1' }] }] },
                      },
                    },
                  },
                },
                panelIndex: '123',
                title: undefined,
                type: 'lens',
              },
            },
          ],
          score: 0.5,
          title: 'Dashboard 1',
        },
      ]);
    });
  });

  describe('fetchDashboards', () => {
    it('should fetch dashboards and populate dashboardsById', async () => {
      dashboardClient.search.mockResolvedValue({
        contentTypeId: 'dashboard',
        result: {
          hits: [
            { id: 'dashboard1', attributes: { title: 'Dashboard 1', panels: [] } },
            { id: 'dashboard2', attributes: { title: 'Dashboard 2', panels: [] } },
          ],
          pagination: { total: 2 },
        },
      });

      await client.fetchDashboards({ page: 1, perPage: 2 });

      expect(dashboardClient.search).toHaveBeenCalledWith(
        { limit: 2, cursor: '1' },
        { spaces: ['*'] }
      );
      expect(client.dashboardsById.size).toBe(2);
    });
  });

  describe('getDashboardsByIndex', () => {
    it('should return dashboards matching the given index', () => {
      client.dashboardsById.set('dashboard1', {
        id: 'dashboard1',
        attributes: {
          title: 'Dashboard 1',
          panels: [
            {
              type: 'lens',
              panelConfig: {
                attributes: {
                  references: [
                    { name: 'indexpattern', id: 'index2' },
                    { name: 'irrelevant', id: 'index1' },
                  ],
                },
              },
            },
          ],
        },
      } as any);

      const resultWithoutMatch = client.getDashboardsByIndex('index1');
      expect(resultWithoutMatch.dashboards).toEqual([]);

      const resultWithMatch = client.getDashboardsByIndex('index2');
      expect(resultWithMatch.dashboards).toHaveLength(1);
      expect(resultWithMatch.dashboards[0].id).toBe('dashboard1');
      expect(resultWithMatch.dashboards[0].matchedBy).toEqual({
        index: ['index2'],
      });
    });
  });

  describe('dedupePanels', () => {
    it('should deduplicate panels by panelIndex', () => {
      const panels = [
        { panel: { panelIndex: '1' }, matchedBy: { index: ['index1'] } },
        { panel: { panelIndex: '1' }, matchedBy: { fields: ['field1'] } },
      ];

      const result = client.dedupePanels(panels as any);

      expect(result).toHaveLength(1);
      expect(result[0].matchedBy).toEqual({ index: ['index1'], fields: ['field1'] });
    });
  });

  describe('getScore', () => {
    it('should calculate the relevance score for a dashboard', () => {
      const mockAlert = {
        getAllRelevantFields: jest.fn().mockReturnValue(['field1', 'field2']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      client.setAlert(mockAlert);

      const dashboard = {
        matchedBy: { fields: ['field1'], index: ['index1'] },
      } as any;

      const score = client.getScore(dashboard);

      expect(score).toBeCloseTo(2 / 3);

      const dashboard2 = {
        matchedBy: { fields: ['field1', 'field2'], index: ['index1'] },
      } as any;

      const score2 = client.getScore(dashboard2);

      expect(score2).toBe(1);
    });
  });
});
