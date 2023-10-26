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
  const PageObjects = getPageObjects(['common', 'svlCommonPage', 'header']);
  const reportingAPI = getService('svlReportingApi');
  const config = getService('config');

  const navigateToReportingManagement = async () => {
    log.debug(`navigating to reporting management app`);
    await retry.tryForTime(60 * 1000, async () => {
      await PageObjects.svlCommonPage.login();
      await PageObjects.common.navigateToApp('reportingManagement');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('reportingPageHeader', { timeout: 2000 });
    });
  };

  describe('Reporting Management app', function () {
    // security_exception: action [indices:admin/create] is unauthorized for user [elastic] with effective roles [superuser] on restricted indices [.reporting-2020.04.19], this action is granted by the index privileges [create_index,manage,all]
    this.tags('failsOnMKI');
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

    // Kibana CI and MKI use different users
    const TEST_USERNAME = config.get('servers.kibana.username');
    const TEST_PASSWORD = config.get('servers.kibana.password');

    before('initialize saved object archive', async () => {
      // add test saved search object
      await kibanaServer.importExport.load(savedObjectsArchive);
    });

    after('clean up archives', async () => {
      await kibanaServer.importExport.unload(savedObjectsArchive);
    });

    // Cant auth into the route as it's structured currently
    xit(`user sees a job they've created`, async () => {
      const {
        job: { id: jobId },
      } = await reportingAPI.createReportJobInternal(CSV_REPORT_TYPE_V2, job);

      await navigateToReportingManagement();
      await testSubjects.existOrFail(`viewReportingLink-${jobId}`);
    });

    // Skipping test for now because functionality is not yet possible to test
    xit(`user doesn't see a job another user has created`, async () => {
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
