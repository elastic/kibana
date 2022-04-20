/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile, getService }) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const supertest = getService('supertest');

  describe('maps app', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/maps.json'
      );
      // Functional tests verify behavior when referenced index pattern saved objects can not be found.
      // However, saved object import fails when reference saved objects can not be found.
      // To prevent import errors, index pattern saved object references exist during import
      // but are then deleted afterwards to enable testing of missing reference index pattern saved objects.

      log.info('Delete index pattern');
      log.debug('id: ' + 'idThatDoesNotExitForESGeoGridSource');
      log.debug('id: ' + 'idThatDoesNotExitForESSearchSource');
      log.debug('id: ' + 'idThatDoesNotExitForESJoinSource');
      await supertest
        .delete('/api/index_patterns/index_pattern/' + 'idThatDoesNotExitForESGeoGridSource')
        .set('kbn-xsrf', 'true')
        .expect(200);

      await supertest
        .delete('/api/index_patterns/index_pattern/' + 'idThatDoesNotExitForESSearchSource')
        .set('kbn-xsrf', 'true')
        .expect(200);

      await supertest
        .delete('/api/index_patterns/index_pattern/' + 'idThatDoesNotExitForESJoinSource')
        .set('kbn-xsrf', 'true')
        .expect(200);

      await esArchiver.load('x-pack/test/functional/es_archives/maps/data');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'c698b940-e149-11e8-a35a-370a8516603a',
      });
      await browser.setWindowSize(1600, 1000);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/maps/data');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/maps.json'
      );
    });

    describe('', async function () {
      this.tags('ciGroup9');
      loadTestFile(require.resolve('./documents_source'));
      loadTestFile(require.resolve('./blended_vector_layer'));
      loadTestFile(require.resolve('./vector_styling'));
      loadTestFile(require.resolve('./saved_object_management'));
      loadTestFile(require.resolve('./sample_data'));
      loadTestFile(require.resolve('./auto_fit_to_bounds'));
      loadTestFile(require.resolve('./layer_visibility'));
      loadTestFile(require.resolve('./feature_controls/maps_security'));
      loadTestFile(require.resolve('./feature_controls/maps_spaces'));
      loadTestFile(require.resolve('./full_screen_mode'));
    });

    describe('', function () {
      this.tags('ciGroup22');
      loadTestFile(require.resolve('./es_geo_grid_source'));
      loadTestFile(require.resolve('./embeddable'));
    });

    describe('', function () {
      this.tags('ciGroup2'); // same group used in x-pack/test/reporting_functional
      loadTestFile(require.resolve('./reports'));
    });

    describe('', function () {
      this.tags('ciGroup10');
      loadTestFile(require.resolve('./es_pew_pew_source'));
      loadTestFile(require.resolve('./joins'));
      loadTestFile(require.resolve('./mvt_joins'));
      loadTestFile(require.resolve('./mapbox_styles'));
      loadTestFile(require.resolve('./mvt_scaling'));
      loadTestFile(require.resolve('./mvt_geotile_grid'));
      loadTestFile(require.resolve('./add_layer_panel'));
      loadTestFile(require.resolve('./file_upload'));
      loadTestFile(require.resolve('./layer_errors'));
      loadTestFile(require.resolve('./visualize_create_menu'));
      loadTestFile(require.resolve('./discover'));
      loadTestFile(require.resolve('./geofile_wizard_auto_open'));
      loadTestFile(require.resolve('./lens'));
    });
  });
}
