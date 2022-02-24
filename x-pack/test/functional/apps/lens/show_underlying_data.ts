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

      await PageObjects.lens.waitForVisualization();
      // expect the button is shown and enabled

      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);

      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('discoverChart');
      // check the table columns
      const columns = await PageObjects.discover.getColumnHeaders();
      expect(columns).to.eql(['ip', '@timestamp', 'bytes']);
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should ignore the top values column if other category is enabled', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.openDimensionEditor(
        'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
      );
      await testSubjects.click('indexPattern-terms-advanced');
      await testSubjects.click('indexPattern-terms-other-bucket');

      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.waitForVisualization();
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
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();

      // add a lucene query to the yDimension
      await PageObjects.lens.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
      await PageObjects.lens.enableFilter();
      // turn off the KQL switch to change the language to lucene
      await testSubjects.click('indexPattern-filter-by-input > switchQueryLanguageButton');
      await testSubjects.click('languageToggle');
      await testSubjects.click('indexPattern-filter-by-input > switchQueryLanguageButton');
      await PageObjects.lens.setFilterBy('memory');

      await PageObjects.lens.waitForVisualization();
      // expect the button is shown and enabled
      //   await PageObjects.common.sleep(15000);

      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('discoverChart');
      // check the query
      expect(await queryBar.getQueryString()).be.eql(
        '( ( ip: 220.120.146.16 ) OR ( ip: 220.120.146.16 ) OR ( ip: 220.120.146.16 ) OR ( ip: 220.120.146.16 ) OR ( ip: 220.120.146.16 ) OR ( ip: 220.120.146.16 ) OR ( ip: 152.56.56.106 ) OR ( ip: 152.56.56.106 ) OR ( ip: 111.55.80.52 ) OR ( ip: 111.55.80.52 ) OR ( ip: 111.55.80.52 ) OR ( ip: 111.55.80.52 ) OR ( ip: 111.55.80.52 ) OR ( ip: 111.55.80.52 ) )'
      );
      const filterPills = await filterBar.getFiltersLabel();
      expect(filterPills.length).to.be(1);
      expect(filterPills[0]).to.be('Lens context (lucene)');
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should show the underlying data extracting all filters and columsn from a formula', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'formula',
        formula: `median(bytes) + average(memory, kql=`,
        keepOpen: true,
      });

      const input = await find.activeElement();
      await input.type(`bytes > 6000`);

      await PageObjects.lens.closeDimensionEditor();
      await PageObjects.lens.waitForVisualization();
      // expect the button is shown and enabled
      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('discoverChart');
      // check the columns
      const columns = await PageObjects.discover.getColumnHeaders();
      expect(columns).to.eql(['ip', '@timestamp', 'bytes', 'memory']);
      // check the query
      expect(await queryBar.getQueryString()).be.eql(
        '( ( bytes > 6000 ) AND ( ( ip: 97.220.3.248 ) OR ( ip: 169.228.188.120 ) OR ( ip: 78.83.247.30 ) ) )'
      );
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should extract a filter from a formula global filter', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await PageObjects.lens.enableFilter();
      await PageObjects.lens.setFilterBy('bytes > 4000');

      await PageObjects.lens.waitForVisualization();
      // expect the button is shown and enabled
      await testSubjects.clickWhenNotDisabled(`lnsApp_openInDiscover`);

      const [lensWindowHandler, discoverWindowHandle] = await browser.getAllWindowHandles();
      await browser.switchToWindow(discoverWindowHandle);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('discoverChart');

      // check the query
      expect(await queryBar.getQueryString()).be.eql(
        '( ( bytes > 4000 ) AND ( ( ip: 97.220.3.248 ) OR ( ip: 169.228.188.120 ) OR ( ip: 78.83.247.30 ) ) )'
      );
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });
  });
}
