/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const managementMenu = getService('managementMenu');

  describe('monitor only user', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.common.navigateToApp('home');
      await security.testUser.setRoles(['index_management_monitor']);
      await pageObjects.common.navigateToApp('indexManagement');
    });

    it('should hide UI elements that perform CRUD operations', async () => {
      await testSubjects.missingOrFail('createPipelineButton');
      await testSubjects.missingOrFail('checkboxSelectAll');
      await testSubjects.missingOrFail('euiCollapsedItemActionsButton');
    });
  });
}
