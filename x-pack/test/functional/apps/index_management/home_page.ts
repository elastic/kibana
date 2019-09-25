/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const log = getService('log');
  const browser = getService('browser');

  describe('Home page', function() {
    this.tags('smoke');
    before(async () => {
      await pageObjects.common.navigateToApp('indexManagement');
    });

    it('Loads the app', async () => {
      await log.debug('Checking for section heading to say Index Management.');

      const headingText = await pageObjects.indexManagement.sectionHeadingText();
      expect(headingText).to.be('Index Management');

      const indicesList = await testSubjects.exists('indicesList');
      expect(indicesList).to.be(true);

      const reloadIndicesButton = await pageObjects.indexManagement.reloadIndicesButton();
      expect(await reloadIndicesButton.isDisplayed()).to.be(true);
    });

    describe('Index templates', () => {
      it('renders the index templates tab', async () => {
        // Navigate to the index templates tab
        pageObjects.indexManagement.changeTabs('templatesTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/templates`);

        // Verify content
        const templateList = await testSubjects.exists('templateList');
        expect(templateList).to.be(true);
      });
    });
  });
};
