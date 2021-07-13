/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile, getService }) {
  const esArchiver = getService('esArchiver');

  describe('Maps endpoints', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/maps/data');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.unload('x-pack/test/functional/es_archives/maps/data');
    });

    describe('', () => {
      loadTestFile(require.resolve('./get_indexes_matching_pattern'));
      loadTestFile(require.resolve('./create_doc_source'));
      loadTestFile(require.resolve('./delete_feature'));
      loadTestFile(require.resolve('./index_data'));
      loadTestFile(require.resolve('./fonts_api'));
      loadTestFile(require.resolve('./index_settings'));
      loadTestFile(require.resolve('./migrations'));
      loadTestFile(require.resolve('./get_tile'));
      loadTestFile(require.resolve('./get_grid_tile'));
      loadTestFile(require.resolve('./proxy_api'));
    });
  });
}
