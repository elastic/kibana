/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('async search', function () {
    this.tags('ciGroup3');

    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('dashboard/async_search');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await kibanaServer.uiSettings.replace({ 'search:timeout': 10000 });
    });

    after(async () => {
      await esArchiver.unload('dashboard/async_search');
    });

    loadTestFile(require.resolve('./async_search'));
    loadTestFile(require.resolve('./send_to_background'));
    loadTestFile(require.resolve('./send_to_background_relative_time'));
    loadTestFile(require.resolve('./sessions_in_space'));
  });
}
