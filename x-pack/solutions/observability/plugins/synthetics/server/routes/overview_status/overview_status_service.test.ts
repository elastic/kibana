/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import type { EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { getUptimeESMockClient } from '../../queries/test_helpers';

import * as allLocationsFn from '../../synthetics_service/get_all_locations';
import { OverviewStatusService, SUMMARIES_PAGE_SIZE } from './overview_status_service';
import times from 'lodash/times';
import { flatten } from 'lodash';
const japanLoc = {
  id: 'asia_japan',
  label: 'Asia/Pacific - Japan',
};

const germanyLoc = {
  id: 'europe_germany',
  label: 'Europe - Germany',
};

const allLocations: any = [japanLoc, germanyLoc];
jest.spyOn(allLocationsFn, 'getAllLocations').mockResolvedValue({
  publicLocations: allLocations,
  privateLocations: [],
  allLocations,
});

describe('current status route', () => {
  const testMonitors = [
    {
      attributes: {
        config_id: 'id1',
        id: 'id1',
        type: 'browser',
        enabled: true,
        name: 'test monitor 1',
        project_id: 'project-id',
        tags: ['tag-1', 'tag-2'],
        schedule: {
          number: '1',
          unit: 'm',
        },
        locations: [japanLoc],
      },
    },
    {
      attributes: {
        id: 'id2',
        config_id: 'id2',
        enabled: true,
        type: 'browser',
        name: 'test monitor 2',
        project_id: 'project-id',
        tags: ['tag-1', 'tag-2'],
        schedule: {
          number: '1',
          unit: 'm',
        },
        locations: allLocations,
      },
    },
  ];

  describe('OverviewStatusService', () => {
    it('parses expected agg fields', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();

      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [
            {
              key: {
                monitorId: 'id1',
                locationId: japanLoc.id,
              },
              status: {
                key: japanLoc.id,
                top: [
                  {
                    metrics: {
                      'monitor.status': 'up',
                    },
                    sort: ['2022-09-15T16:19:16.724Z'],
                  },
                ],
              },
            },
            {
              key: {
                monitorId: 'id2',
                locationId: japanLoc.id,
              },
              status: {
                key: japanLoc.id,
                top: [
                  {
                    metrics: {
                      'monitor.status': 'up',
                    },
                    sort: ['2022-09-15T16:19:16.724Z'],
                  },
                ],
              },
            },
            {
              key: {
                monitorId: 'id2',
                locationId: germanyLoc.id,
              },
              status: {
                key: germanyLoc.id,
                top: [
                  {
                    metrics: {
                      'monitor.status': 'down',
                    },
                    sort: ['2022-09-15T16:19:16.724Z'],
                  },
                ],
              },
            },
          ],
        })
      );
      const routeContext: any = {
        request: { query: {} },
        syntheticsEsClient,
      };

      const overviewStatusService = new OverviewStatusService(routeContext);
      overviewStatusService.getMonitorConfigs = jest.fn().mockResolvedValue(testMonitors as any);
      expect(await overviewStatusService.getOverviewStatus()).toMatchInlineSnapshot(`
        Object {
          "allIds": Array [
            "id1",
            "id2",
          ],
          "allMonitorsCount": 2,
          "disabledConfigs": Object {},
          "disabledCount": 0,
          "disabledMonitorQueryIds": Array [],
          "disabledMonitorsCount": 0,
          "down": 1,
          "downConfigs": Object {},
          "enabledMonitorQueryIds": Array [
            "id1",
            "id2",
          ],
          "pending": 0,
          "pendingConfigs": Object {},
          "projectMonitorsCount": 0,
          "up": 2,
          "upConfigs": Object {
            "id1": Object {
              "configId": "id1",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locations": Array [
                Object {
                  "id": "asia_japan",
                  "label": "Asia/Pacific - Japan",
                  "status": "up",
                },
              ],
              "maintenanceWindows": undefined,
              "monitorQueryId": "id1",
              "name": "test monitor 1",
              "overallStatus": "up",
              "projectId": "project-id",
              "schedule": "1",
              "spaces": undefined,
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:19:16.724Z",
              "type": "browser",
              "updated_at": undefined,
              "urls": undefined,
            },
            "id2": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locations": Array [
                Object {
                  "id": "asia_japan",
                  "label": "Asia/Pacific - Japan",
                  "status": "up",
                },
                Object {
                  "id": "europe_germany",
                  "label": "Europe - Germany",
                  "status": "down",
                },
              ],
              "maintenanceWindows": undefined,
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "overallStatus": "down",
              "projectId": "project-id",
              "schedule": "1",
              "spaces": undefined,
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:19:16.724Z",
              "type": "browser",
              "updated_at": undefined,
              "urls": undefined,
            },
          },
        }
      `);
    });

    it('handles limits with multiple requests', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          after: {},
          buckets: flatten(
            times(SUMMARIES_PAGE_SIZE).map(() => [
              {
                key: {
                  monitorId: 'id1',
                  locationId: japanLoc.id,
                },
                status: {
                  key: japanLoc.id,
                  top: [
                    {
                      metrics: {
                        'monitor.status': 'up',
                      },
                      sort: ['2022-09-15T16:19:16.724Z'],
                    },
                  ],
                },
              },
              {
                key: {
                  monitorId: 'id2',
                  locationId: japanLoc.id,
                },
                status: {
                  key: japanLoc.id,
                  top: [
                    {
                      metrics: {
                        'monitor.status': 'up',
                      },
                      sort: ['2022-09-15T16:19:16.724Z'],
                    },
                  ],
                },
              },
              {
                key: {
                  monitorId: 'id2',
                  locationId: germanyLoc.id,
                },
                status: {
                  key: germanyLoc.id,
                  top: [
                    {
                      metrics: {
                        'monitor.status': 'down',
                      },
                      sort: ['2022-09-15T16:19:16.724Z'],
                    },
                  ],
                },
              },
            ])
          ),
        })
      );

      const routeContext: any = {
        request: { query: {} },
        syntheticsEsClient,
      };

      const overviewStatusService = new OverviewStatusService(routeContext);
      overviewStatusService.getMonitorConfigs = jest.fn().mockResolvedValue(testMonitors as any);

      expect(await overviewStatusService.getOverviewStatus()).toMatchInlineSnapshot(`
        Object {
          "allIds": Array [
            "id1",
            "id2",
          ],
          "allMonitorsCount": 2,
          "disabledConfigs": Object {},
          "disabledCount": 0,
          "disabledMonitorQueryIds": Array [],
          "disabledMonitorsCount": 0,
          "down": 1,
          "downConfigs": Object {},
          "enabledMonitorQueryIds": Array [
            "id1",
            "id2",
          ],
          "pending": 0,
          "pendingConfigs": Object {},
          "projectMonitorsCount": 0,
          "up": 2,
          "upConfigs": Object {
            "id1": Object {
              "configId": "id1",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locations": Array [
                Object {
                  "id": "asia_japan",
                  "label": "Asia/Pacific - Japan",
                  "status": "up",
                },
              ],
              "maintenanceWindows": undefined,
              "monitorQueryId": "id1",
              "name": "test monitor 1",
              "overallStatus": "up",
              "projectId": "project-id",
              "schedule": "1",
              "spaces": undefined,
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:19:16.724Z",
              "type": "browser",
              "updated_at": undefined,
              "urls": undefined,
            },
            "id2": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locations": Array [
                Object {
                  "id": "asia_japan",
                  "label": "Asia/Pacific - Japan",
                  "status": "up",
                },
                Object {
                  "id": "europe_germany",
                  "label": "Europe - Germany",
                  "status": "down",
                },
              ],
              "maintenanceWindows": undefined,
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "overallStatus": "down",
              "projectId": "project-id",
              "schedule": "1",
              "spaces": undefined,
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:19:16.724Z",
              "type": "browser",
              "updated_at": undefined,
              "urls": undefined,
            },
          },
        }
      `);
      expect(esClient.search).toHaveBeenCalledTimes(2);
    });

    it('handles pending configs', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [],
        })
      );
      const routeContext: any = {
        request: { query: {} },
        syntheticsEsClient,
      };

      const overviewStatusService = new OverviewStatusService(routeContext);
      overviewStatusService.getMonitorConfigs = jest.fn().mockResolvedValue(testMonitors as any);
      expect(await overviewStatusService.getOverviewStatus()).toMatchInlineSnapshot(`
        Object {
          "allIds": Array [
            "id1",
            "id2",
          ],
          "allMonitorsCount": 2,
          "disabledConfigs": Object {},
          "disabledCount": 0,
          "disabledMonitorQueryIds": Array [],
          "disabledMonitorsCount": 0,
          "down": 0,
          "downConfigs": Object {},
          "enabledMonitorQueryIds": Array [
            "id1",
            "id2",
          ],
          "pending": 2,
          "pendingConfigs": Object {
            "id1": Object {
              "configId": "id1",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locations": Array [
                Object {
                  "id": "asia_japan",
                  "label": "Asia/Pacific - Japan",
                  "status": "pending",
                },
              ],
              "maintenanceWindows": undefined,
              "monitorQueryId": "id1",
              "name": "test monitor 1",
              "overallStatus": "pending",
              "projectId": "project-id",
              "schedule": "1",
              "spaces": undefined,
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": undefined,
              "type": "browser",
              "updated_at": undefined,
              "urls": undefined,
            },
            "id2": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locations": Array [
                Object {
                  "id": "asia_japan",
                  "label": "Asia/Pacific - Japan",
                  "status": "pending",
                },
                Object {
                  "id": "europe_germany",
                  "label": "Europe - Germany",
                  "status": "pending",
                },
              ],
              "maintenanceWindows": undefined,
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "overallStatus": "pending",
              "projectId": "project-id",
              "schedule": "1",
              "spaces": undefined,
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": undefined,
              "type": "browser",
              "updated_at": undefined,
              "urls": undefined,
            },
          },
          "projectMonitorsCount": 0,
          "up": 0,
          "upConfigs": Object {},
        }
      `);
    });
  });

  describe('processOverviewStatus grouping logic', () => {
    const usLoc = { id: 'us_east', label: 'US East' };
    const euLoc = { id: 'eu_west', label: 'EU West' };
    const apLoc = { id: 'ap_south', label: 'AP South' };

    const makeMonitor = (id: string, locations: any[], enabled = true) => ({
      attributes: {
        config_id: id,
        id,
        type: 'http',
        enabled,
        name: `monitor-${id}`,
        project_id: 'test-project',
        tags: [],
        schedule: { number: '3', unit: 'm' },
        locations,
      },
    });

    it('groups multiple locations under a single configId entry', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [
            {
              key: { monitorId: 'mon1', locationId: usLoc.id },
              status: {
                top: [{ metrics: { 'monitor.status': 'up' }, sort: ['2025-05-28T10:00:00.000Z'] }],
              },
            },
            {
              key: { monitorId: 'mon1', locationId: euLoc.id },
              status: {
                top: [{ metrics: { 'monitor.status': 'up' }, sort: ['2025-05-28T10:01:00.000Z'] }],
              },
            },
          ],
        })
      );

      const routeContext: any = { request: { query: {} }, syntheticsEsClient };
      const service = new OverviewStatusService(routeContext);
      service.getMonitorConfigs = jest
        .fn()
        .mockResolvedValue([makeMonitor('mon1', [usLoc, euLoc])]);

      const result = await service.getOverviewStatus();

      expect(result.upConfigs.mon1).toBeDefined();
      expect(result.upConfigs.mon1.locations).toHaveLength(2);
      expect(result.upConfigs.mon1.locations[0].id).toBe(usLoc.id);
      expect(result.upConfigs.mon1.locations[1].id).toBe(euLoc.id);
      expect(result.upConfigs.mon1.overallStatus).toBe('up');
    });

    it('sets overallStatus to down when any location is down', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [
            {
              key: { monitorId: 'mon1', locationId: usLoc.id },
              status: {
                top: [{ metrics: { 'monitor.status': 'up' }, sort: ['2025-05-28T10:00:00.000Z'] }],
              },
            },
            {
              key: { monitorId: 'mon1', locationId: euLoc.id },
              status: {
                top: [
                  { metrics: { 'monitor.status': 'down' }, sort: ['2025-05-28T10:01:00.000Z'] },
                ],
              },
            },
          ],
        })
      );

      const routeContext: any = { request: { query: {} }, syntheticsEsClient };
      const service = new OverviewStatusService(routeContext);
      service.getMonitorConfigs = jest
        .fn()
        .mockResolvedValue([makeMonitor('mon1', [usLoc, euLoc])]);

      const result = await service.getOverviewStatus();

      const mon = result.upConfigs.mon1 || result.downConfigs.mon1;
      expect(mon).toBeDefined();
      expect(mon.overallStatus).toBe('down');
      expect(mon.locations).toHaveLength(2);
      expect(mon.locations.find((l: any) => l.id === usLoc.id)?.status).toBe('up');
      expect(mon.locations.find((l: any) => l.id === euLoc.id)?.status).toBe('down');
    });

    it('moves pending config with a down location to downConfigs', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [
            {
              key: { monitorId: 'mon1', locationId: usLoc.id },
              status: {
                top: [
                  { metrics: { 'monitor.status': 'down' }, sort: ['2025-05-28T10:00:00.000Z'] },
                ],
              },
            },
          ],
        })
      );

      const routeContext: any = { request: { query: {} }, syntheticsEsClient };
      const service = new OverviewStatusService(routeContext);
      service.getMonitorConfigs = jest
        .fn()
        .mockResolvedValue([makeMonitor('mon1', [usLoc, euLoc, apLoc])]);

      const result = await service.getOverviewStatus();

      expect(result.downConfigs.mon1).toBeDefined();
      expect(result.pendingConfigs.mon1).toBeUndefined();
      expect(result.downConfigs.mon1.locations).toHaveLength(3);
      const pendingLocs = result.downConfigs.mon1.locations.filter(
        (l: any) => l.status === 'pending'
      );
      const downLocs = result.downConfigs.mon1.locations.filter((l: any) => l.status === 'down');
      expect(downLocs).toHaveLength(1);
      expect(pendingLocs).toHaveLength(2);
      // pending locations should be sorted to end
      expect(result.downConfigs.mon1.locations[0].status).toBe('down');
    });

    it('moves pending config with an up location to upConfigs', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [
            {
              key: { monitorId: 'mon1', locationId: usLoc.id },
              status: {
                top: [{ metrics: { 'monitor.status': 'up' }, sort: ['2025-05-28T10:00:00.000Z'] }],
              },
            },
          ],
        })
      );

      const routeContext: any = { request: { query: {} }, syntheticsEsClient };
      const service = new OverviewStatusService(routeContext);
      service.getMonitorConfigs = jest
        .fn()
        .mockResolvedValue([makeMonitor('mon1', [usLoc, euLoc])]);

      const result = await service.getOverviewStatus();

      expect(result.upConfigs.mon1).toBeDefined();
      expect(result.pendingConfigs.mon1).toBeUndefined();
      expect(result.upConfigs.mon1.overallStatus).toBe('up');
      expect(result.upConfigs.mon1.locations).toHaveLength(2);
      // pending locations sorted to end
      expect(result.upConfigs.mon1.locations[0].status).toBe('up');
      expect(result.upConfigs.mon1.locations[1].status).toBe('pending');
    });

    it('groups disabled monitor locations under a single configId', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(getEsResponse({ buckets: [] }));

      const routeContext: any = { request: { query: {} }, syntheticsEsClient };
      const service = new OverviewStatusService(routeContext);
      service.getMonitorConfigs = jest
        .fn()
        .mockResolvedValue([makeMonitor('mon1', [usLoc, euLoc, apLoc], false)]);

      const result = await service.getOverviewStatus();

      expect(result.disabledConfigs.mon1).toBeDefined();
      expect(result.disabledConfigs.mon1.locations).toHaveLength(3);
      expect(result.disabledConfigs.mon1.overallStatus).toBe('disabled');
      result.disabledConfigs.mon1.locations.forEach((loc: any) => {
        expect(loc.status).toBe('disabled');
      });
    });

    it('uses latest timestamp across locations', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [
            {
              key: { monitorId: 'mon1', locationId: usLoc.id },
              status: {
                top: [{ metrics: { 'monitor.status': 'up' }, sort: ['2025-05-28T09:00:00.000Z'] }],
              },
            },
            {
              key: { monitorId: 'mon1', locationId: euLoc.id },
              status: {
                top: [{ metrics: { 'monitor.status': 'up' }, sort: ['2025-05-28T11:00:00.000Z'] }],
              },
            },
          ],
        })
      );

      const routeContext: any = { request: { query: {} }, syntheticsEsClient };
      const service = new OverviewStatusService(routeContext);
      service.getMonitorConfigs = jest
        .fn()
        .mockResolvedValue([makeMonitor('mon1', [usLoc, euLoc])]);

      const result = await service.getOverviewStatus();

      expect(result.upConfigs.mon1.timestamp).toBe('2025-05-28T11:00:00.000Z');
    });

    it('handles three locations: up, down, pending correctly', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [
            {
              key: { monitorId: 'mon1', locationId: usLoc.id },
              status: {
                top: [{ metrics: { 'monitor.status': 'up' }, sort: ['2025-05-28T10:00:00.000Z'] }],
              },
            },
            {
              key: { monitorId: 'mon1', locationId: euLoc.id },
              status: {
                top: [
                  { metrics: { 'monitor.status': 'down' }, sort: ['2025-05-28T10:01:00.000Z'] },
                ],
              },
            },
            // apLoc has no status data -> pending
          ],
        })
      );

      const routeContext: any = { request: { query: {} }, syntheticsEsClient };
      const service = new OverviewStatusService(routeContext);
      service.getMonitorConfigs = jest
        .fn()
        .mockResolvedValue([makeMonitor('mon1', [usLoc, euLoc, apLoc])]);

      const result = await service.getOverviewStatus();

      // down takes precedence since it was promoted from pending -> down
      const mon = result.downConfigs.mon1 || result.upConfigs.mon1;
      expect(mon).toBeDefined();
      expect(mon.overallStatus).toBe('down');
      expect(mon.locations).toHaveLength(3);
      expect(mon.locations.find((l: any) => l.id === usLoc.id)?.status).toBe('up');
      expect(mon.locations.find((l: any) => l.id === euLoc.id)?.status).toBe('down');
      expect(mon.locations.find((l: any) => l.id === apLoc.id)?.status).toBe('pending');
    });
  });

  describe('getStatus', () => {
    jest.spyOn(allLocationsFn, 'getAllLocations').mockResolvedValue({
      publicLocations: allLocations,
      privateLocations: [],
      allLocations: [
        {
          id: 'us_central_qa',
          label: 'US Central QA',
        },
        {
          id: 'us_central',
          label: 'North America - US Central',
        },
      ] as any,
    });

    it.each([
      [['US Central QA'], 1],
      [['North America - US Central'], 1],
      [['North America - US Central', 'US Central QA'], 2],
      [undefined, 2],
    ])('handles disabled count when using location filters', async (locations, disabledCount) => {
      const getAll = jest.fn().mockResolvedValue([
        {
          type: 'synthetics-monitor',
          id: 'a9a94f2f-47ba-4fe2-afaa-e5cd29b281f1',
          attributes: {
            enabled: false,
            schedule: {
              number: '3',
              unit: 'm',
            },
            config_id: 'a9a94f2f-47ba-4fe2-afaa-e5cd29b281f1',
            locations: [
              {
                isServiceManaged: true,
                label: 'US Central QA',
                id: 'us_central_qa',
              },
              {
                isServiceManaged: true,
                label: 'North America - US Central',
                id: 'us_central',
              },
            ],
            origin: 'project',
            id: 'a-test2-default',
          },
          references: [],
          migrationVersion: {
            'synthetics-monitor': '8.6.0',
          },
          coreMigrationVersion: '8.0.0',
          updated_at: '2023-02-28T14:31:37.641Z',
          created_at: '2023-02-28T14:31:37.641Z',
          version: 'Wzg0MzkzLDVd',
          namespaces: ['default'],
          score: null,
          sort: ['a', 3013],
        } as unknown as SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>,
      ]);
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.msearch.mockResponseOnce({
        responses: [
          getEsResponse({
            buckets: [
              {
                key: 'id1',
                location: {
                  buckets: [
                    {
                      key: 'Asia/Pacific - Japan',
                      status: {
                        hits: {
                          hits: [
                            {
                              _source: {
                                '@timestamp': '2022-09-15T16:08:16.724Z',
                                monitor: {
                                  status: 'up',
                                  id: 'id1',
                                },
                                summary: {
                                  up: 1,
                                  down: 0,
                                },
                                config_id: 'id1',
                                observer: {
                                  geo: {
                                    name: 'Asia/Pacific - Japan',
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
              {
                key: 'id2',
                location: {
                  buckets: [
                    {
                      key: 'Asia/Pacific - Japan',
                      status: {
                        hits: {
                          hits: [
                            {
                              _source: {
                                '@timestamp': '2022-09-15T16:09:16.724Z',
                                monitor: {
                                  status: 'up',
                                  id: 'id2',
                                },
                                summary: {
                                  up: 1,
                                  down: 0,
                                },
                                config_id: 'id2',
                                observer: {
                                  geo: {
                                    name: 'Asia/Pacific - Japan',
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                    {
                      key: 'Europe - Germany',
                      status: {
                        hits: {
                          hits: [
                            {
                              _source: {
                                '@timestamp': '2022-09-15T16:19:16.724Z',
                                monitor: {
                                  status: 'down',
                                  id: 'id2',
                                },
                                summary: {
                                  down: 1,
                                  up: 0,
                                },
                                config_id: 'id2',
                                observer: {
                                  geo: {
                                    name: 'Europe - Germany',
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            ],
          }),
        ],
        took: 605,
      });

      const overviewStatusService = new OverviewStatusService({
        request: {
          query: {
            locations,
          },
        },
        syntheticsEsClient,
        monitorConfigRepository: {
          getAll,
        },
      } as any);

      const result = await overviewStatusService.getOverviewStatus();

      expect(result).toEqual(
        expect.objectContaining({
          disabledCount,
        })
      );
    });

    it.each([
      [['US Central QA'], 1],
      [['North America - US Central'], 1],
      [['North America - US Central', 'US Central QA'], 1],
      [undefined, 1],
    ])('handles pending count when using location filters', async (locations, pending) => {
      const getAll = jest.fn().mockResolvedValue([
        {
          type: 'synthetics-monitor',
          id: 'a9a94f2f-47ba-4fe2-afaa-e5cd29b281f1',
          attributes: {
            enabled: true,
            schedule: {
              number: '3',
              unit: 'm',
            },
            config_id: 'a9a94f2f-47ba-4fe2-afaa-e5cd29b281f1',
            locations: [
              {
                isServiceManaged: true,
                label: 'US Central QA',
                id: 'us_central_qa',
              },
              {
                isServiceManaged: true,
                label: 'North America - US Central',
                id: 'us_central',
              },
            ],
            origin: 'project',
            id: 'a-test2-default',
          },
          references: [],
          migrationVersion: {
            'synthetics-monitor': '8.6.0',
          },
          coreMigrationVersion: '8.0.0',
          updated_at: '2023-02-28T14:31:37.641Z',
          created_at: '2023-02-28T14:31:37.641Z',
          version: 'Wzg0MzkzLDVd',
          namespaces: ['default'],
          score: null,
          sort: ['a', 3013],
        } as unknown as SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>,
      ]);
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse({
          buckets: [],
        })
      );

      const overviewStatusService = new OverviewStatusService({
        request: {
          query: {
            locations,
          },
        },
        syntheticsEsClient,
        monitorConfigRepository: {
          getAll,
        },
      } as any);

      const result = await overviewStatusService.getOverviewStatus();

      expect(result.pending).toEqual(pending);
    });
  });
});

function getEsResponse({ buckets, after }: { buckets: any[]; after?: any }) {
  return {
    took: 605,
    timed_out: false,
    _shards: {
      total: 3,
      successful: 3,
      skipped: 0,
      failed: 0,
    },
    hits: {
      hits: [],
    },
    aggregations: {
      monitors: {
        buckets,
        after_key: after,
      },
    },
  };
}
