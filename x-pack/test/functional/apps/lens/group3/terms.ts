/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const retry = getService('retry');
  const es = getService('es');
  const indexPatterns = getService('indexPatterns');
  const log = getService('log');

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
    describe('rank by', () => {
      describe('reset rank on metric change', () => {
        it('should reset the ranking when using decimals on percentile', async () => {
          await PageObjects.visualize.navigateToNewVisualization();
          await PageObjects.visualize.clickVisType('lens');

          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
            operation: 'terms',
            field: 'geo.src',
          });

          await PageObjects.lens.configureDimension({
            dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
            operation: 'percentile',
            field: 'bytes',
            keepOpen: true,
          });

          await retry.try(async () => {
            const value = '60.5';
            // Can not use testSubjects because data-test-subj is placed range input and number input
            const percentileInput = await PageObjects.lens.getNumericFieldReady(
              'lns-indexPattern-percentile-input'
            );
            await percentileInput.clearValueWithKeyboard();
            await percentileInput.type(value);

            const percentileValue = await percentileInput.getAttribute('value');
            if (percentileValue !== value) {
              throw new Error(
                `[date-test-subj="lns-indexPattern-percentile-input"] not set to ${value}`
              );
            }
          });

          // close the toast about reset ranking
          // note: this has also the side effect to close the dimension editor
          await testSubjects.click('toastCloseButton');

          await PageObjects.lens.openDimensionEditor(
            'lnsXY_yDimensionPanel > lns-dimensionTrigger'
          );

          await PageObjects.lens.selectOperation('percentile_rank');

          await retry.try(async () => {
            const value = '600.5';
            const percentileRankInput = await testSubjects.find(
              'lns-indexPattern-percentile_ranks-input'
            );
            await percentileRankInput.clearValueWithKeyboard();
            await percentileRankInput.type(value);

            const percentileRankValue = await percentileRankInput.getAttribute('value');
            if (percentileRankValue !== value) {
              throw new Error(
                `[date-test-subj="lns-indexPattern-percentile_ranks-input"] not set to ${value}`
              );
            }
          });
          // note: this has also the side effect to close the dimension editor
          await testSubjects.click('toastCloseButton');
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
            const percentileInput = await PageObjects.lens.getNumericFieldReady(
              'lns-indexPattern-percentile-input'
            );
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

    describe('Enable Other group', () => {
      const esIndexPrefix = 'terms-empty-string-index';
      before(async () => {
        log.info(`Creating index ${esIndexPrefix} with mappings`);
        await es.indices.create({
          index: esIndexPrefix,
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
              },
              a: {
                type: 'keyword',
              },
              b: {
                type: 'keyword',
              },
            },
          },
        });

        log.info(`Adding 100 documents to ${esIndexPrefix} at Sep 20, 2015 @ 06:31:44.000`);
        const timestamp = moment
          .utc('Sep 20, 2015 @ 06:31:44.000', 'MMM D, YYYY [@] HH:mm:ss.SSS')
          .format();

        await es.bulk({
          index: esIndexPrefix,
          body: Array<{
            a: string;
            b: string;
            '@timestamp': string;
          }>(100)
            .fill({ a: '', b: '', '@timestamp': timestamp })
            .map((template, i) => {
              return {
                ...template,
                a: i > 50 ? `${(i % 5) + 1}` : '', // generate 5 values for the index + empty string
                b: i < 50 ? `${(i % 5) + 1}` : '', // generate 5 values for the index + empty string
              };
            })
            .map((d) => `{"index": {}}\n${JSON.stringify(d)}\n`),
        });

        log.info(`Creating dataView ${esIndexPrefix}`);
        await indexPatterns.create(
          {
            title: esIndexPrefix,
            timeFieldName: '@timestamp',
          },
          { override: true }
        );
      });

      after(async () => {
        await es.indices.delete({
          index: esIndexPrefix,
        });
      });
      it('should work with empty string values as buckets', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVisType('lens');
        await elasticChart.setNewChartUiDebugFlag(true);
        await PageObjects.lens.goToTimeRange();
        await PageObjects.lens.switchDataPanelIndexPattern(esIndexPrefix);

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'count',
        });

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'a',
        });

        await PageObjects.lens.waitForVisualization('xyVisChart');
        const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
        const seriesBar = data!.bars![0].bars;
        expect(seriesBar[0].x).to.eql('(empty)');
        expect(seriesBar[seriesBar.length - 1].x).to.eql('Other');
      });

      it('should work with empty string as breakdown', async () => {
        await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
        });

        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field: 'a',
        });

        await PageObjects.lens.waitForVisualization('xyVisChart');
        const data = await PageObjects.lens.getCurrentChartDebugState('xyVisChart');
        expect(data!.bars![0].name).to.eql('(empty)');
        expect(data!.bars![data!.bars!.length - 1].name).to.eql('Other');
      });

      it('should work with nested empty string values', async () => {
        await PageObjects.lens.switchToVisualization('lnsDatatable');

        await PageObjects.lens.removeLayer();

        await PageObjects.lens.configureDimension({
          dimension: 'lnsDatatable_rows > lns-empty-dimension',
          operation: 'terms',
          field: 'a',
          keepOpen: true,
        });
        await PageObjects.lens.setTermsNumberOfValues(4);
        await PageObjects.lens.closeDimensionEditor();

        await PageObjects.lens.configureDimension({
          dimension: 'lnsDatatable_rows > lns-empty-dimension',
          operation: 'terms',
          field: 'b',
          keepOpen: true,
        });
        await PageObjects.lens.setTermsNumberOfValues(1);
        await PageObjects.lens.closeDimensionEditor();

        await PageObjects.lens.configureDimension({
          dimension: 'lnsDatatable_metrics > lns-empty-dimension',
          operation: 'count',
        });
        await PageObjects.lens.waitForVisualization();
        await PageObjects.common.sleep(20000);
        // a empty value
        expect(await PageObjects.lens.getDatatableCellText(1, 0)).to.eql('(empty)');
        // b Other value
        expect(await PageObjects.lens.getDatatableCellText(1, 1)).to.eql('Other');
        // a Other value
        expect(await PageObjects.lens.getDatatableCellText(5, 0)).to.eql('Other');
        // b empty value
        expect(await PageObjects.lens.getDatatableCellText(5, 1)).to.eql('(empty)');
      });
    });
  });
}
