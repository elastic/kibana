/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function upgradeAssistantOverviewPageFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const pageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('Overview Page', function () {
    // Only run this test in 8 as the deprecation we are testing is only available in 8
    this.onlyEsVersion('8');
    this.tags(['skipFirefox', 'upgradeAssistant']);

    before(async () => {
      await security.testUser.setRoles(['superuser']);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    beforeEach(async () => {
      await pageObjects.upgradeAssistant.navigateToPage();
    });

    it('Should render overview page', async () => {
      await testSubjects.exists('overview');
    });

    it('Should render overview upgrade steps', async () => {
      // step 1
      await testSubjects.exists('backupStep-incomplete');
      // step 2
      await testSubjects.exists('migrateSystemIndicesText');
      // step 3
      await testSubjects.exists('fixIssuesStep-incomplete');
      // step 4
      await testSubjects.exists('logsStep-incomplete');
      // step 5
      await testSubjects.exists('upgradeStep');
    });
  });
}
