/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SimpleSavedObject } from 'kibana/public';
import { MonitorFields } from '../../../../../plugins/uptime/common/runtime_types';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('[GET] /internal/uptime/service/monitors', () => {
    const supertest = getService('supertest');

    let _monitors: MonitorFields[];
    let monitors: MonitorFields[];

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitor)
        .expect(200);

      return res.body as SimpleSavedObject<MonitorFields>;
    };

    before(async () => {
      await supertest.post(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true').expect(200);

      _monitors = [
        getFixtureJson('icmp_monitor'),
        getFixtureJson('tcp_monitor'),
        getFixtureJson('http_monitor'),
        getFixtureJson('browser_monitor'),
      ];
    });

    beforeEach(() => {
      monitors = _monitors;
    });

    describe('get many monitors', () => {
      it('without params', async () => {
        const [{ id: id1, attributes: mon1 }, { id: id2, attributes: mon2 }] = await Promise.all(
          monitors.map(saveMonitor)
        );

        const apiResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS + '?perPage=1000') // 1000 to sort of load all saved monitors
          .expect(200);

        const found: Array<SimpleSavedObject<MonitorFields>> = apiResponse.body.monitors.filter(
          ({ id }: SimpleSavedObject<MonitorFields>) => [id1, id2].includes(id)
        );
        found.sort(({ id: a }) => (a === id2 ? 1 : a === id1 ? -1 : 0));
        const foundMonitors = found.map(
          ({ attributes }: SimpleSavedObject<MonitorFields>) => attributes
        );

        const expected = [mon1, mon2];

        expect(foundMonitors).eql(expected);
      });

      it('with page params', async () => {
        await Promise.all([...monitors, ...monitors].map(saveMonitor));

        const firstPageResp = await supertest
          .get(`${API_URLS.SYNTHETICS_MONITORS}?page=1&perPage=2`)
          .expect(200);
        const secondPageResp = await supertest
          .get(`${API_URLS.SYNTHETICS_MONITORS}?page=2&perPage=3`)
          .expect(200);

        expect(firstPageResp.body.total).greaterThan(6);
        expect(firstPageResp.body.monitors.length).eql(2);
        expect(secondPageResp.body.monitors.length).eql(3);

        expect(firstPageResp.body.monitors[0].id).not.eql(secondPageResp.body.monitors[0].id);
      });
    });

    describe('get one monitor', () => {
      it('should get by id', async () => {
        const [{ id: id1, attributes: mon1 }] = await Promise.all(monitors.map(saveMonitor));

        const apiResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS + '/' + id1)
          .expect(200);

        expect(apiResponse.body.attributes).eql(mon1);
      });

      it('returns 404 if monitor id is not found', async () => {
        const invalidMonitorId = 'invalid-id';
        const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS + '/' + invalidMonitorId)
          .set('kbn-xsrf', 'true');

        expect(getResponse.status).eql(404);
        expect(getResponse.body.message).eql(expected404Message);
      });

      it('validates param length for sanity', async () => {
        const veryLargeMonId = new Array(1050).fill('1').join('');

        await supertest
          .get(API_URLS.SYNTHETICS_MONITORS + '/' + veryLargeMonId)
          .set('kbn-xsrf', 'true')
          .expect(400);
      });
    });
  });
}
