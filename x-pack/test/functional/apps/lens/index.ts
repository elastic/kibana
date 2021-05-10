/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context.d';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  describe('lens app', () => {
    before(async () => {
      log.debug('Starting lens before method');
      await browser.setWindowSize(1280, 800);
      await esArchiver.load('logstash_functional');
      await esArchiver.load('lens/basic');
    });

    after(async () => {
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('lens/basic');
    });

    describe('', function () {
      this.tags(['ciGroup4', 'skipFirefox']);

      loadTestFile(require.resolve('./smokescreen'));
      loadTestFile(require.resolve('./add_to_dashboard'));
      loadTestFile(require.resolve('./table'));
      loadTestFile(require.resolve('./runtime_fields'));
      loadTestFile(require.resolve('./dashboard'));
      loadTestFile(require.resolve('./persistent_context'));
      loadTestFile(require.resolve('./colors'));
      loadTestFile(require.resolve('./chart_data'));
      loadTestFile(require.resolve('./drag_and_drop'));
      loadTestFile(require.resolve('./lens_reporting'));
      loadTestFile(require.resolve('./lens_tagging'));

      // has to be last one in the suite because it overrides saved objects
      loadTestFile(require.resolve('./rollup'));
    });
  });
}
