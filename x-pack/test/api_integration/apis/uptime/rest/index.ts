/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  settingsObjectId,
  settingsObjectType,
} from '../../../../../plugins/uptime/server/lib/saved_objects';

export default function({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const server = getService('kibanaServer');

  describe('uptime REST endpoints', () => {
    beforeEach('clear settings', async () => {
      try {
        server.savedObjects.delete({
          type: settingsObjectType,
          id: settingsObjectId,
        });
      } catch (e) {
        // a 404 just means the doc is already missing
        if (e.statuscode !== 404) {
          throw new Error(
            `error attempting to delete settings (${e.statuscode}): ${JSON.stringify(e)}`
          );
        }
      }
    });

    describe('with generated data', () => {
      before('load heartbeat data', async () => await esArchiver.load('uptime/blank'));
      after('unload', async () => await esArchiver.unload('uptime/blank'));

      loadTestFile(require.resolve('./snapshot'));
      loadTestFile(require.resolve('./dynamic_settings'));
    });
    describe('with real-world data', () => {
      before('load heartbeat data', async () => await esArchiver.load('uptime/full_heartbeat'));
      after('unload', async () => await esArchiver.unload('uptime/full_heartbeat'));
      loadTestFile(require.resolve('./monitor_latest_status'));
      loadTestFile(require.resolve('./selected_monitor'));
      loadTestFile(require.resolve('./ping_histogram'));
      loadTestFile(require.resolve('./monitor_duration'));
      loadTestFile(require.resolve('./doc_count'));
    });
  });
}
