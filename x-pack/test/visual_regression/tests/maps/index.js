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

  describe('maps app visual regression', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/maps/data');
      await esArchiver.load('x-pack/test/functional/es_archives/maps/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      await browser.setWindowSize(1600, 1000);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/maps/data');
      await esArchiver.unload('x-pack/test/functional/es_archives/maps/kibana');
    });

    this.tags('ciGroup10');
    loadTestFile(require.resolve('./vector_styling'));
  });
}
