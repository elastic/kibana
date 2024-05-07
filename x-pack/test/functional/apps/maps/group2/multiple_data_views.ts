/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['maps']);

  describe('maps with multiple data views', () => {
    before(async () => {
      await security.testUser.setRoles(['global_maps_all', 'test_logstash_reader'], {
        skipBrowserRefresh: true,
      });
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await PageObjects.maps.gotoMapListingPage();
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('courier:ignoreFilterIfFieldNotInIndex');
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
    });

    it('should allow building a map with multiple data views', async () => {});

    it('ignores global filters on layers using a data view without the filter field by default', async () => {
      await filterBar.addFilter({ field: 'Carrier', operation: 'exists' });
    });

    it('applies global filters on layers using data view a without the filter field', async () => {
      await kibanaServer.uiSettings.update({ 'courier:ignoreFilterIfFieldNotInIndex': false });
    });
  });
}
