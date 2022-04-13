/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: PluginFunctionalProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('embedded Lens examples', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      ); // need at least one index pattern
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
      );
    });

    describe('', function () {
      this.tags(['ciGroup4', 'skipFirefox']);

      loadTestFile(require.resolve('./embedded_example'));
    });
  });
}
