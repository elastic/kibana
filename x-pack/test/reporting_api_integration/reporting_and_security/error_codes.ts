/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ReportApiJSON } from '@kbn/reporting-plugin/common/types';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');

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

    it('adds warning text with cause of failure in report output', async () => {
      await reportingAPI.createDataAnalystRole();
      await reportingAPI.createDataAnalyst();
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/archived_reports');

      const jobInfo = await supertest
        .get('/api/reporting/jobs/info/kraz4j94154g0763b583rc37')
        .auth('test_user', 'changeme');

      expect(jobInfo.body.output.warnings).to.eql([
        'Error: Max attempts reached (1). Queue timeout reached.',
      ]);

      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/archived_reports');
    });
  });
}
