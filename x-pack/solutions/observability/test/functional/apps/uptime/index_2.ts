/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

const ARCHIVE = 'x-pack/solutions/observability/test/fixtures/es_archives/uptime/full_heartbeat';

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const uptime = getService('uptime');

  describe('Uptime app (part 2)', function () {
    beforeEach('delete settings', async () => {
      await uptime.common.deleteUptimeSettingsObject();
    });

    describe('with real-world data (part 2)', () => {
      before(async () => {
        await esArchiver.unload(ARCHIVE);
        await esArchiver.load(ARCHIVE);
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'UTC' });
        await uptime.navigation.goToUptime();
      });
      after(async () => await esArchiver.unload(ARCHIVE));

      loadTestFile(require.resolve('./ml_anomaly'));
      loadTestFile(require.resolve('./feature_controls'));
    });

    describe('mappings error state', () => {
      loadTestFile(require.resolve('./missing_mappings'));
    });
  });
};
