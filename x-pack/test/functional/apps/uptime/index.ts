/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

const ARCHIVE = 'uptime/full_heartbeat';

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('Uptime app', function() {
    this.tags('ciGroup6');
    describe('with generated data', () => {
      beforeEach('load heartbeat data', async () => await esArchiver.load('uptime/blank'));
      afterEach('unload', async () => await esArchiver.unload('uptime/blank'));

      loadTestFile(require.resolve('./locations'));
      loadTestFile(require.resolve('./settings'));
    });
    describe('with real-world data', () => {
      before(async () => {
        await esArchiver.load(ARCHIVE);
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
      });
      after(async () => await esArchiver.unload(ARCHIVE));

      loadTestFile(require.resolve('./feature_controls'));
      loadTestFile(require.resolve('./overview'));
      loadTestFile(require.resolve('./monitor'));
    });
  });
};
