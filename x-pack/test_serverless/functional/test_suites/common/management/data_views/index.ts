/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService, loadTestFile, getPageObject }: FtrProviderContext) => {
  describe('Data View Management', function () {
    const esArchiver = getService('esArchiver');
    const svlCommonPage = getPageObject('svlCommonPage');

    before(async () => {
      await svlCommonPage.loginAsAdmin();
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/makelogs');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/makelogs');
    });

    loadTestFile(require.resolve('./serverless'));
    loadTestFile(require.resolve('./_data_view_create_delete'));
    loadTestFile(require.resolve('./_runtime_fields'));
    loadTestFile(require.resolve('./_runtime_fields_composite'));
    loadTestFile(require.resolve('./_exclude_index_pattern'));
    loadTestFile(require.resolve('./_index_pattern_filter'));
    loadTestFile(require.resolve('./_edit_field'));
    loadTestFile(require.resolve('./_cache'));
  });
};
