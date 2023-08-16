/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common']);
  // const supertest = getService('supertestWithoutAuth');

  const navigateToReportingManagement = async () => {
    log.debug(`navigating to reporting management app`);
    await retry.tryForTime(60 * 1000, async () => {
      await PageObjects.common.navigateToApp('management/insightsAndAlerting/reporting');
      await testSubjects.existOrFail('reportingPageHeader', { timeout: 2000 });
    });
  };

  describe('Reporting Management app', function () {
    beforeEach(async () => {
      await navigateToReportingManagement();
    });

    it(`user sees a job they've created`, async () => {
      // `elastic` requests a csv_v2 export
    });

    it(`user doesn't see a job another user has created`, async () => {
      // `reporting_user` requests a csv_v2 export
    });
  });
};
