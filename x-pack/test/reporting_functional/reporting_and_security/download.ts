/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'reporting', 'dashboard']);
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  describe('Download report', () => {
    // use archived reports to allow reporting_user to view report jobs they've created
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/archived_reports');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/archived_reports');
    });

    it('user can access download link', async () => {
      const reportId = 'krazcyw4156m0763b503j7f9';

      await PageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing');

      const reportInfoLink = await testSubjects.find(`viewReportingLink-${reportId}`);
      expect(await reportInfoLink.getVisibleText()).to.be('report jobtype: csv_searchsource'); // report title indicates the jobtype

      // can download the report
      await testSubjects.existOrFail(`reportDownloadLink-${reportId}`);
    });

    it('user can access download link for export type that is no longer supported', async () => {
      const reportId = 'krb7arhe164k0763b50bjm29';

      await PageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing');

      const reportInfoLink = await testSubjects.find(`viewReportingLink-${reportId}`);
      expect(await reportInfoLink.getVisibleText()).to.be('report jobtype: csv'); // report title indicates the **removed** jobtype

      // can download the report
      await testSubjects.existOrFail(`reportDownloadLink-${reportId}`);
    });
  });
};
