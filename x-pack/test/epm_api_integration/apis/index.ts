/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('EPM Endpoints', function () {
    this.tags('ciGroup7');

    const dockerServers = getService('dockerServers');
    const log = getService('log');
    if (!dockerServers.isEnabled('registry')) {
      log.warning('skipping EPM Endpoints tests because registry docker server is disabled');
      return;
    }

    loadTestFile(require.resolve('./list'));
    // loadTestFile(require.resolve('./file'));
    // temporarily disabled, see https://github.com/elastic/kibana/issues/67943
    // loadTestFile(require.resolve('./template'));
    // loadTestFile(require.resolve('./ilm'));
  });
}
