/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import {
  settingsObjectId,
  settingsObjectType,
} from '../../../../plugins/synthetics/server/lib/saved_objects/uptime_settings';

const ARCHIVE = 'x-pack/test/functional/es_archives/uptime/full_heartbeat';

export const deleteUptimeSettingsObject = async (server: any) => {
  // delete the saved object
  try {
    await server.savedObjects.delete({
      type: settingsObjectType,
      id: settingsObjectId,
    });
  } catch (e) {
    // a 404 just means the doc is already missing
    if (e.response.status !== 404) {
      const { status, statusText, data, headers, config } = e.response;
      throw new Error(
        `error attempting to delete settings:\n${JSON.stringify(
          { status, statusText, data, headers, config },
          null,
          2
        )}`
      );
    }
  }
};

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const server = getService('kibanaServer');
  const uptime = getService('uptime');

  describe('Uptime app', function () {
    this.tags('ciGroup10');

    beforeEach('delete settings', async () => {
      await deleteUptimeSettingsObject(server);
    });

    describe('with generated data', () => {
      beforeEach('load heartbeat data', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/uptime/blank');
      });
      afterEach('unload', async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/uptime/blank');
      });

      loadTestFile(require.resolve('./locations'));
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
