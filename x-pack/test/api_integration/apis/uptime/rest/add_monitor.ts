/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('add synthetics monitor', () => {
    this.tags(['uptime', 'synthetics-service']);

    const supertest = getService('supertest');

    let _httpMonitorJson;
    let httpMonitorJson;

    before(() => {
      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = _httpMonitorJson;
    });

    it('returns the newly added monitor', async () => {
      const newMonitor = httpMonitorJson;

      const apiResponse = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.body.attributes).eql(newMonitor);
    });

    it('returns bad request if payload is invalid for HTTP monitor', async () => {
      const newMonitor = { ...httpMonitorJson, 'check.request.headers': undefined };

      const apiResponse = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.status).eql(400);
    });
  });
}
