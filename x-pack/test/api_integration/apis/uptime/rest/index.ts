/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  describe('uptime REST endpoints', () => {
    describe('with generated data', () => {
      before('load heartbeat data', () => esArchiver.load('uptime/blank'));
      after('unload', () => esArchiver.unload('uptime/blank'));
      loadTestFile(require.resolve('./snapshot'));
    });
    describe('with real-world data', () => {
      before('load heartbeat data', () => esArchiver.load('uptime/full_heartbeat'));
      after('unload', () => esArchiver.unload('uptime/full_heartbeat'));
      loadTestFile(require.resolve('./monitor_latest_status'));
      loadTestFile(require.resolve('./selected_monitor'));
      loadTestFile(require.resolve('./ping_histogram'));
    });
  });
}
