/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const { common, maps } = getPageObjects(['common', 'maps']);

  describe('maps with multiple data views', () => {
    const mapTitle = 'map with multiple data views';

    const createLayerForDataView = async (dataView: string) => {
      await maps.clickAddLayer();
      await testSubjects.click('documents');
      await maps.selectGeoIndexPatternLayer(dataView);
      await testSubjects.click('importFileButton');
      await testSubjects.click('layerPanelCancelButton');
    };

    before(async () => {
      await common.setTime({
        from: 'Oct 23, 2018 @ 07:00:00.000',
        to: 'Oct 23, 2018 @ 08:00:00.000',
      });

      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );

      await esArchiver.load('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern'
      );
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': true });

      await maps.openNewMap();
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern'
      );
    });

    it('should allow building a map with multiple data views', async () => {
      // Logstash layer
      await createLayerForDataView('long-window-logstash-*');

      // Flights layer
      await createLayerForDataView('kibana_sample_data_flights');

      expect(await maps.getNumberOfLayers()).to.be(3);
      expect(await maps.getLayerTocTooltipMsg('kibana_sample_data_flights')).to.equal(
        'kibana_sample_data_flights\nFound 9 documents.\nResults narrowed by global time'
      );
      expect(await maps.getLayerTocTooltipMsg('long-window-logstash-*')).to.equal(
        'long-window-logstash-*\nFound 2 documents.\nResults narrowed by global time'
      );
    });

    it('ignores global filters on layers using a data view without the filter field by default', async () => {
      await filterBar.addFilter({ field: '@message', operation: 'exists' });
      expect(await maps.getLayerTocTooltipMsg('kibana_sample_data_flights')).to.equal(
        'kibana_sample_data_flights\nFound 9 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );
      expect(await maps.getLayerTocTooltipMsg('long-window-logstash-*')).to.equal(
        'long-window-logstash-*\nFound 2 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );

      await maps.saveMap(mapTitle);
    });

    it('applies global filters on layers using data view a without the filter field', async () => {
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': false });
      await maps.loadSavedMap(mapTitle);
      expect(await maps.getLayerTocTooltipMsg('kibana_sample_data_flights')).to.equal(
        'kibana_sample_data_flights\nNo results found.\nResults narrowed by global search\nResults narrowed by global time'
      );
      expect(await maps.getLayerTocTooltipMsg('long-window-logstash-*')).to.equal(
        'long-window-logstash-*\nFound 2 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );
    });
  });
}
