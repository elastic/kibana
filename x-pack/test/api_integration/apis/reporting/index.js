/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile, getService }) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('reporting', () => {
    before(async () => {
      await esArchiver.load('../../../../test/functional/fixtures/es_archiver/dashboard/current/kibana');
      await esArchiver.load('../../../../test/functional/fixtures/es_archiver/dashboard/current/data');

      await kibanaServer.uiSettings.update({
        'dateFormat:tz': 'UTC',
        'defaultIndex': '0bf35f60-3dc9-11e8-8660-4d65aa086b3c'
      });
    });

    after(async () => {
      await esArchiver.unload('../../../../test/functional/fixtures/es_archiver/dashboard/current/kibana');
      await esArchiver.unload('../../../../test/functional/fixtures/es_archiver/dashboard/current/data');
    });

    loadTestFile(require.resolve('./bwc_existing_indexes'));
    loadTestFile(require.resolve('./bwc_generation_urls'));
    // 6.3 urls currently being tested as part of the "bwc_existing_indexes" test suite. Reports are time consuming,
    // don't replicate tests if we don't need to, so no specific 6_3 url tests here.
    loadTestFile(require.resolve('./stats'));
  });
}
