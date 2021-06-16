/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const find = getService('find');
  const listingTable = getService('listingTable');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  describe('lens formula', () => {
    it('should transition from count to formula', async () => {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await listingTable.searchForItemWithName('lnsXYvis');
      await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'average',
        field: 'bytes',
        keepOpen: true,
      });

      await PageObjects.lens.switchToFormula();
      await PageObjects.header.waitUntilLoadingHasFinished();
      // .echLegendItem__title is the only viable way of getting the xy chart's
      // legend item(s), so we're using a class selector here.
      // 4th item is the other bucket
      expect(await find.allByCssSelector('.echLegendItem')).to.have.length(3);
    });

    it('should update and delete a formula', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count(kql=`,
        keepOpen: true,
      });

      const input = await find.activeElement();
      await input.type('*');

      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('14,005');
    });

    it('should insert single quotes and escape when needed to create valid KQL', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count(kql=`,
        keepOpen: true,
      });

      let input = await find.activeElement();
      await input.type(' ');
      await input.pressKeys(browser.keys.ARROW_LEFT);
      await input.type(`Men's Clothing`);

      await PageObjects.common.sleep(100);

      let element = await find.byCssSelector('.monaco-editor');
      expect(await element.getVisibleText()).to.equal(`count(kql='Men\\'s Clothing ')`);

      await PageObjects.common.sleep(100);
      await PageObjects.lens.typeFormula('count(kql=');
      input = await find.activeElement();
      await input.type(`Men\'s Clothing`);

      element = await find.byCssSelector('.monaco-editor');
      expect(await element.getVisibleText()).to.equal(`count(kql='Men\\'s Clothing')`);
    });

    it('should persist a broken formula on close', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      // Close immediately
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `asdf`,
      });

      expect(await PageObjects.lens.getErrorCount()).to.eql(1);
    });

    it('should keep the formula when entering expanded mode', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      // Close immediately
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await PageObjects.lens.toggleFullscreen();

      const element = await find.byCssSelector('.monaco-editor');
      expect(await element.getVisibleText()).to.equal('count()');
    });

    it('should allow an empty formula combined with a valid formula', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
      });

      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.getErrorCount()).to.eql(0);
    });

    it('should duplicate a moving average formula and be a valid table', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `moving_average(sum(bytes), window=5`,
        keepOpen: true,
      });
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.dragDimensionToDimension(
        'lnsDatatable_metrics > lns-dimensionTrigger',
        'lnsDatatable_metrics > lns-empty-dimension'
      );
      expect(await PageObjects.lens.getDatatableCellText(1, 1)).to.eql('222420');
      expect(await PageObjects.lens.getDatatableCellText(1, 2)).to.eql('222420');
    });

    it('should keep the formula if the user does not fully transition to a quick function', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });

      await PageObjects.lens.switchToQuickFunctions();
      await testSubjects.click(`lns-indexPatternDimension-min incompatible`);
      await PageObjects.common.sleep(1000);
      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_metrics', 0)).to.eql(
        'count()'
      );
    });
  });
}
