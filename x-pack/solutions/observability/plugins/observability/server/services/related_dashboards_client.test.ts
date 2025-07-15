/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { RelatedDashboardsClient } from './related_dashboards_client';
import { Logger } from '@kbn/core/server';
import { IContentClient } from '@kbn/content-management-plugin/server/types';
import { InvestigateAlertsClient } from './investigate_alerts_client';
import { AlertData } from './alert_data';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';

describe('RelatedDashboardsClient', () => {
  let logger: jest.Mocked<Logger>;
  let dashboardClient: jest.Mocked<IContentClient<any>>;
  let alertsClient: jest.Mocked<InvestigateAlertsClient>;
  let alertId: string;
  let client: RelatedDashboardsClient;
  const baseMockAlert = {
    getAllRelevantFields: jest.fn().mockReturnValue(['field1', 'field2']),
    getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
    getRuleId: jest.fn().mockReturnValue('rule-id'),
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
      search: jest.fn().mockReturnValue({
        result: {
          hits: [
            { id: 'dashboard1', attributes: { title: 'Dashboard 1', panels: [] } },
            { id: 'dashboard2', attributes: { title: 'Dashboard 2', panels: [] } },
          ],
          pagination: { total: 2 },
        },
      }),
      get: jest.fn(),
    } as unknown as jest.Mocked<IContentClient<any>>;

    alertsClient = {
      getAlertById: jest.fn(),
      getRuleById: jest.fn().mockResolvedValue({
        artifacts: {
          dashboards: [],
        },
      }),
    } as unknown as jest.Mocked<InvestigateAlertsClient>;

    alertId = 'test-alert-id';

    client = new RelatedDashboardsClient(logger, dashboardClient, alertsClient, alertId, 'default');

    jest.clearAllMocks();
  });

  describe('fetchSuggestedDashboards', () => {
    it('should throw error if no alert is found', async () => {
      // @ts-ignore next-line
      alertsClient.getAlertById.mockResolvedValue(null);

      await expect(client.fetchRelatedDashboards()).rejects.toThrow(
        `Alert with id ${alertId} not found. Could not fetch related dashboards.`
      );
    });

    it('should fetch dashboards and return suggested dashboards', async () => {
      alertsClient.getAlertById.mockResolvedValue(baseMockAlert);
      dashboardClient.search.mockResolvedValue({
        contentTypeId: 'dashboard',
        result: {
          hits: [],
          pagination: { total: 0 },
        },
      });

      const result = await client.fetchRelatedDashboards();

      expect(result.suggestedDashboards).toEqual([]);
      expect(alertsClient.getAlertById).toHaveBeenCalledWith(alertId);
    });

    it('should sort dashboards by score', async () => {
      const mockAlert = {
        ...baseMockAlert,
        getAllRelevantFields: jest.fn().mockReturnValue(['field1']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);

      // @ts-ignore next-line
      client.setAlert(mockAlert);

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
                        type: 'lens',
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
                        type: 'lens',
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

      const result = await client.fetchRelatedDashboards();

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
                    type: 'lens',
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
                    type: 'lens',
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
                    type: 'lens',
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
        ...baseMockAlert,
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
                      type: 'lens',
                    },
                  },
                },
              ],
            },
          })),
          pagination: { total: 20 },
        },
      });

      const { suggestedDashboards } = await client.fetchRelatedDashboards();

      expect(suggestedDashboards).toHaveLength(10);
    });

    it('should deduplicate dashboards found by field and index', async () => {
      const mockAlert = {
        ...baseMockAlert,
        getAllRelevantFields: jest.fn().mockReturnValue(['field1']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);

      // @ts-ignore next-line
      client.setAlert(mockAlert);

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
                        type: 'lens',
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

      const { suggestedDashboards } = await client.fetchRelatedDashboards();

      expect(suggestedDashboards).toHaveLength(1);
      // should return only one dashboard even though it was found by both internal methods
      // should mark the relevant panel as matching by index and field
      expect(suggestedDashboards).toEqual([
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
                    type: 'lens',
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

    it('should not fetch suggested dashboards when the rule type id is not supported', async () => {
      const mockAlert = {
        ...baseMockAlert,
        getRuleTypeId: jest.fn().mockReturnValue('unsupported-type-id'),
      } as unknown as AlertData;
      alertsClient.getAlertById.mockResolvedValue(mockAlert);

      const result = await client.fetchRelatedDashboards();

      expect(result.suggestedDashboards).toEqual([]);
      expect(mockAlert.getRuleTypeId).toHaveBeenCalled();
      expect(mockAlert.getAllRelevantFields).not.toHaveBeenCalled();
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

      // @ts-ignore next-line
      await client.fetchDashboards({ page: 1, perPage: 2 });

      expect(dashboardClient.search).toHaveBeenCalledWith(
        { limit: 2, cursor: '1' },
        { spaces: ['default'] }
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
                  type: 'lens',
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

      // @ts-ignore next-line
      const resultWithoutMatch = client.getDashboardsByIndex('index1');
      expect(resultWithoutMatch.dashboards).toEqual([]);

      // @ts-ignore next-line
      const resultWithMatch = client.getDashboardsByIndex('index2');
      expect(resultWithMatch.dashboards).toHaveLength(1);
      expect(resultWithMatch.dashboards[0].id).toBe('dashboard1');
      expect(resultWithMatch.dashboards[0].matchedBy).toEqual({
        index: ['index2'],
      });
    });

    it('should return an empty set when lens attributes are not available', () => {
      client.dashboardsById.set('dashboard1', {
        id: 'dashboard1',
        attributes: {
          title: 'Dashboard 1',
          panels: [
            {
              type: 'lens',
              panelConfig: {
                attributes: null, // Lens attributes are not available
              },
            },
          ],
        },
      } as any);

      // @ts-ignore next-line
      const result = client.getDashboardsByIndex('index1');
      expect(result.dashboards).toEqual([]);
    });
  });

  describe('getPanelsByField', () => {
    it('should return an empty set when lens attributes are not available', () => {
      client.dashboardsById.set('dashboard1', {
        id: 'dashboard1',
        attributes: {
          title: 'Dashboard 1',
          panels: [
            {
              type: 'lens',
              panelConfig: {
                attributes: null, // Lens attributes are not available
              },
            },
          ],
        },
      } as any);

      // @ts-ignore next-line
      const result = client.getDashboardsByField(['field1']);
      expect(result.dashboards).toEqual([]);
    });
  });

  describe('dedupePanels', () => {
    it('should deduplicate panels by panelIndex', () => {
      const panels = [
        { panel: { panelIndex: '1' }, matchedBy: { index: ['index1'] } },
        { panel: { panelIndex: '1' }, matchedBy: { fields: ['field1'] } },
      ];

      // @ts-ignore next-line
      const result = client.dedupePanels(panels as any);

      expect(result).toHaveLength(1);
      expect(result[0].matchedBy).toEqual({ index: ['index1'], fields: ['field1'] });
    });
  });

  describe('getScore', () => {
    it('should calculate the relevance score for a dashboard', () => {
      const mockAlert = {
        ...baseMockAlert,
        getAllRelevantFields: jest.fn().mockReturnValue(['field1', 'field2']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      // @ts-ignore next-line
      client.setAlert(mockAlert);

      const dashboard = {
        matchedBy: { fields: ['field1'], index: ['index1'] },
      } as any;

      // @ts-ignore next-line
      const score = client.getScore(dashboard);

      expect(score).toBeCloseTo(2 / 3);

      const dashboard2 = {
        matchedBy: { fields: ['field1', 'field2'], index: ['index1'] },
      } as any;

      // @ts-ignore next-line
      const score2 = client.getScore(dashboard2);

      expect(score2).toBe(1);
    });
  });

  describe('Linked Dashboards', () => {
    describe('getLinkedDashboards', () => {
      it('should throw an error if no alert is set', async () => {
        // @ts-ignore next-line
        client.setAlert(null);

        // @ts-ignore next-line
        await expect(client.getLinkedDashboards()).rejects.toThrow(
          `Alert with id ${alertId} not found. Could not fetch related dashboards.`
        );
      });

      it('should return an empty array if no rule ID is found', async () => {
        const mockAlert = {
          ...baseMockAlert,
          getRuleId: jest.fn().mockReturnValue(null),
        } as unknown as AlertData;

        // @ts-ignore next-line
        client.setAlert(mockAlert);

        // @ts-ignore next-line
        await expect(client.getLinkedDashboards()).rejects.toThrow(
          `Alert with id ${alertId} does not have a rule ID. Could not fetch linked dashboards.`
        );
      });

      it('should return an empty array if no rule is found', async () => {
        const mockAlert = {
          getRuleId: jest.fn().mockReturnValue('rule-id'),
        } as unknown as AlertData;

        // @ts-ignore next-line
        client.setAlert(mockAlert);
        alertsClient.getRuleById = jest.fn().mockResolvedValue(null);

        // @ts-ignore next-line
        await expect(client.getLinkedDashboards()).rejects.toThrow(
          `Rule with id rule-id not found. Could not fetch linked dashboards for alert with id ${alertId}.`
        );
      });

      it('should return linked dashboards based on rule artifacts', async () => {
        const mockAlert = {
          getRuleId: jest.fn().mockReturnValue('rule-id'),
        } as unknown as AlertData;

        // @ts-ignore next-line
        client.setAlert(mockAlert);

        alertsClient.getRuleById = jest.fn().mockResolvedValue({
          artifacts: {
            dashboards: [{ id: 'dashboard1' }, { id: 'dashboard2' }],
          },
        });

        dashboardClient.get = jest
          .fn()
          .mockResolvedValueOnce({
            result: { item: { id: 'dashboard1', attributes: { title: 'Dashboard 1' } } },
          })
          .mockResolvedValueOnce({
            result: { item: { id: 'dashboard2', attributes: { title: 'Dashboard 2' } } },
          });

        // @ts-ignore next-line
        const result = await client.getLinkedDashboards();

        expect(result).toEqual([
          { id: 'dashboard1', title: 'Dashboard 1', matchedBy: { linked: true } },
          { id: 'dashboard2', title: 'Dashboard 2', matchedBy: { linked: true } },
        ]);
      });

      it('should handle linked dashboards not found gracefully', async () => {
        const mockAlert = {
          getRuleId: jest.fn().mockReturnValue('rule-id'),
        } as unknown as AlertData;

        // @ts-ignore next-line
        client.setAlert(mockAlert);

        alertsClient.getRuleById = jest.fn().mockResolvedValue({
          artifacts: {
            dashboards: [{ id: 'dashboard1' }, { id: 'dashboard2' }],
          },
        });

        dashboardClient.get = jest
          .fn()
          .mockResolvedValueOnce({
            result: { item: { id: 'dashboard1', attributes: { title: 'Dashboard 1' } } },
          })
          .mockRejectedValueOnce(new Boom.Boom('Dashboard not found', { statusCode: 404 }));

        // @ts-ignore next-line
        const result = await client.getLinkedDashboards();

        expect(result).toEqual([
          { id: 'dashboard1', title: 'Dashboard 1', matchedBy: { linked: true } },
        ]);
        expect(logger.warn).toHaveBeenCalledWith(
          'Linked dashboard with id dashboard2 not found. Skipping.'
        );
      });
    });

    describe('getLinkedDashboardsByIds', () => {
      it('should return linked dashboards by IDs', async () => {
        dashboardClient.get = jest
          .fn()
          .mockResolvedValueOnce({
            result: { item: { id: 'dashboard1', attributes: { title: 'Dashboard 1' } } },
          })
          .mockResolvedValueOnce({
            result: { item: { id: 'dashboard2', attributes: { title: 'Dashboard 2' } } },
          });
        // @ts-ignore next-line
        const result = await client.getLinkedDashboardsByIds(['dashboard1', 'dashboard2']);

        expect(result).toEqual([
          { id: 'dashboard1', title: 'Dashboard 1', matchedBy: { linked: true } },
          { id: 'dashboard2', title: 'Dashboard 2', matchedBy: { linked: true } },
        ]);
        expect(dashboardClient.get).toHaveBeenCalledTimes(2);
        expect(dashboardClient.get).toHaveBeenCalledWith('dashboard1');
        expect(dashboardClient.get).toHaveBeenCalledWith('dashboard2');
      });

      it('should handle empty IDs array gracefully', async () => {
        dashboardClient.get = jest.fn();
        // @ts-ignore next-line
        const result = await client.getLinkedDashboardsByIds([]);

        expect(result).toEqual([]);
        expect(dashboardClient.get).not.toHaveBeenCalled();
      });

      it('should handle errors when fetching dashboards', async () => {
        dashboardClient.get = jest
          .fn()
          .mockRejectedValue(new Boom.Boom('Dashboard fetch failed', { statusCode: 500 }));

        // @ts-ignore next-line
        await expect(client.getLinkedDashboardsByIds(['dashboard1'])).rejects.toThrow(
          'Dashboard fetch failed'
        );
      });
    });
  });

  describe('deduplicateDashboards', () => {
    it('should deduplicate suggested and linked dashboards', async () => {
      const mockAlert = {
        ...baseMockAlert,
        getAllRelevantFields: jest.fn().mockReturnValue(['field1']),
        getRuleQueryIndex: jest.fn().mockReturnValue('index1'),
      } as unknown as AlertData;

      alertsClient.getAlertById.mockResolvedValue(mockAlert);
      // @ts-ignore next-line
      alertsClient.getRuleById.mockResolvedValue({
        artifacts: {
          dashboards: [{ id: 'dashboard2' }],
        },
      });

      dashboardClient.get = jest.fn().mockResolvedValueOnce({
        result: { item: { id: 'dashboard2', attributes: { title: 'Dashboard 2' } } },
      });

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
                        type: 'lens',
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
                    panelIndex: '123',
                    panelConfig: {
                      attributes: {
                        references: [{ name: 'indexpattern', id: 'index1' }],
                        state: {
                          datasourceStates: {
                            formBased: { layers: [{ columns: [{ sourceField: 'field2' }] }] },
                          },
                        },
                        type: 'lens',
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

      const { suggestedDashboards, linkedDashboards } = await client.fetchRelatedDashboards();
      expect(linkedDashboards).toHaveLength(1);
      expect(linkedDashboards).toEqual([
        {
          id: 'dashboard2',
          title: 'Dashboard 2',
          matchedBy: { linked: true },
        },
      ]);

      expect(suggestedDashboards).toHaveLength(1);
      // should return only one dashboard even though it was found by both internal methods
      // should mark the relevant panel as matching by index and field
      expect(suggestedDashboards).toEqual([
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
                    type: 'lens',
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
});
