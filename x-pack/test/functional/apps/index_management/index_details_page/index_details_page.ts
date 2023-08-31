/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const log = getService('log');
  const security = getService('security');

  describe('Index details page', function () {
    before(async () => {
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');
    });

    it('Navigates to the index details page from the home page', async () => {
      await log.debug('Navigating to the index details page');

      // display hidden indices to have some rows in the indices table
      await pageObjects.indexManagement.toggleHiddenIndices();
      // click the first index in the table and wait for the index details page
      await pageObjects.indexManagement.indexDetailsPage.openIndexDetailsPage(0);
    });
  });
};
