/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ReportApiJSON } from '../../../plugins/reporting/common/types';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');

  describe('Reporting error codes', () => {
    it('places error_code in report output', async () => {
      await reportingAPI.initEcommerce();

      const { body: reportApiJson, status } = await reportingAPI.generateCsv({
        title: 'CSV Report',
        browserTimezone: 'UTC',
        objectType: 'search',
        version: '7.15.0',
        searchSource: null, // Invalid searchSource that should cause job to throw at execute phase...
      } as any);
      expect(status).to.be(200);

      const { job: report, path: downloadPath } = reportApiJson as {
        job: ReportApiJSON;
        path: string;
      };

      // wait for the the pending job to complete
      await reportingAPI.waitForJobToFinish(downloadPath, true);

      expect(await reportingAPI.getJobErrorCode(report.id)).to.be('unknown_error');

      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
    });
  });
}
