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

  describe('time shift', () => {
    it('should able to configure a shifted metric', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        disableEmptyRows: true,
      });
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'median',
        field: 'bytes',
      });
      await PageObjects.lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await PageObjects.lens.enableTimeShift();
      await PageObjects.lens.setTimeShift('6h');

      await PageObjects.lens.waitForVisualization();
      expect(await PageObjects.lens.getDatatableCellText(0, 1)).to.eql('5,994');
    });

    it('should able to configure a regular metric next to a shifted metric', async () => {
      await PageObjects.lens.closeDimensionEditor();
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.waitForVisualization();

      expect(await PageObjects.lens.getDatatableCellText(2, 1)).to.eql('5,994');
      expect(await PageObjects.lens.getDatatableCellText(2, 2)).to.eql('5,722.622');
    });

    it('should show an error if terms is used and provide a fix action', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      expect(await PageObjects.lens.hasFixAction()).to.be(true);
      await PageObjects.lens.useFixAction();

      expect(await PageObjects.lens.getDatatableCellText(1, 2)).to.eql('5,541.5');
      expect(await PageObjects.lens.getDatatableCellText(1, 3)).to.eql('3,628');

      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.eql('Filters of ip');
    });

    it('should show an error if multi terms is used and provide a fix action', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
        keepOpen: true,
      });

      await PageObjects.lens.addTermToAgg('geo.src');

      await PageObjects.lens.closeDimensionEditor();

      expect(await PageObjects.lens.hasFixAction()).to.be(true);
      await PageObjects.lens.useFixAction();

      expect(await PageObjects.lens.getDatatableHeaderText(1)).to.eql('Filters of ip › geo.src');
    });
  });
}
