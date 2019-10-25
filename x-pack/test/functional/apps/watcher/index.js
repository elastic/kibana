/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService, loadTestFile }) {
  const esArchiver = getService('esArchiver');
  describe('watcher app', function () {
    this.tags(['ciGroup1', 'smoke']);

    before(async () => {
      await esArchiver.load('empty_kibana');
      await esArchiver.loadIfNeeded('makelogs');
    });

    after(async () => {
      await esArchiver.unload('makelogs');
      await esArchiver.unload('empty_kibana');
    });

    loadTestFile(require.resolve('./threshold_watch_test'));
    loadTestFile(require.resolve('./advanced_watch_test'));
  });
}
