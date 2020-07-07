/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('Ingest Manager Endpoints', function () {
    this.tags('ciGroup7');

    // EPM
    loadTestFile(require.resolve('./epm/list'));
    loadTestFile(require.resolve('./epm/file'));
    //loadTestFile(require.resolve('./epm/template'));
    loadTestFile(require.resolve('./epm/ilm'));
    loadTestFile(require.resolve('./epm/install'));

    // Package configs
    loadTestFile(require.resolve('./package_config/create'));
  });
}
