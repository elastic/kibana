/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function loadTests({ loadTestFile }) {
  describe('EPM Endpoints', () => {
    loadTestFile(require.resolve('./list'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./file'));
    //loadTestFile(require.resolve('./template'));
    loadTestFile(require.resolve('./ilm'));
    loadTestFile(require.resolve('./install_overrides'));
    loadTestFile(require.resolve('./install_prerelease'));
    loadTestFile(require.resolve('./install_remove_assets'));
    loadTestFile(require.resolve('./install_update'));
    loadTestFile(require.resolve('./update_assets'));
    loadTestFile(require.resolve('./data_stream'));
    loadTestFile(require.resolve('./package_install_complete'));
  });
}
