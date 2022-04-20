/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { makeChecksWithStatus } from './helper/make_checks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const client = getService('es');
  const testDataStreamName = 'synthetics-http-default';

  describe('telemetry collectors fleet', () => {
    const createDataStream = async (name: string) => {
      // A data stream requires an index template before it can be created.
      await client.indices.putIndexTemplate({
        name,
        body: {
          // We need to match the names of backing indices with this template.
          index_patterns: [name + '*'],
          template: {
            mappings: {
              properties: {
                '@timestamp': {
                  type: 'date',
                },
              },
            },
          },
          data_stream: {},
        },
      });

      await client.indices.createDataStream({ name });
    };

    const deleteComposableIndexTemplate = async (name: string) => {
      await client.indices.deleteIndexTemplate({ name });
    };

    const deleteDataStream = async (name: string) => {
      await client.indices.deleteDataStream({ name });
      await deleteComposableIndexTemplate(name);
    };

    before('generating data', async () => {
      await createDataStream(testDataStreamName);

      const observer = {
        geo: {
          name: 'US-East',
          location: '40.7128, -74.0060',
        },
      };

      const observer2 = {
        geo: {
          name: 'US',
          location: '40.7128, -74.0060',
        },
      };

      await makeChecksWithStatus(
        client,
        'upMonitorId',
        1,
        1,
        60 * 1000,
        {
          observer: {},
          monitor: {
            name: 'Elastic',
            fleet_managed: true,
          },
        },
        'up',
        undefined,
        undefined,
        testDataStreamName
      );

      await makeChecksWithStatus(
        client,
        'downMonitorId',
        1,
        1,
        120 * 1000,
        {
          observer,
          monitor: {
            name: 'Long Name with 22 Char',
            fleet_managed: true,
          },
        },
        'down',
        undefined,
        undefined,
        testDataStreamName
      );

      await makeChecksWithStatus(
        client,
        'noGeoNameMonitor',
        1,
        1,
        60 * 1000,
        {
          observer: {},
          monitor: {
            fleet_managed: true,
          },
        },
        'down',
        undefined,
        undefined,
        testDataStreamName
      );

      await makeChecksWithStatus(
        client,
        'downMonitorId',
        1,
        1,
        1,
        {
          observer,
          monitor: {
            name: 'Elastic',
            fleet_managed: true,
          },
        },
        'down',
        undefined,
        undefined,
        testDataStreamName
      );

      await makeChecksWithStatus(
        client,
        'mixMonitorId',
        1,
        1,
        1,
        { observer: observer2, monitor: { fleet_managed: true } },
        'down',
        undefined,
        undefined,
        testDataStreamName
      );
      await client.indices.refresh();
    });

    after('unload heartbeat index', async () => {
      await deleteDataStream(testDataStreamName);
    });

    beforeEach(async () => {
      await client.indices.refresh();
    });

    it('should receive expected results for fleet managed monitors after calling monitor logging', async () => {
      // call monitor page
      const { body: result } = await supertest
        .post(API_URLS.LOG_PAGE_VIEW)
        .set('kbn-xsrf', 'true')
        .send({
          page: 'Monitor',
          autorefreshInterval: 100,
          dateStart: 'now/d',
          dateEnd: 'now/d',
          autoRefreshEnabled: true,
          refreshTelemetryHistory: true,
          refreshEsData: true,
        })
        .expect(200);

      expect(result).to.eql({
        overview_page: 0,
        monitor_page: 1,
        no_of_unique_monitors: 4,
        settings_page: 0,
        monitor_frequency: [0.001, 0.001, 60, 60],
        monitor_name_stats: { min_length: 7, max_length: 22, avg_length: 12 },
        no_of_unique_observer_locations: 3,
        observer_location_name_stats: { min_length: 2, max_length: 7, avg_length: 4.8 },
        dateRangeStart: ['now/d'],
        dateRangeEnd: ['now/d'],
        autoRefreshEnabled: true,
        autorefreshInterval: [100],
        fleet_monitor_frequency: [0.001, 0.001, 60, 60],
        fleet_monitor_name_stats: { min_length: 7, max_length: 22, avg_length: 12 },
        fleet_no_of_unique_monitors: 4,
      });
    });

    it('should receive 200 status after overview logging', async () => {
      // call overview page
      await supertest
        .post(API_URLS.LOG_PAGE_VIEW)
        .set('kbn-xsrf', 'true')
        .send({
          page: 'Overview',
          autorefreshInterval: 60,
          dateStart: 'now/d',
          dateEnd: 'now-30',
          autoRefreshEnabled: true,
        })
        .expect(200);
    });
  });
}
