/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');

  describe('management', function () {
    before(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/makelogs');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/makelogs');
    });

    loadTestFile(require.resolve('./data_views/_data_view_create_delete'));
    loadTestFile(require.resolve('./data_views/_runtime_fields'));
    loadTestFile(require.resolve('./data_views/_runtime_fields_composite'));
    loadTestFile(require.resolve('./data_views/_exclude_index_pattern'));
    loadTestFile(require.resolve('./data_views/_edit_field'));
  });
}
