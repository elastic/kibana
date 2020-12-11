/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('Fleet Endpoints', function () {
    this.tags('ciGroup10');
    // Fleet setup
    loadTestFile(require.resolve('./setup'));
    // Agent setup
    loadTestFile(require.resolve('./agents_setup'));
    // Agents
    loadTestFile(require.resolve('./agents/delete'));
    loadTestFile(require.resolve('./agents/list'));
    loadTestFile(require.resolve('./agents/enroll'));
    loadTestFile(require.resolve('./agents/unenroll'));
    loadTestFile(require.resolve('./agents/checkin'));
    loadTestFile(require.resolve('./agents/events'));
    loadTestFile(require.resolve('./agents/acks'));
    loadTestFile(require.resolve('./agents/complete_flow'));
    loadTestFile(require.resolve('./agents/actions'));
    loadTestFile(require.resolve('./agents/upgrade'));
    loadTestFile(require.resolve('./agents/reassign'));

    // Enrollement API keys
    loadTestFile(require.resolve('./enrollment_api_keys/crud'));

    // EPM
    loadTestFile(require.resolve('./epm/index'));

    // Package policies
    loadTestFile(require.resolve('./package_policy/create'));
    loadTestFile(require.resolve('./package_policy/update'));
    loadTestFile(require.resolve('./package_policy/get'));

    // Agent policies
    loadTestFile(require.resolve('./agent_policy/index'));

    // Settings
    loadTestFile(require.resolve('./settings/index'));
  });
}
