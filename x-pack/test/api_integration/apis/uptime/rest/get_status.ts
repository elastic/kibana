/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SimpleSavedObject } from '@kbn/core/public';
import { MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS, SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { deleteMonitor, saveMonitor } from './common';

export default function ({ getService }: FtrProviderContext) {
  describe('[GET] /internal/synthetics/overview/status', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');

    let _monitors: MonitorFields[];
    let monitors: MonitorFields[];

    before(async () => {
      await supertest.post(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true').expect(200);
      const { body } = await supertest
        .get(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .expect(200);
      await Promise.all([
        (body.monitors as Array<SimpleSavedObject<MonitorFields>>).map((monitor) => {
          return deleteMonitor(supertest, monitor.id, API_URLS.SYNTHETICS_MONITORS);
        }),
      ]);

      _monitors = [getFixtureJson('http_monitor')];
    });

    beforeEach(() => {
      monitors = [];
      for (let i = 0; i < 20; i++) {
        monitors.push({
          ..._monitors[0],
          name: `${_monitors[0].name}${i}`,
        });
      }
    });

    it('fetches the proper counts for managed monitors', async () => {
      let savedMonitors: SimpleSavedObject[] = [];
      try {
        const savedResponse = await Promise.all(
          monitors.map((monitor) => saveMonitor(supertest, monitor, API_URLS.SYNTHETICS_MONITORS))
        );
        savedMonitors = savedResponse;

        const apiResponse = await supertest.get(SYNTHETICS_API_URLS.OVERVIEW_STATUS);

        expect(apiResponse.body).to.eql({ not: 'athing' });
        // expect(apiResponse.body.total).eql(monitors.length * 2);
        // expect(apiResponse.body.allMonitorIds.sort()).eql(
        //   savedMonitors.map((monitor) => monitor.id).sort()
        // );
        // expect(apiResponse.body.pages).to.have.keys(['0', '1']);
        // expect(apiResponse.body.pages[1].length).eql(20);
      } finally {
        await Promise.all(
          savedMonitors.map((monitor) => {
            return deleteMonitor(supertest, monitor.id, API_URLS.SYNTHETICS_MONITORS);
          })
        );
      }
    });
  });
}
