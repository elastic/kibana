/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexLifecycleManagement']);
  const log = getService('log');

  describe('Home page', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('indexLifecycleManagement');
    });

    it('Loads the app', async () => {
      await log.debug('Checking for section header');
      const headerText = await pageObjects.indexLifecycleManagement.sectionHeadingText();
      expect(headerText).to.be('Index Lifecycle Policies');

      const createPolicyButton = await pageObjects.indexLifecycleManagement.createPolicyButton();
      expect(await createPolicyButton.isDisplayed()).to.be(true);
    });
  });
};
