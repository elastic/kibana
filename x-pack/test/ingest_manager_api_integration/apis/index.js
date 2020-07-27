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
    loadTestFile(require.resolve('./epm/list'));
    loadTestFile(require.resolve('./epm/file'));
    //loadTestFile(require.resolve('./epm/template'));
    loadTestFile(require.resolve('./epm/ilm'));
    loadTestFile(require.resolve('./epm/install_overrides'));
    loadTestFile(require.resolve('./epm/install_remove_assets'));

    // Package configs
    loadTestFile(require.resolve('./package_config/create'));
    loadTestFile(require.resolve('./package_config/update'));
    // Agent config
    loadTestFile(require.resolve('./agent_config/index'));
  });
}
