/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import { CSV_REPORT_TYPE_V2 } from '@kbn/reporting-plugin/common/constants';
import type { JobParamsCsvFromSavedObject } from '@kbn/reporting-plugin/common/types';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);
  const reportingAPI = getService('svlReportingAPI');
  const security = getService('security');

  const navigateToReportingManagement = async () => {
    log.debug(`navigating to reporting management app`);
    await retry.tryForTime(60 * 1000, async () => {
      await PageObjects.common.navigateToApp('management/insightsAndAlerting/reporting');
      await testSubjects.existOrFail('reportingPageHeader', { timeout: 2000 });
    });
  };

  describe('Reporting Management app', function () {
    const savedObjectsArchive = 'test/functional/fixtures/kbn_archiver/discover';

    const job: JobParamsCsvFromSavedObject = {
      browserTimezone: 'UTC',
      objectType: 'search',
      version: '8.10.0',
      locatorParams: [
        {
          id: DISCOVER_APP_LOCATOR,
          version: 'reporting',
          // the create job API requires a valid savedSearchId
          params: { savedSearchId: 'ab12e3c0-f231-11e6-9486-733b1ac9221a' },
        },
      ],
    };

    const TEST_USERNAME = 'test_user';
    const TEST_PASSWORD = 'changeme';

    before('initialize saved object archive', async () => {
      await reportingAPI.createReportingRole(security);
      await reportingAPI.createReportingUser(security, TEST_USERNAME, TEST_PASSWORD);

      // add test saved search object
      await kibanaServer.importExport.load(savedObjectsArchive);
    });

    after('clean up archives', async () => {
      await kibanaServer.importExport.unload(savedObjectsArchive);
    });

    it(`user sees a job they've created`, async () => {
      log.debug(`creating a csv report job as 'elastic'`);

      // requires the current logged-in user to be "elastic"
      const {
        job: { id: jobId },
      } = await reportingAPI.createReportJobInternal(
        CSV_REPORT_TYPE_V2,
        job,
        'elastic',
        'changeme'
      );

      await navigateToReportingManagement();
      await testSubjects.existOrFail(`viewReportingLink-${jobId}`);
    });

    it(`user doesn't see a job another user has created`, async () => {
      log.debug(`creating a csv report job as '${TEST_USERNAME}'`);

      const {
        job: { id: jobId },
      } = await reportingAPI.createReportJobInternal(
        CSV_REPORT_TYPE_V2,
        job,
        TEST_USERNAME,
        TEST_PASSWORD
      );

      await navigateToReportingManagement();
      await testSubjects.missingOrFail(`viewReportingLink-${jobId}`);
    });
  });
};
