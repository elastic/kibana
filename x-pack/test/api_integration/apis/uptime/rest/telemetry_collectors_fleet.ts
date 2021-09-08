/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';
import { makeChecksWithStatus } from './helper/make_checks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const client = getService('es');

  // FAILING ES PROMOTION: https://github.com/elastic/kibana/issues/111240
  describe.skip('telemetry collectors fleet', () => {
    before('generating data', async () => {
      await getService('esArchiver').load(
        'x-pack/test/functional/es_archives/uptime/blank_data_stream'
      );

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
        true
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
        true
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
        true
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
        true
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
        true
      );
      await client.indices.refresh();
    });

    after('unload heartbeat index', () => {
      getService('esArchiver').unload(
        'x-pack/test/functional/es_archives/uptime/blank_data_stream'
      );
      /**
       * Data streams aren't included in the javascript elasticsearch client in kibana yet so we
       * need to do raw requests here. Delete a data stream is slightly different than that of a regular index which
       * is why we're using _data_stream here.
       */
      client.transport.request({
        method: 'DELETE',
        path: `_data_stream/synthetics-http-default`,
      });
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
        })
        .expect(200);

      expect(result).to.eql({
        overview_page: 0,
        monitor_page: 1,
        no_of_unique_monitors: 4,
        settings_page: 0,
        monitor_frequency: [120, 0.001, 60, 60],
        monitor_name_stats: { min_length: 7, max_length: 22, avg_length: 12 },
        no_of_unique_observer_locations: 3,
        observer_location_name_stats: { min_length: 2, max_length: 7, avg_length: 4.8 },
        dateRangeStart: ['now/d'],
        dateRangeEnd: ['now/d'],
        autoRefreshEnabled: true,
        autorefreshInterval: [100],
        fleet_monitor_frequency: [120, 0.001, 60, 60],
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
