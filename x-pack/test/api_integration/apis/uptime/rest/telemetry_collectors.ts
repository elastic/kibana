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
  const es = getService('es');

  describe('telemetry collectors heartbeat', () => {
    before('generating data', async () => {
      await getService('esArchiver').load('x-pack/test/functional/es_archives/uptime/blank');

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
        es,
        'upMonitorId',
        1,
        1,
        60 * 1000,
        {
          observer: {},
          monitor: {
            name: 'Elastic',
          },
        },
        'up'
      );

      await makeChecksWithStatus(
        es,
        'downMonitorId',
        1,
        1,
        120 * 1000,
        {
          observer,
          monitor: {
            name: 'Long Name with 22 Char',
          },
        },
        'down'
      );

      await makeChecksWithStatus(es, 'noGeoNameMonitor', 1, 1, 60 * 1000, { observer: {} }, 'down');
      await makeChecksWithStatus(
        es,
        'downMonitorId',
        1,
        1,
        10 * 1000,
        {
          observer,
          monitor: {
            name: 'Elastic',
          },
        },
        'down'
      );

      await makeChecksWithStatus(
        es,
        'mixMonitorId',
        1,
        1,
        30 * 1000,
        { observer: observer2 },
        'down'
      );
      await es.indices.refresh();
    });

    after('unload heartbeat index', () => {
      getService('esArchiver').unload('x-pack/test/functional/es_archives/uptime/blank');
    });

    beforeEach(async () => {
      await es.indices.refresh();
    });

    it('should receive expected results after calling monitor logging', async () => {
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
        monitor_frequency: [10, 30, 60, 60],
        monitor_name_stats: { min_length: 7, max_length: 22, avg_length: 12 },
        no_of_unique_observer_locations: 3,
        observer_location_name_stats: { min_length: 2, max_length: 7, avg_length: 4.8 },
        dateRangeStart: ['now/d'],
        dateRangeEnd: ['now/d'],
        autoRefreshEnabled: true,
        autorefreshInterval: [100],
        fleet_monitor_frequency: [],
        fleet_monitor_name_stats: {
          avg_length: 0,
          max_length: 0,
          min_length: 0,
        },
        fleet_no_of_unique_monitors: 0,
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
