/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header', 'share']);
  const browser = getService('browser');
  const filterBarService = getService('filterBar');
  const queryBar = getService('queryBar');

  describe('lens share tests', () => {
    before(async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
    });
    afterEach(async () => {
      await PageObjects.share.closeShareModal();
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

    it('should make the share button avaialble as soon as a valid configuration is generated', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect(await PageObjects.lens.isShareable()).to.eql(true);
    });

    it('should enable both download and URL sharing for valid configuration', async () => {
      if (await PageObjects.lens.checkOldShareVersion()) {
        await PageObjects.lens.clickShareMenu();
        // out of scope for this PR
        expect(await PageObjects.lens.isShareActionEnabled('csvDownload'));
        await PageObjects.share.closeShareModal();
        expect(await PageObjects.lens.isShareActionEnabled('permalinks'));
      }
    });

    // REMOVE WHEN REDESIGN IS OVER
    it('should provide only snapshot url sharing if visualization is not saved yet', async () => {
      if (await PageObjects.lens.checkOldShareVersion()) {
        await PageObjects.lens.openPermalinkShare();

        const options = await PageObjects.lens.getAvailableUrlSharingOptions();
        expect(options).eql(['snapshot']);
      }
    });

    // REMOVE WHEN REDESIGN IS OVER
    it('should basically work for snapshot', async () => {
      if (await PageObjects.lens.checkOldShareVersion()) {
        const url = (await PageObjects.lens.checkOldShareVersion())
          ? await PageObjects.lens.getUrl('snapshot')
          : await PageObjects.lens.getUrl();
        await browser.openNewTab();

        const [lensWindowHandler] = await browser.getAllWindowHandles();

        await browser.navigateTo(url!);

        // check that it's the same configuration in the new URL when ready
        await PageObjects.lens.waitForVisualization('xyVisChart');
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
          'Average of bytes'
        );
        await browser.closeCurrentWindow();
        await browser.switchToWindow(lensWindowHandler);
      }
    });

    it('should provide also saved object url sharing if the visualization is shared', async () => {
      if (await PageObjects.lens.checkOldShareVersion()) {
        await PageObjects.lens.save('ASavedVisualizationToShare');
        await PageObjects.lens.openPermalinkShare();

        const options = await PageObjects.lens.getAvailableUrlSharingOptions();
        expect(options).eql(['snapshot', 'savedObject']);
      }
    });

    it('should preserve filter and query when sharing', async () => {
      await filterBarService.addFilter({ field: 'bytes', operation: 'is', value: '1' });
      await queryBar.setQuery('host.keyword www.elastic.co');
      await queryBar.submitQuery();
      await PageObjects.lens.waitForVisualization('xyVisChart');
      let url;
      if (await PageObjects.lens.checkOldShareVersion()) {
        url = await PageObjects.lens.getUrl('snapshot');
      } else {
        await PageObjects.share.closeShareModal();
        url = await PageObjects.lens.getUrl();
      }
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
      if (await PageObjects.lens.checkOldShareVersion()) {
        await PageObjects.lens.setCSVDownloadDebugFlag(true);
        await PageObjects.lens.openCSVDownloadShare();

        const csv = await PageObjects.lens.getCSVContent();
        expect(csv).to.be.ok();
        expect(Object.keys(csv!)).to.have.length(1);
      }
    });

    it('should be able to download CSV of multi layer visualization', async () => {
      if (await PageObjects.lens.checkOldShareVersion()) {
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
      }
    });
  });
}
