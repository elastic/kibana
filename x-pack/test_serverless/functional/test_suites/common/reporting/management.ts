/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import {
  CSV_REPORT_TYPE_V2,
  type JobParamsCsvFromSavedObject,
} from '@kbn/reporting-export-types-csv-common';
import type { CookieCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import { ReportApiJSON } from '@kbn/reporting-common/types';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'svlCommonPage', 'header']);
  const reportingAPI = getService('svlReportingApi');
  const samlAuth = getService('samlAuth');
  let cookieCredentials: CookieCredentials;
  let internalReqHeader: InternalRequestHeader;

  const navigateToReportingManagement = async () => {
    log.debug(`navigating to reporting management app`);
    await retry.tryForTime(60 * 1000, async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
      await PageObjects.common.navigateToApp('reportingManagement');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('reportingPageHeader', { timeout: 2000 });
    });
  };

  describe('Management: listing', function () {
    // security_exception: action [indices:admin/create] is unauthorized for user [elastic] with effective roles [superuser] on restricted indices [.reporting-2020.04.19], this action is granted by the index privileges [create_index,manage,all]
    this.tags('failsOnMKI');

    let reportJob: ReportApiJSON;
    let path: string;

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
    before(async () => {
      cookieCredentials = await samlAuth.getM2MApiCookieCredentialsWithRoleScope('admin');
      internalReqHeader = samlAuth.getInternalRequestHeader();
      // add test saved search object
      await kibanaServer.importExport.load(savedObjectsArchive);

      // generate a report that can be tested to show in the listing
      const result = await reportingAPI.createReportJobInternal(
        CSV_REPORT_TYPE_V2,
        job,
        cookieCredentials,
        internalReqHeader
      );

      path = result.path;
      reportJob = result.job;
    });

    after(async () => {
      await kibanaServer.importExport.unload(savedObjectsArchive);
      await reportingAPI.waitForJobToFinish(path, cookieCredentials, internalReqHeader);
    });

    it(`user sees a job they've created`, async () => {
      await navigateToReportingManagement();
      await testSubjects.existOrFail(`viewReportingLink-${reportJob.id}`);
    });
  });
};
