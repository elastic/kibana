/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');

  describe('Scheduled Reports', () => {
    before(async () => {
      await reportingAPI.initLogs();
    });

    after(async () => {
      await reportingAPI.teardownLogs();
    });

    afterEach(async () => {
      await reportingAPI.deleteAllReports();
    });

    it('should return error when scheduling reports', async () => {
      const res = await reportingAPI.schedulePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test PDF allowed',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'dashboard',
          version: '7.14.0',
        }
      );
      expect(res.status).to.eql(403);
      expect(res.body.message).to.eql(
        `Security and API keys must be enabled for scheduled reporting`
      );
    });
  });
}
