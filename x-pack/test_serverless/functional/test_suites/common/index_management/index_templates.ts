/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const security = getService('security');
  const retry = getService('retry');

  describe('Index Templates', function () {
    before(async () => {
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the index templates tab
      await pageObjects.indexManagement.changeTabs('templatesTab');
    });

    it('renders the index templates tab', async () => {
      await retry.waitFor('index templates list to be visible', async () => {
        return await testSubjects.exists('templateList');
      });

      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/templates`);
    });
  });
};
