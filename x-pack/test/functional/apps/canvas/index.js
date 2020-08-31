/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function canvasApp({ loadTestFile, getService }) {
  const security = getService('security');
  const esArchiver = getService('esArchiver');

  describe('Canvas app', function canvasAppTestSuite() {
    before(async () => {
      // init data
      await security.testUser.setRoles(['test_logstash_reader', 'global_canvas_all']);
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    this.tags('ciGroup2'); // CI requires tags ヽ(゜Q。)ノ？
    loadTestFile(require.resolve('./smoke_test'));
    loadTestFile(require.resolve('./expression'));
    loadTestFile(require.resolve('./custom_elements'));
    loadTestFile(require.resolve('./feature_controls/canvas_security'));
    loadTestFile(require.resolve('./feature_controls/canvas_spaces'));
  });
}
