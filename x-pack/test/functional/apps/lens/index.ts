/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context.d';

// eslint-disable-next-line @typescript-eslint/no-namespace, import/no-default-export
export default function({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  describe('lens app', () => {
    before(async () => {
      log.debug('Starting lens before method');
      browser.setWindowSize(1280, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('lens/basic');
    });

    after(async () => {
      await esArchiver.unload('logstash_functional');
      await esArchiver.unload('visualize/default');
    });

    describe('', function() {
      this.tags(['ciGroup4', 'skipFirefox']);

      loadTestFile(require.resolve('./smokescreen'));
    });
  });
}
