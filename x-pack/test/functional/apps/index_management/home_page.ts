/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const pageObjects = getPageObjects(['common', 'indexManagement']);
  const log = getService('log');

  describe('Home page', function() {
    this.tags('smoke');
    before(async () => {
      await pageObjects.common.navigateToApp('indexManagement');
    });

    it('Loads the app', async () => {
      await log.debug('Checking for section heading to say Index Management.');
      const headingText = await pageObjects.indexManagement.sectionHeadingText();
      expect(headingText).to.be('Index Management');

      const reloadIndicesButton = await pageObjects.indexManagement.reloadIndicesButton();
      expect(await reloadIndicesButton.isDisplayed()).to.be(true);
    });
  });
};
