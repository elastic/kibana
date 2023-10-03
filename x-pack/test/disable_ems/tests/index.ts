/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('disable Elastic Maps Service', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load('x-pack/test/disable_ems/kbn_archive.json');
      await browser.setWindowSize(1600, 1000);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/maps/data');
      await kibanaServer.importExport.unload('x-pack/test/disable_ems/kbn_archive.json');
    });

    loadTestFile(require.resolve('./fonts'));
  });
}
