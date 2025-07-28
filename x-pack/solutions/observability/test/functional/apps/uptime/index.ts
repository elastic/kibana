/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

const ARCHIVE = 'x-pack/test/functional/es_archives/uptime/full_heartbeat';

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const uptime = getService('uptime');

  describe('Uptime app', function () {
    beforeEach('delete settings', async () => {
      await uptime.common.deleteUptimeSettingsObject();
    });

    describe('with generated data', () => {
      beforeEach('load heartbeat data', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/uptime/blank');
      });
      afterEach('unload', async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/uptime/blank');
      });

      loadTestFile(require.resolve('./settings'));
      loadTestFile(require.resolve('./certificates'));
    });

    describe('with real-world data', () => {
      before(async () => {
        await esArchiver.unload(ARCHIVE);
        await esArchiver.load(ARCHIVE);
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
        await uptime.navigation.goToUptime();
      });
      after(async () => await esArchiver.unload(ARCHIVE));

      loadTestFile(require.resolve('./overview'));
      loadTestFile(require.resolve('./ml_anomaly'));
      loadTestFile(require.resolve('./feature_controls'));
    });

    describe('mappings error state', () => {
      loadTestFile(require.resolve('./missing_mappings'));
    });
  });
};
