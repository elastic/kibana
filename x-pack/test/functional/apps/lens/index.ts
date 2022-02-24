/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('lens app', () => {
    before(async () => {
      log.debug('Starting lens before method');
      await browser.setWindowSize(1280, 1200);
      await esArchiver.load('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/lens/basic');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/default'
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.unload('x-pack/test/functional/es_archives/lens/basic');
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/lens/default'
      );
    });

    describe('', function () {
      this.tags(['ciGroup3', 'skipFirefox']);
      loadTestFile(require.resolve('./smokescreen'));
      loadTestFile(require.resolve('./persistent_context'));
    });

    describe('', function () {
      this.tags(['ciGroup16', 'skipFirefox']);

      loadTestFile(require.resolve('./add_to_dashboard'));
      loadTestFile(require.resolve('./table'));
      loadTestFile(require.resolve('./runtime_fields'));
      loadTestFile(require.resolve('./dashboard'));
    });

    describe('', function () {
      this.tags(['ciGroup4', 'skipFirefox']);

      loadTestFile(require.resolve('./colors'));
      loadTestFile(require.resolve('./chart_data'));
      loadTestFile(require.resolve('./time_shift'));
      loadTestFile(require.resolve('./drag_and_drop'));
      loadTestFile(require.resolve('./geo_field'));
      loadTestFile(require.resolve('./lens_reporting'));
      loadTestFile(require.resolve('./lens_tagging'));
      loadTestFile(require.resolve('./formula'));
      loadTestFile(require.resolve('./heatmap'));
      loadTestFile(require.resolve('./reference_lines'));
      loadTestFile(require.resolve('./inspector'));
      loadTestFile(require.resolve('./error_handling'));

      // has to be last one in the suite because it overrides saved objects
      loadTestFile(require.resolve('./rollup'));
    });
  });
}
