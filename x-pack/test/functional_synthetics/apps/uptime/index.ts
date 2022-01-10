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
} from '../../../../plugins/uptime/server/lib/saved_objects/uptime_settings';

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
    beforeEach('delete settings', async () => {
      await deleteUptimeSettingsObject(server);
    });

    describe('with generated data', () => {
      loadTestFile(require.resolve('./synthetics_integration'));
    });
  });
};
