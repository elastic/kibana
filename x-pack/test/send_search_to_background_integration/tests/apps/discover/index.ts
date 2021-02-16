/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile, getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);
  const searchSessions = getService('searchSessions');

  describe('async search', function () {
    this.tags('ciGroup3');

    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('discover');
    });

    beforeEach(async () => {
      await searchSessions.markTourDone();
    });

    loadTestFile(require.resolve('./async_search'));
    loadTestFile(require.resolve('./sessions_in_space'));
  });
}
