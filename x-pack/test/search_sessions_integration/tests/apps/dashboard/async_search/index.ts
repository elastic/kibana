/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile, getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);
  const searchSessions = getService('searchSessions');

  describe('Dashboard', function () {
    this.tags('ciGroup5');

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/dashboard/async_search');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await kibanaServer.uiSettings.replace({ 'search:timeout': 10000 });
      await PageObjects.common.navigateToApp('dashboard');
    });

    beforeEach(async () => {
      await searchSessions.markTourDone();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/dashboard/async_search');
    });

    loadTestFile(require.resolve('./async_search'));
    loadTestFile(require.resolve('./save_search_session'));
    loadTestFile(require.resolve('./save_search_session_relative_time'));
    loadTestFile(require.resolve('./search_sessions_tour'));
    loadTestFile(require.resolve('./sessions_in_space'));
  });
}
