/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService, loadTestFile, getPageObjects }: FtrProviderContext) => {
  const browser = getService('browser');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['timePicker']);
  const remoteEsArchiver = getService('remoteEsArchiver');

  describe('CCS lens app', function () {
    this.tags(['ciGroup5', 'skipFirefox']);
    before(async () => {
      log.debug('Starting lens before method');
      await browser.setWindowSize(1280, 1200);
      await remoteEsArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      // changing the timepicker default here saves us from having to set it in Discover (~8s)
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: 'ftr-remote:logstash-*',
        'dateFormat:tz': 'UTC',
      });
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic_ccs.json'
      );
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/default_ccs'
      );
    });

    loadTestFile(require.resolve('./smokescreen_ccs'));

    after(async () => {
      await remoteEsArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/default'
      );
    });
  });
};
