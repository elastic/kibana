/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const browser = getService('browser');
  const filterBarService = getService('filterBar');
  const queryBar = getService('queryBar');

  describe('lens share tests', () => {
    before(async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
    });

    afterEach(async () => {
      await PageObjects.lens.closeShareModal();
    });

    after(async () => {
      await PageObjects.lens.setCSVDownloadDebugFlag(false);
    });

    it('should disable the share button if no request is made', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      expect(await PageObjects.lens.isShareable()).to.eql(false);
    });

    it('should keep the button disabled for incomplete configuration', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      expect(await PageObjects.lens.isShareable()).to.eql(false);
    });

    it('should make the share button available as soon as a valid configuration is generated', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect(await PageObjects.lens.isShareable()).to.eql(true);
    });

    it('should enable both download and URL sharing for valid configuration', async () => {
      await PageObjects.lens.clickShareModal();

      expect(await PageObjects.lens.isShareActionEnabled('export'));
      expect(await PageObjects.lens.isShareActionEnabled('link'));
    });

    xit('should preserve filter and query when sharing', async () => {
      await filterBarService.addFilter({ field: 'bytes', operation: 'is', value: '1' });
      await queryBar.setQuery('host.keyword www.elastic.co');
      await queryBar.submitQuery();
      await PageObjects.lens.waitForVisualization('xyVisChart');

      const url = await PageObjects.lens.getUrl();
      await PageObjects.lens.closeShareModal();
      await browser.openNewTab();

      const [lensWindowHandler] = await browser.getAllWindowHandles();

      await browser.navigateTo(url);
      // check that it's the same configuration in the new URL when ready
      await PageObjects.lens.waitForVisualization('xyVisChart');
      expect(await filterBarService.getFiltersLabel()).to.eql(['bytes: 1']);
      expect(await queryBar.getQueryString()).to.be('host.keyword www.elastic.co');
      await browser.closeCurrentWindow();
      await browser.switchToWindow(lensWindowHandler);
    });

    it('should be able to download CSV data of the current visualization', async () => {
      await PageObjects.lens.setCSVDownloadDebugFlag(true);
      await PageObjects.lens.openCSVDownloadShare();

      const csv = await PageObjects.lens.getCSVContent();
      expect(csv).to.be.ok();
      expect(Object.keys(csv!)).to.have.length(1);
    });

    it('should be able to download CSV of multi layer visualization', async () => {
      await PageObjects.lens.createLayer();

      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });

      await PageObjects.lens.openCSVDownloadShare();

      const csv = await PageObjects.lens.getCSVContent();
      expect(csv).to.be.ok();
      expect(Object.keys(csv!)).to.have.length(2);
    });
  });
}
