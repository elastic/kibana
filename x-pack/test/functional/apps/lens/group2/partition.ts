/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const testSubjects = getService('testSubjects');

  describe('lens partition charts', () => {
    before(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.goToTimeRange();
    });

    it('should be able to nest up to 3 levels for Pie charts', async () => {
      await lens.switchToVisualization('pie');

      await lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      for (const field of ['ip', 'extension.raw', 'geo.dest']) {
        await lens.configureDimension({
          dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field,
        });
      }
    });

    it('should not expose the grouping switch in Pie', async () => {
      await lens.openDimensionEditor('lnsPie_sliceByDimensionPanel > lns-dimensionTrigger');

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(false);
      expect(await testSubjects.exists('indexPattern-nesting-select')).to.eql(false);

      await lens.closeDimensionEditor();
    });

    it('should switch to donut charts keeping all dimensions', async () => {
      await lens.setDonutHoleSize('Large');

      expect(
        await testSubjects.exists('lnsPie_sliceByDimensionPanel > lns-empty-dimension')
      ).to.eql(false);

      expect(
        (await testSubjects.findAll('lnsPie_sliceByDimensionPanel > lns-dimensionTrigger')).length
      ).to.eql(3);
    });

    it('should not expose the grouping switch in Donut', async () => {
      await lens.openDimensionEditor('lnsPie_sliceByDimensionPanel > lns-dimensionTrigger');

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(false);
      expect(await testSubjects.exists('indexPattern-nesting-select')).to.eql(false);

      await lens.closeDimensionEditor();
    });

    it('should switch to treemap chart and keep only the first 2 dimensions', async () => {
      await lens.switchToVisualization('treemap');

      expect(
        await testSubjects.exists('lnsPie_groupByDimensionPanel > lns-empty-dimension')
      ).to.eql(false);

      expect(
        (await testSubjects.findAll('lnsPie_groupByDimensionPanel > lns-dimensionTrigger')).length
      ).to.eql(2);
    });

    it('should not expose the grouping switch in Treemap', async () => {
      await lens.openDimensionEditor('lnsPie_groupByDimensionPanel > lns-dimensionTrigger');

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(false);
      expect(await testSubjects.exists('indexPattern-nesting-select')).to.eql(false);

      await lens.closeDimensionEditor();
    });

    it('should switch to Mosaic chart and distribute dimensions as vertical and horizontal', async () => {
      await lens.switchToVisualization('mosaic');

      expect(
        await testSubjects.exists('lnsPie_sliceByDimensionPanel > lns-empty-dimension')
      ).to.eql(false);

      expect(
        (await testSubjects.findAll('lnsPie_verticalAxisDimensionPanel > lns-dimensionTrigger'))
          .length
      ).to.eql(1);

      expect(
        (await testSubjects.findAll('lnsPie_horizontalAxisDimensionPanel > lns-dimensionTrigger'))
          .length
      ).to.eql(1);
    });

    it('should expose the grouping switch in Mosaic', async () => {
      await lens.openDimensionEditor('lnsPie_verticalAxisDimensionPanel > lns-dimensionTrigger');

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(true);

      await lens.closeDimensionEditor();
    });

    it('should switch to Waffle chart', async () => {
      await lens.switchToVisualization('waffle');

      expect(
        await testSubjects.exists('lnsPie_groupByDimensionPanel > lns-empty-dimension')
      ).to.eql(false);

      expect(
        (await testSubjects.findAll('lnsPie_groupByDimensionPanel > lns-dimensionTrigger')).length
      ).to.eql(1);
    });

    it('should expose the grouping switch in Waffle', async () => {
      await lens.openDimensionEditor('lnsPie_groupByDimensionPanel > lns-dimensionTrigger');

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(false);
      expect(await testSubjects.exists('indexPattern-nesting-select')).to.eql(false);

      await lens.closeDimensionEditor();
    });
  });
}
