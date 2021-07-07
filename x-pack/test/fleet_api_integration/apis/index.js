/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Fleet Endpoints', function () {
    // EPM
    loadTestFile(require.resolve('./epm/index'));

    // Fleet setup
    loadTestFile(require.resolve('./fleet_setup'));

    // Agents
    loadTestFile(require.resolve('./agents/delete'));
    loadTestFile(require.resolve('./agents/list'));
    loadTestFile(require.resolve('./agents/unenroll'));
    loadTestFile(require.resolve('./agents/actions'));
    loadTestFile(require.resolve('./agents/upgrade'));
    loadTestFile(require.resolve('./agents/reassign'));
    loadTestFile(require.resolve('./agents/status'));

    // Enrollment API keys
    loadTestFile(require.resolve('./enrollment_api_keys/crud'));

    // Package policies
    loadTestFile(require.resolve('./package_policy/create'));
    loadTestFile(require.resolve('./package_policy/update'));
    loadTestFile(require.resolve('./package_policy/get'));
    loadTestFile(require.resolve('./package_policy/delete'));

    // Agent policies
    loadTestFile(require.resolve('./agent_policy/index'));

    // Data Streams
    loadTestFile(require.resolve('./data_streams/index'));

    // Settings
    loadTestFile(require.resolve('./settings/index'));

    // Preconfiguration
    loadTestFile(require.resolve('./preconfiguration/index'));

    // Service tokens
    loadTestFile(require.resolve('./service_tokens'));

    // Outputs
    loadTestFile(require.resolve('./outputs'));

    // Telemetry
    loadTestFile(require.resolve('./fleet_telemetry'));
  });
}
