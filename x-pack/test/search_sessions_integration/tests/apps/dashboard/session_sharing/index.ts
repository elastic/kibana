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

  describe('Search session sharing', function () {
    this.tags('ciGroup5');

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('dashboard');
    });

    loadTestFile(require.resolve('./lens'));
  });
}
