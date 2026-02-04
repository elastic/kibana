/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');

  // Failing: See https://github.com/elastic/kibana/issues/251048
  describe.skip('Trial Companion', () => {
    before(async () => {
      await svlCommonPage.loginAsAdmin();
    });
    it('should show on Get Started for an Admin user', async () => {
      await common.navigateToApp('security', { path: 'get_started' });
      await testSubjects.existOrFail('securitySolutionYourTrialCompanion-get-set-up-accordion');
    });
  });
};
