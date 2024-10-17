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
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await lens.switchDataPanelIndexPattern('epoch-millis*');
      await lens.goToTimeRange();
      await lens.switchToVisualization('lnsDatatable');
      const fieldList = await lens.findAllFields();
      expect(fieldList).to.contain('@timestamp');
    });

    it('should able to configure a regular metric', async () => {
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'count',
        field: 'Records',
      });
      await lens.waitForVisualization('lnsSuggestion-countOfRecords');
      expect(await lens.getDatatableCellText(0, 0)).to.eql('1');
    });

    it('should able to configure a shifted metric', async () => {
      await lens.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
      await lens.enableTimeShift();
      await lens.setTimeShift('3d');

      await lens.waitForVisualization('lnsSuggestion-countOfRecords3D');
      expect(await lens.getDatatableCellText(0, 0)).to.eql('2');
    });
  });
}
