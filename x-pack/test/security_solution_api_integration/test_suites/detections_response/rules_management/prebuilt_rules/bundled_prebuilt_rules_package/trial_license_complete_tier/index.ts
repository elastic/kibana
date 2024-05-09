/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Rules Management - Prebuilt Rules - Bundled Prebuilt Rules Package', function () {
    loadTestFile(require.resolve('./install_latest_bundled_prebuilt_rules'));
    loadTestFile(require.resolve('./prerelease_packages'));
  });
};
