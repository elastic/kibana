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
    this.tags('ciGroup3');

    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('maps/data');
      await esArchiver.load('maps/kibana');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'UTC',
        'defaultIndex': 'logstash-*'
      });
      await kibanaServer.uiSettings.disableToastAutohide();
      browser.setWindowSize(1600, 1000);

    });

    after(async () => {
      await esArchiver.unload('maps/data');
      await esArchiver.unload('maps/kibana');
    });

    loadTestFile(require.resolve('./saved_object_management'));
    loadTestFile(require.resolve('./sample_data'));
    loadTestFile(require.resolve('./es_search_source'));
    loadTestFile(require.resolve('./es_geo_grid_source'));
    loadTestFile(require.resolve('./joins'));
    loadTestFile(require.resolve('./layer_errors'));
  });
}
