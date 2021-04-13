/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { stringify } from 'query-string';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('monitor states pagination', () => {
    const from = '2019-09-11T03:30:04.380Z';
    const to = '2019-09-11T03:40:34.410Z';

    it('will fetch next page info for a first page result', async () => {
      const statusFilter = 'up';

      const firstMonitorId = '0000-intermittent';
      const afterMonitorId = '0000-intermittent';
      const queryParams = {
        statusFilter,
        dateRangeStart: from,
        dateRangeEnd: to,
        beforeMonitorId: firstMonitorId,
        afterMonitorId,
      };
      const result = await supertest.get(
        `${API_URLS.MONITOR_LIST_PAGINATION}?${stringify(queryParams)}`
      );

      expectSnapshot(result.body).toMatch();
      expect(result.status).to.eql(200);
      expect(result.body.result.aggregations.before.buckets).to.have.length(0);
      expect(result.body.result.aggregations.after.buckets).to.have.length(1);
    });

    it('will fetch no pagination info for a single page', async () => {
      const statusFilter = 'down';

      const firstMonitorId = '0000-intermittent';
      const afterMonitorId = '0090-intermittent';

      const queryParams = {
        statusFilter,
        afterMonitorId,
        dateRangeStart: from,
        dateRangeEnd: to,
        beforeMonitorId: firstMonitorId,
      };

      const result = await supertest.get(
        `${API_URLS.MONITOR_LIST_PAGINATION}?${stringify(queryParams)}`
      );

      expectSnapshot(result.body).toMatch();
      expect(result.status).to.eql(200);
      expect(result.body.result.aggregations.before.buckets).to.have.length(0);
      expect(result.body.result.aggregations.after.buckets).to.have.length(0);
    });
  });
}
