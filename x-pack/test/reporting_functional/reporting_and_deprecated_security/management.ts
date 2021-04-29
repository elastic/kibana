/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'reporting', 'discover']);

  const testSubjects = getService('testSubjects');
  const reportingFunctional = getService('reportingFunctional');

  describe('Access to Management > Reporting', () => {
    before(async () => {
      await reportingFunctional.initEcommerce();
    });
    after(async () => {
      await reportingFunctional.teardownEcommerce();
    });

    it('does not allow user that does not have reporting_user role', async () => {
      await reportingFunctional.loginDataAnalyst();
      await PageObjects.common.navigateToApp('reporting');
      await testSubjects.missingOrFail('reportJobListing');
    });

    it('does allow user with reporting_user role', async () => {
      await reportingFunctional.loginReportingUser();
      await PageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing');
    });
  });
};
