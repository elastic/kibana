/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const pageObjects = getPageObjects(['common', 'indexLifecycleManagement']);
  const log = getService('log');

  describe('Home page', function() {
    this.tags('smoke');
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
