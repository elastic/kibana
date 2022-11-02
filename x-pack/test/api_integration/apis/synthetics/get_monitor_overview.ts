/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleSavedObject } from '@kbn/core/public';
import { MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS, API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '../../../../private/var/tmp/_bazel_shahzad-16/974662a0be78d7012b40ce12cff92960/execroot/kibana/bazel-out/darwin-fastbuild/bin/packages/kbn-expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('[GET] /internal/synthetics/overview', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');

    let _monitors: MonitorFields[];
    let monitors: MonitorFields[];

    const deleteMonitor = async (id: string) => {
      try {
        await supertest
          .delete(`${API_URLS.SYNTHETICS_MONITORS}/${id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitor);

      return res.body as SimpleSavedObject<MonitorFields>;
    };

    before(async () => {
      await supertest.post(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true').expect(200);
      const { body } = await supertest
        .get(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .expect(200);
      await Promise.all([
        (body.monitors as Array<SimpleSavedObject<MonitorFields>>).map((monitor) => {
          return deleteMonitor(monitor.id);
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

    describe('returns total number of monitor combinations', () => {
      it('returns the correct response', async () => {
        let savedMonitors: SimpleSavedObject[] = [];
        try {
          const savedResponse = await Promise.all(monitors.map(saveMonitor));
          savedMonitors = savedResponse;

          const apiResponse = await supertest.get(
            SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW + '?perPage=20'
          );

          expect(apiResponse.body.total).eql(monitors.length * 2);
          expect(apiResponse.body.allMonitorIds.sort()).eql(
            savedMonitors.map((monitor) => monitor.id).sort()
          );
          expect(apiResponse.body.pages).to.have.keys(['0', '1']);
          expect(apiResponse.body.pages[1].length).eql(20);
        } finally {
          await Promise.all(
            savedMonitors.map((monitor) => {
              return deleteMonitor(monitor.id);
            })
          );
        }
      });

      it('adjusts pagination correctly', async () => {
        let savedMonitors: SimpleSavedObject[] = [];
        try {
          const savedResponse = await Promise.all(monitors.map(saveMonitor));
          savedMonitors = savedResponse;

          const apiResponse = await supertest.get(
            SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW + '?perPage=5'
          );

          expect(apiResponse.body.total).eql(monitors.length * 2);
          expect(apiResponse.body.allMonitorIds.sort()).eql(
            savedMonitors.map((monitor) => monitor.id).sort()
          );
          expect(apiResponse.body.pages).to.have.keys(['0', '1', '2', '3', '4']);
          expect(apiResponse.body.pages[1].length).eql(5);
        } finally {
          await Promise.all(
            savedMonitors.map((monitor) => {
              return deleteMonitor(monitor.id);
            })
          );
        }
      });
    });
  });
}
