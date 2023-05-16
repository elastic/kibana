/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from './test_users';

export default function ({ loadTestFile, getService }) {
  // total runtime ~ 4m
  describe('Fleet Endpoints', function () {
    before(async () => {
      await setupTestUsers(getService('security'));
    });

    // Fleet setup
    loadTestFile(require.resolve('./fleet_setup')); // ~ 6s

    loadTestFile(require.resolve('./policy_secrets')); // ~40s

    loadTestFile(require.resolve('./enrollment_api_keys/crud')); // ~ 20s

    // Data Streams
    loadTestFile(require.resolve('./data_streams')); // ~ 20s

    // Settings
    loadTestFile(require.resolve('./settings')); // ~ 7s

    // Service tokens
    loadTestFile(require.resolve('./service_tokens')); // ~ 2s

    // Outputs
    loadTestFile(require.resolve('./outputs')); // ~ 1m 30s

    // Download sources
    loadTestFile(require.resolve('./download_sources')); // ~ 15s

    // Telemetry
    loadTestFile(require.resolve('./fleet_telemetry')); // ~ 30s

    // Integrations
    loadTestFile(require.resolve('./integrations')); // ~ 8s

    // Fleet server hosts
    loadTestFile(require.resolve('./fleet_server_hosts/crud')); // ~ 9s

    // Fleet proxies
    loadTestFile(require.resolve('./fleet_proxies/crud')); // ~ 20s
  });
}
