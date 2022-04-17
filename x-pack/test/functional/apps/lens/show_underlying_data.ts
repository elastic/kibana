/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header', 'discover']);
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  describe('show underlying data', () => {
    it('should show the open button for a compatible saved visualization', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.waitForVisualization('xyVisChart');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        operation: 'terms',
        field: 'extension.raw',
      });

      await PageObjects.lens.waitForVisualization('xyVisChart');

      // expect the button is shown and enabled

      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await browser.setLocalStorageItem('discover:docExplorerUpdateCalloutClosed', 'true');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('discoverChart');
      // check the table columns
      const columns = await PageObjects.discover.getColumnHeaders();
      expect(columns).to.eql(['extension.raw', '@timestamp', 'bytes']);
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should ignore the top values column if other category is enabled', async () => {
      // Make the breakdown dimention be ignored
      await PageObjects.lens.openDimensionEditor(
        'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
      );
      await testSubjects.click('indexPattern-terms-advanced');
      await testSubjects.click('indexPattern-terms-other-bucket');

      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.waitForVisualization('xyVisChart');
      // expect the button is shown and enabled

      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('discoverChart');
      expect(await queryBar.getQueryString()).be.eql('');
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should show the open button for a compatible saved visualization with a lucene query', async () => {
      // Make the breakdown dimention contribute to filters again
      await PageObjects.lens.openDimensionEditor(
        'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
      );
      await testSubjects.click('indexPattern-terms-advanced');
      await testSubjects.click('indexPattern-terms-other-bucket');
      await PageObjects.lens.closeDimensionEditor();

      // add a lucene query to the yDimension
      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      await PageObjects.lens.enableFilter();
      // turn off the KQL switch to change the language to lucene
      await testSubjects.click('indexPattern-filter-by-input > switchQueryLanguageButton');
      await testSubjects.click('languageToggle');
      await testSubjects.click('indexPattern-filter-by-input > switchQueryLanguageButton');
      // apparently setting a filter requires some time before and after typing to work properly
      await PageObjects.common.sleep(1000);
      await PageObjects.lens.setFilterBy('machine.ram:*');
      await PageObjects.common.sleep(1000);

      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.waitForVisualization('xyVisChart');

      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('discoverChart');
      // check the query
      expect(await queryBar.getQueryString()).be.eql(
        '( ( extension.raw: "png" ) OR ( extension.raw: "css" ) OR ( extension.raw: "jpg" ) )'
      );
      const filterPills = await filterBar.getFiltersLabel();
      expect(filterPills.length).to.be(1);
      expect(filterPills[0]).to.be('Lens context (lucene)');
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should show the underlying data extracting all filters and columns from a formula', async () => {
      await PageObjects.lens.removeDimension('lnsXY_yDimensionPanel');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'formula',
        formula: `average(memory, kql=`,
        keepOpen: true,
      });

      const input = await find.activeElement();
      await input.type(`bytes > 2000`);
      // the tooltip seems to be there as long as the focus is in the query string
      await input.pressKeys(browser.keys.RIGHT);

      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.waitForVisualization('xyVisChart');
      // expect the button is shown and enabled
      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('discoverChart');
      // check the columns
      const columns = await PageObjects.discover.getColumnHeaders();
      expect(columns).to.eql(['extension.raw', '@timestamp', 'memory']);
      // check the query
      expect(await queryBar.getQueryString()).be.eql(
        '( ( bytes > 2000 ) AND ( ( extension.raw: "css" ) OR ( extension.raw: "gif" ) OR ( extension.raw: "jpg" ) ) )'
      );
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should extract a filter from a formula global filter', async () => {
      await PageObjects.lens.removeDimension('lnsXY_yDimensionPanel');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await PageObjects.lens.enableFilter();
      // apparently setting a filter requires some time before and after typing to work properly
      await PageObjects.common.sleep(1000);
      await PageObjects.lens.setFilterBy('bytes > 4000');
      await PageObjects.common.sleep(1000);

      await PageObjects.lens.waitForVisualization('xyVisChart');
      // expect the button is shown and enabled
      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('discoverChart');

      // check the query
      expect(await queryBar.getQueryString()).be.eql(
        '( ( bytes > 4000 ) AND ( ( extension.raw: "css" ) OR ( extension.raw: "gif" ) OR ( extension.raw: "jpg" ) ) )'
      );
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });
  });
}
