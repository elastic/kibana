/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { HTTPFields, MonitorFields } from '@kbn/uptime-plugin/common/runtime_types';
import { API_URLS } from '@kbn/uptime-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('[DELETE] /internal/uptime/service/monitors', () => {
    const supertest = getService('supertest');

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitor);

      return res.body;
    };

    before(() => {
      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = _httpMonitorJson;
    });

    it('deletes monitor by id', async () => {
      const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);

      const deleteResponse = await supertest
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true');

      expect(deleteResponse.body).eql(monitorId);

      // Hit get endpoint and expect 404 as well
      await supertest.get(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId).expect(404);
    });

    it('returns 404 if monitor id is not found', async () => {
      const invalidMonitorId = 'invalid-id';
      const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

      const deleteResponse = await supertest
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + invalidMonitorId)
        .set('kbn-xsrf', 'true');

      expect(deleteResponse.status).eql(404);
      expect(deleteResponse.body.message).eql(expected404Message);
    });

    it('validates empty monitor id', async () => {
      const emptyMonitorId = '';

      // Route DELETE '/${SYNTHETICS_MONITORS}' should not exist
      await supertest
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + emptyMonitorId)
        .set('kbn-xsrf', 'true')
        .expect(404);
    });

    it('validates param length for sanity', async () => {
      const veryLargeMonId = new Array(1050).fill('1').join('');

      await supertest
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + veryLargeMonId)
        .set('kbn-xsrf', 'true')
        .expect(400);
    });
  });
}
