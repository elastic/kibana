/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('monitor states histogram', () => {
    const from = '2019-09-11T03:30:04.380Z';
    const to = '2019-09-11T03:40:34.410Z';

    it('will fetch monitor state histogram data for the given filters and range', async () => {
      const statusFilter = 'up';
      const filters =
        '{"bool":{"must":[{"match":{"monitor.id":{"query":"0002-up","operator":"and"}}}]}}';
      const { body, status } = await supertest
        .post(
          `${API_URLS.MONITOR_LIST_HISTOGRAM}?dateRangeStart=${from}&dateRangeEnd=${to}&statusFilter=${statusFilter}&filters=${filters}`
        )
        .set('kbn-xsrf', 'true')
        .send({ monitorIds: ['0002-up'] });

      expect(status).to.eql(200);
      expectSnapshot(body).toMatch();
    });

    it('will fetch monitor state data for the given down filters', async () => {
      const statusFilter = 'down';
      const { body, status } = await supertest
        .post(
          `${API_URLS.MONITOR_LIST_HISTOGRAM}?dateRangeStart=${from}&dateRangeEnd=${to}&statusFilter=${statusFilter}`
        )
        .set('kbn-xsrf', 'true')
        .send({ monitorIds: ['0010-down', '0002-up', '0020-down'] });

      expect(status).to.eql(200);
      expectSnapshot(body).toMatch();
    });
  });
}
