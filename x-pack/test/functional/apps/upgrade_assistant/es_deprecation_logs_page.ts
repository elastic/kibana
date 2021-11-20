/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function upgradeAssistantESDeprecationLogsPageFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const PageObjects = getPageObjects(['upgradeAssistant', 'common']);
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  describe.skip('ES deprecation logs page', function () {
    this.tags('skipFirefox');

    before(async () => {
      await security.testUser.setRoles(['superuser']);
      // Access to system indices will be deprecated and should generate a deprecation log
      await es.indices.get({ index: '.kibana' });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    beforeEach(async () => {
      await PageObjects.upgradeAssistant.navigateToEsDeprecationLogs();
    });

    it('Shows warnings callout if there are deprecations', async () => {
      testSubjects.exists('hasWarningsCallout');
    });

    it('Shows no warnings callout if there are no deprecations', async () => {
      await PageObjects.upgradeAssistant.clickResetLastCheckpointButton();
      testSubjects.exists('noWarningsCallout');
    });
  });
}
