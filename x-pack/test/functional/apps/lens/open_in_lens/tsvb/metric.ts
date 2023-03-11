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
    'lens',
    'header',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Metric', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    beforeEach(async () => {
      await visualBuilder.resetPage();
      await visualBuilder.clickMetric();
      await visualBuilder.clickDataTab('metric');
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should convert to Lens', async () => {
      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('mtrVis');

      const metricData = await lens.getMetricVisualizationData();
      expect(metricData[0].title).to.eql('Count of records');
    });

    it('should draw static value', async () => {
      await visualBuilder.selectAggType('Static Value');
      await visualBuilder.setStaticValue(10);

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('mtrVis');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(1);
        expect(await dimensions[0].getVisibleText()).to.be('10');
      });
    });

    it('should convert metric with params', async () => {
      await visualBuilder.selectAggType('Value Count');
      await visualBuilder.setFieldForAggregation('bytes');

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('mtrVis');
      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(1);
        expect(await dimensions[0].getVisibleText()).to.be('Count of bytes');
      });
    });

    it('should not allow converting of unsupported metric', async () => {
      await visualBuilder.selectAggType('Counter Rate');
      await visualBuilder.setFieldForAggregation('machine.ram');

      await header.waitUntilLoadingHasFinished();

      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should not allow converting of not valid panel', async () => {
      await visualBuilder.selectAggType('Value Count');

      await header.waitUntilLoadingHasFinished();

      expect(await visualize.hasNavigateToLensButton()).to.be(false);
    });

    it('should convert color ranges', async () => {
      await visualBuilder.clickPanelOptions('metric');
      await visualBuilder.setColorRuleOperator('>= greater than or equal');
      await visualBuilder.setColorRuleValue(10);
      await visualBuilder.setColorPickerValue('#54B399');

      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisulization();

      await lens.waitForVisualization('mtrVis');
      await retry.try(async () => {
        const closePalettePanels = await testSubjects.findAll(
          'lns-indexPattern-PalettePanelContainerBack'
        );
        if (closePalettePanels.length) {
          await lens.closePalettePanel();
          await lens.closeDimensionEditor();
        }

        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(1);

        await dimensions[0].click();

        await lens.openPalettePanel('lnsMetric');
        const colorStops = await lens.getPaletteColorStops();

        expect(colorStops).to.eql([
          { stop: '10', color: 'rgba(84, 179, 153, 1)' },
          { stop: '', color: undefined },
        ]);
      });
    });
  });
}
