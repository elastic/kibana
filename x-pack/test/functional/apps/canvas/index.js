/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function canvasApp({ loadTestFile, getService }) {
  const security = getService('security');
  const esArchiver = getService('esArchiver');

  describe('Canvas app', function canvasAppTestSuite() {
    before(async () => {
      // init data
      await security.testUser.setRoles([
        'test_logstash_reader',
        'global_canvas_all',
        'global_discover_all',
        'global_maps_all',
        // TODO: Fix permission check, save and return button is disabled when dashboard is disabled
        'global_dashboard_all',
      ]);
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    this.tags('ciGroup2'); // CI requires tags ヽ(゜Q。)ノ？
    loadTestFile(require.resolve('./smoke_test'));
    loadTestFile(require.resolve('./expression'));
    loadTestFile(require.resolve('./filters'));
    loadTestFile(require.resolve('./custom_elements'));
    loadTestFile(require.resolve('./feature_controls/canvas_security'));
    loadTestFile(require.resolve('./feature_controls/canvas_spaces'));
    loadTestFile(require.resolve('./embeddables/lens'));
    loadTestFile(require.resolve('./embeddables/maps'));
    loadTestFile(require.resolve('./embeddables/saved_search'));
    loadTestFile(require.resolve('./embeddables/visualization'));
    loadTestFile(require.resolve('./reports'));
    loadTestFile(require.resolve('./saved_object_resolve'));
  });
}
