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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('epoch millis', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/lens/epoch_millis');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/epoch_millis.json'
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/lens/epoch_millis');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/epoch_millis.json'
      );
    });
    it('should show field list', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.switchDataPanelIndexPattern('epoch-millis*');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      const fieldList = await PageObjects.lens.findAllFields();
      expect(fieldList).to.contain('@timestamp');
    });

    it('should able to configure a regular metric', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });
      await PageObjects.lens.waitForVisualization('mtrVis');
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('1');
    });

    it('should able to configure a shifted metric', async () => {
      await PageObjects.lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await PageObjects.lens.enableTimeShift();
      await PageObjects.lens.setTimeShift('3d');

      await PageObjects.lens.waitForVisualization('mtrVis');
      expect(await PageObjects.lens.getDatatableCellText(0, 0)).to.eql('2');
    });
  });
}
