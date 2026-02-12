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
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const retry = getService('retry');

  describe('lens terms', () => {
    describe('lens multi terms suite', () => {
      it('should allow creation of lens xy chart with multi terms categories', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVisType('lens');
        await elasticChart.setNewChartUiDebugFlag(true);
        await PageObjects.lens.goToTimeRange();

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'geo.src',
          keepOpen: true,
        });

        await PageObjects.lens.addTermToAgg('geo.dest');

        await PageObjects.lens.closeDimensionEditor();

        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0)).to.eql(
          'Top values of geo.src + 1 other'
        );

        await PageObjects.lens.openDimensionEditor('lnsXY_xDimensionPanel');

        await PageObjects.lens.addTermToAgg('bytes');

        await PageObjects.lens.closeDimensionEditor();

        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0)).to.eql(
          'Top values of geo.src + 2 others'
        );

        const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
        expect(data!.bars![0].bars[0].x).to.eql('PE › US › 19,986');
      });

      it('should allow creation of lens xy chart with multi terms categories split', async () => {
        await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'geo.src',
          keepOpen: true,
        });

        await PageObjects.lens.addTermToAgg('geo.dest');
        await PageObjects.lens.addTermToAgg('bytes');

        await PageObjects.lens.closeDimensionEditor();

        const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
        expect(data?.bars?.[0]?.name).to.eql('PE › US › 19,986');
      });

      it('should not show existing defined fields for new term', async () => {
        await PageObjects.lens.openDimensionEditor('lnsXY_splitDimensionPanel');

        await PageObjects.lens.checkTermsAreNotAvailableToAgg(['bytes', 'geo.src', 'geo.dest']);

        await PageObjects.lens.closeDimensionEditor();
      });
    });
    describe('sorting by custom metric', () => {
      it('should allow sort by custom metric', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVisType('lens');
        await elasticChart.setNewChartUiDebugFlag(true);
        await PageObjects.lens.goToTimeRange();

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'geo.src',
          keepOpen: true,
        });
        await find.clickByCssSelector(
          'select[data-test-subj="indexPattern-terms-orderBy"] > option[value="custom"]'
        );

        const fnTarget = await testSubjects.find('indexPattern-reference-function');
        await comboBox.openOptionsList(fnTarget);
        await comboBox.setElement(fnTarget, 'percentile');

        const fieldTarget = await testSubjects.find(
          'indexPattern-reference-field-selection-row>indexPattern-dimension-field'
        );
        await comboBox.openOptionsList(fieldTarget);
        await comboBox.setElement(fieldTarget, 'bytes');

        await retry.try(async () => {
          // Can not use testSubjects because data-test-subj is placed range input and number input
          const percentileInput = await find.byCssSelector(
            `input[data-test-subj="lns-indexPattern-percentile-input"][type='number']`
          );
          await percentileInput.click();
          await percentileInput.clearValue();
          await percentileInput.type('60');

          const percentileValue = await percentileInput.getAttribute('value');
          if (percentileValue !== '60') {
            throw new Error('layerPanelTopHitsSize not set to 60');
          }
        });

        await PageObjects.lens.waitForVisualization('xyVisChart');
        await PageObjects.lens.closeDimensionEditor();

        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel', 0)).to.eql(
          'Top 5 values of geo.src'
        );

        const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
        expect(data!.bars![0].bars[0].x).to.eql('BN');
        expect(data!.bars![0].bars[0].y).to.eql(19265);
      });
    });
  });
}
