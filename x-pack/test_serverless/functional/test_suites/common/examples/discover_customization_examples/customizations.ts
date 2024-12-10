/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const TEST_START_TIME = 'Sep 19, 2015 @ 06:31:44.000';
const TEST_END_TIME = 'Sep 23, 2015 @ 18:31:44.000';

export default ({ getService, getPageObjects }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'timePicker', 'header', 'svlCommonPage']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const retry = getService('retry');
  const defaultSettings = { defaultIndex: 'logstash-*' };

  describe('Customizations', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('home');
      const currentUrl = await browser.getCurrentUrl();
      const customizationUrl =
        currentUrl.substring(0, currentUrl.indexOf('/app/home')) +
        '/app/discoverCustomizationExamples';
      await browser.get(customizationUrl);
      await PageObjects.timePicker.setAbsoluteRange(TEST_START_TIME, TEST_END_TIME);
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('defaultIndex');
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('Top nav', async () => {
      await testSubjects.existOrFail('shareTopNavButton');
      await testSubjects.missingOrFail('discoverNewButton');
      await testSubjects.missingOrFail('discoverOpenButton');
    });

    it('Search bar', async () => {
      await testSubjects.click('logsViewSelectorButton');
      await testSubjects.click('logsViewSelectorOption-ASavedSearch');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const { title, description } = await PageObjects.common.getSharedItemTitleAndDescription();
        const expected = {
          title: 'A Saved Search',
          description: 'A Saved Search Description',
        };
        expect(title).to.eql(expected.title);
        expect(description).to.eql(expected.description);
      });
      await browser.goBack();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('Search bar Prepend Filters exists and should apply filter properly', async () => {
      // Validate custom filters are present
      await testSubjects.existOrFail('customPrependedFilter');
      await testSubjects.click('customPrependedFilter');
      await testSubjects.existOrFail('optionsList-control-selection-exists');

      // Retrieve option list popover
      const optionsListControl = await testSubjects.find('optionsList-control-popover');
      const optionsItems = await optionsListControl.findAllByCssSelector(
        '[data-test-subj*="optionsList-control-selection-"]'
      );

      // Retrieve second item in the options along with the count of documents
      const item = optionsItems[1];
      const countBadge = await item.findByCssSelector(
        '[data-test-subj="optionsList-document-count-badge"]'
      );
      const documentsCount = parseInt(await countBadge.getVisibleText(), 10);

      // Click the item to apply filter
      await item.click();
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Validate that filter is applied
      const rows = await dataGrid.getDocTableRows();
      await expect(documentsCount).to.eql(rows.length);
    });
  });
};
