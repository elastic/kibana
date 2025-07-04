/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const security = getService('security');

  describe('Home page', function () {
    before(async () => {
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');
    });

    it('Loads the app and renders the indices tab by default', async () => {
      await log.debug('Checking for section heading to say Index Management.');

      const headingText = await pageObjects.indexManagement.sectionHeadingText();
      expect(headingText).to.be('Index Management');

      // Verify url
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/indices`);

      // Verify content
      const indicesList = await testSubjects.exists('indicesList');
      expect(indicesList).to.be(true);

      const reloadIndicesButton = await pageObjects.indexManagement.reloadIndicesButton();
      expect(await reloadIndicesButton.isDisplayed()).to.be(true);
    });

    describe('Indices', function () {
      const testIndexName = `index-test-${Math.random()}`;

      it('renders the indices tab', async () => {
        // Navigate to the data streams tab
        await pageObjects.indexManagement.changeTabs('indicesTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/indices`);

        // Verify content
        await retry.waitFor('Wait until indices table is visible.', async () => {
          return await testSubjects.isDisplayed('indexTable');
        });
      });

      it('can create an index', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();
        await pageObjects.indexManagement.setCreateIndexName(testIndexName);
        await pageObjects.indexManagement.setCreateIndexMode('Lookup');
        await pageObjects.indexManagement.clickCreateIndexSaveButton();
        await pageObjects.indexManagement.expectIndexToExist(testIndexName);
      });
    });

    describe('Data streams', () => {
      it('renders the data streams tab', async () => {
        // Navigate to the data streams tab
        await pageObjects.indexManagement.changeTabs('data_streamsTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/data_streams`);

        // Verify content
        await retry.waitFor('Wait until dataStream Table is visible.', async () => {
          return await testSubjects.isDisplayed('dataStreamTable');
        });
      });
    });

    describe('Index templates', () => {
      it('renders the index templates tab', async () => {
        // Navigate to the index templates tab
        await pageObjects.indexManagement.changeTabs('templatesTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/templates`);

        // Verify content
        const templateList = await testSubjects.exists('templateList');
        expect(templateList).to.be(true);
      });
    });

    describe('Component templates', () => {
      it('renders the component templates tab', async () => {
        // Navigate to the component templates tab
        await pageObjects.indexManagement.changeTabs('component_templatesTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/component_templates`);

        // Verify content. Component templates may have been created by other apps, e.g. Ingest Manager,
        // so we don't make any assertion about the presence or absence of component templates.
        const componentTemplateList = await testSubjects.exists('componentTemplateList');
        expect(componentTemplateList).to.be(true);
      });
    });

    describe('Enrich policies', () => {
      it('renders the enrich policies tab', async () => {
        // Navigate to the component templates tab
        await pageObjects.indexManagement.changeTabs('enrich_policiesTab');

        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify url
        const url = await browser.getCurrentUrl();
        expect(url).to.contain(`/enrich_policies`);

        // Verify content
        const enrichPoliciesList = await testSubjects.exists('sectionEmpty');
        expect(enrichPoliciesList).to.be(true);
      });
    });
  });
};
