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

    // Enrollment API keys
    loadTestFile(require.resolve('./enrollment_api_keys/crud'));

    // Package policies
    loadTestFile(require.resolve('./policy_secrets'));
    loadTestFile(require.resolve('./package_policy/create'));
    loadTestFile(require.resolve('./package_policy/update'));
    loadTestFile(require.resolve('./package_policy/get'));
    loadTestFile(require.resolve('./package_policy/delete'));
    loadTestFile(require.resolve('./package_policy/upgrade'));
    loadTestFile(require.resolve('./package_policy/input_package_create_upgrade'));

    // Agent policies
    loadTestFile(require.resolve('./agent_policy'));
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
