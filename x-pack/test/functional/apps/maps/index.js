/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile, getService }) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('maps app', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('maps/data');
      await esArchiver.load('maps/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
      });
      await browser.setWindowSize(1600, 1000);
    });

    after(async () => {
      await esArchiver.unload('maps/data');
      await esArchiver.unload('maps/kibana');
    });

    describe('', function () {
      this.tags('ciGroup7');
      loadTestFile(require.resolve('./documents_source'));
      loadTestFile(require.resolve('./blended_vector_layer'));
      loadTestFile(require.resolve('./vector_styling'));
      loadTestFile(require.resolve('./saved_object_management'));
      loadTestFile(require.resolve('./sample_data'));
      loadTestFile(require.resolve('./feature_controls/maps_security'));
      loadTestFile(require.resolve('./feature_controls/maps_spaces'));
      loadTestFile(require.resolve('./full_screen_mode'));
    });

    describe('', function () {
      this.tags('ciGroup10');
      loadTestFile(require.resolve('./es_geo_grid_source'));
      loadTestFile(require.resolve('./es_pew_pew_source'));
      loadTestFile(require.resolve('./joins'));
      loadTestFile(require.resolve('./add_layer_panel'));
      loadTestFile(require.resolve('./import_geojson'));
      loadTestFile(require.resolve('./layer_errors'));
      loadTestFile(require.resolve('./embeddable'));
      loadTestFile(require.resolve('./visualize_create_menu'));
      loadTestFile(require.resolve('./discover'));
    });
  });
}
