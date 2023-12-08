/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');

  describe('Indices', function () {
    before(async () => {
      // Navigate to the index management page
      await pageObjects.svlCommonPage.login();
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the indices tab
      await pageObjects.indexManagement.changeTabs('indicesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('renders the indices tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/indices`);
    });
    it('can create an index', async () => {
      const testIndexName = `index-ftr-test-${Math.random()}`;
      await pageObjects.indexManagement.clickCreateIndexButton();
      await pageObjects.indexManagement.setCreateIndexName(testIndexName);
      await pageObjects.indexManagement.clickCreateIndexSaveButton();
      await pageObjects.indexManagement.expectIndexToExist(testIndexName);
    });
  });
};
