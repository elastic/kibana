/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common']);
  const testSubjects = getService('testSubjects');

  describe('lens partition charts', () => {
    before(async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
    });

    it('should be able to nest up to 3 levels for Pie charts', async () => {
      await PageObjects.lens.switchToVisualization('pie');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsPie_sizeByDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      for (const field of ['ip', 'extension.raw', 'geo.dest']) {
        await PageObjects.lens.configureDimension({
          dimension: 'lnsPie_sliceByDimensionPanel > lns-empty-dimension',
          operation: 'terms',
          field,
        });
      }
    });

    it('should not expose the grouping switch in Pie', async () => {
      await PageObjects.lens.openDimensionEditor(
        'lnsPie_sliceByDimensionPanel > lns-dimensionTrigger'
      );

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(false);
      expect(await testSubjects.exists('indexPattern-nesting-select')).to.eql(false);

      await PageObjects.lens.closeDimensionEditor();
    });

    it('should switch to donut charts keeping all dimensions', async () => {
      await PageObjects.lens.switchToVisualization('donut');

      expect(
        await testSubjects.exists('lnsPie_sliceByDimensionPanel > lns-empty-dimension')
      ).to.eql(false);

      expect(
        (await testSubjects.findAll('lnsPie_sliceByDimensionPanel > lns-dimensionTrigger')).length
      ).to.eql(3);
    });

    it('should not expose the grouping switch in Donut', async () => {
      await PageObjects.lens.openDimensionEditor(
        'lnsPie_sliceByDimensionPanel > lns-dimensionTrigger'
      );

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(false);
      expect(await testSubjects.exists('indexPattern-nesting-select')).to.eql(false);

      await PageObjects.lens.closeDimensionEditor();
    });

    it('should switch to treemap chart and keep only the first 2 dimensions', async () => {
      await PageObjects.lens.switchToVisualization('treemap');

      expect(
        await testSubjects.exists('lnsPie_groupByDimensionPanel > lns-empty-dimension')
      ).to.eql(false);

      expect(
        (await testSubjects.findAll('lnsPie_groupByDimensionPanel > lns-dimensionTrigger')).length
      ).to.eql(2);
    });

    it('should not expose the grouping switch in Treemap', async () => {
      await PageObjects.lens.openDimensionEditor(
        'lnsPie_groupByDimensionPanel > lns-dimensionTrigger'
      );

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(false);
      expect(await testSubjects.exists('indexPattern-nesting-select')).to.eql(false);

      await PageObjects.lens.closeDimensionEditor();
    });

    it('should switch to Mosaic chart and distribute dimensions as vertical and horizontal', async () => {
      await PageObjects.lens.switchToVisualization('mosaic');

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
      await PageObjects.lens.openDimensionEditor(
        'lnsPie_verticalAxisDimensionPanel > lns-dimensionTrigger'
      );

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(true);

      await PageObjects.lens.closeDimensionEditor();
    });

    it('should switch to Waffle chart', async () => {
      await PageObjects.lens.switchToVisualization('waffle');

      expect(
        await testSubjects.exists('lnsPie_groupByDimensionPanel > lns-empty-dimension')
      ).to.eql(false);

      expect(
        (await testSubjects.findAll('lnsPie_groupByDimensionPanel > lns-dimensionTrigger')).length
      ).to.eql(1);
    });

    it('should expose the grouping switch in Waffle', async () => {
      await PageObjects.lens.openDimensionEditor(
        'lnsPie_groupByDimensionPanel > lns-dimensionTrigger'
      );

      expect(await testSubjects.exists('indexPattern-nesting-switch')).to.eql(false);
      expect(await testSubjects.exists('indexPattern-nesting-select')).to.eql(false);

      await PageObjects.lens.closeDimensionEditor();
    });
  });
}
