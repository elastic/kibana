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

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const server = getService('kibanaServer');

  describe('uptime REST endpoints', () => {
    beforeEach('clear settings', async () => {
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
    });

    describe('with generated data', () => {
      beforeEach('load heartbeat data', async () => await esArchiver.loadIfNeeded('uptime/blank'));
      after('unload', async () => await esArchiver.unload('uptime/blank'));

      loadTestFile(require.resolve('./certs'));
      loadTestFile(require.resolve('./dynamic_settings'));
      loadTestFile(require.resolve('./snapshot'));
      loadTestFile(require.resolve('./monitor_states_generated'));
      loadTestFile(require.resolve('./telemetry_collectors'));
    });

    describe('with real-world data', () => {
      beforeEach('load heartbeat data', async () => await esArchiver.load('uptime/full_heartbeat'));
      afterEach('unload', async () => await esArchiver.unload('uptime/full_heartbeat'));
      loadTestFile(require.resolve('./monitor_latest_status'));
      loadTestFile(require.resolve('./ping_histogram'));
      loadTestFile(require.resolve('./ping_list'));
      loadTestFile(require.resolve('./monitor_duration'));
      loadTestFile(require.resolve('./doc_count'));
      loadTestFile(require.resolve('./monitor_states_real_data'));
    });
  });
}
