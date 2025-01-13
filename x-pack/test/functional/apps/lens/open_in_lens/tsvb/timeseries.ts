/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, lens, header } = getPageObjects([
    'visualBuilder',
    'visualize',
    'header',
    'lens',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');

  describe('Time Series', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await visualBuilder.resetPage();
    });

    it('should show the "Edit Visualization in Lens" menu item for a count aggregation', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.be(true);
    });

    it('visualizes field to Lens and loads fields to the dimesion editor', async () => {
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.be('Count of records');
      });
    });

    it('navigates back to TSVB when the Back button is clicked', async () => {
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      const goBackBtn = await testSubjects.find('lnsApp_goBackToAppButton');
      await goBackBtn.click();
      await visualBuilder.checkVisualBuilderIsPresent();
      await retry.try(async () => {
        const actualCount = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('56');
      });
    });

    it('should preserve app filters in lens', async () => {
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'css' });
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      expect(await filterBar.hasFilter('extension', 'css')).to.be(true);
    });

    it('should preserve query in lens', async () => {
      await queryBar.setQuery('machine.os : ios');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
    });

    it('should draw a reference line', async () => {
      await visualBuilder.createNewAggSeries();
      await visualBuilder.selectAggType('Static Value');
      await visualBuilder.setStaticValue(10);

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const layers = await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`);

        const referenceLineDimensions = await testSubjects.findAllDescendant(
          'lns-dimensionTrigger',
          layers[0]
        );
        expect(referenceLineDimensions).to.have.length(1);
        expect(await referenceLineDimensions[0].getVisibleText()).to.be('Static value: 10');

        const dimensions = await testSubjects.findAllDescendant('lns-dimensionTrigger', layers[1]);
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.be('Count of records');
      });
    });

    it('should convert metric with params', async () => {
      await visualBuilder.selectAggType('Counter Rate');
      await visualBuilder.setFieldForAggregation('machine.ram');

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.eql(
          'Counter rate of machine.ram per second'
        );
      });
    });

    it('should not allow converting of not valid panel', async () => {
      await visualBuilder.selectAggType('Counter Rate');
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should not allow converting of unsupported aggregations', async () => {
      await visualBuilder.selectAggType('Sum of Squares');
      await visualBuilder.setFieldForAggregation('machine.ram');

      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should convert parent pipeline aggregation with terms', async () => {
      await visualBuilder.createNewAgg();

      await visualBuilder.selectAggType('Cumulative Sum', 1);
      await visualBuilder.setFieldForAggregation('Count', 1);

      await visualBuilder.setMetricsGroupByTerms('extension.raw');

      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();

      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(3);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.eql('Cumulative sum of Records');
        expect(await dimensions[2].getVisibleText()).to.eql('Top 10 values of extension.raw');
      });
    });

    it('should convert sibling pipeline aggregation with terms', async () => {
      await visualBuilder.createNewAgg();

      await visualBuilder.selectAggType('Overall Average', 1);
      await visualBuilder.setFieldForAggregation('Count', 1);

      await visualBuilder.setMetricsGroupByTerms('extension.raw');

      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();

      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(3);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.eql('overall_average(count())');
        expect(await dimensions[2].getVisibleText()).to.eql('Top 10 values of extension.raw');
      });
    });

    it('should bring the ignore global filters configured at series level over', async () => {
      await visualBuilder.clickSeriesOption();
      await visualBuilder.setIgnoreFilters(true);
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });

    it('should bring the ignore global filters configured at panel level over', async () => {
      await visualBuilder.clickPanelOptions('timeSeries');
      await visualBuilder.setIgnoreFilters(true);
      await header.waitUntilLoadingHasFinished();
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');
      expect(await testSubjects.exists('lnsChangeIndexPatternIgnoringFilters')).to.be(true);
    });
  });
}
