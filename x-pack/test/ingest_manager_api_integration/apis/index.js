/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('Ingest Manager Endpoints', function () {
    this.tags('ciGroup7');

    // Fleet
    loadTestFile(require.resolve('./fleet/index'));

    // EPM
    loadTestFile(require.resolve('./epm/index'));

    // Package configs
    loadTestFile(require.resolve('./package_config/create'));
    loadTestFile(require.resolve('./package_config/update'));
    loadTestFile(require.resolve('./package_config/get'));
    // Agent config
    loadTestFile(require.resolve('./agent_config/index'));
  });
}
