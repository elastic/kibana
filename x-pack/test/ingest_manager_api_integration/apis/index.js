/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('Ingest Manager Endpoints', function () {
    this.tags('ciGroup7');
    // Ingest Manager setup
    loadTestFile(require.resolve('./setup'));
    // Fleet
    loadTestFile(require.resolve('./fleet/index'));

    // EPM
    loadTestFile(require.resolve('./epm/index'));

    // Package policies
    loadTestFile(require.resolve('./package_policy/create'));
    loadTestFile(require.resolve('./package_policy/update'));
    loadTestFile(require.resolve('./package_policy/get'));

    // Agent policies
    loadTestFile(require.resolve('./agent_policy/index'));
  });
}
