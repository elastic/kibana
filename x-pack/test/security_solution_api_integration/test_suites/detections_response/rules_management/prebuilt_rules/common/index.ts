/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Rules Management - Prebuilt Rules (Common tests)', function () {
    this.tags('skipFIPS');
    loadTestFile(require.resolve('./import_export'));
    loadTestFile(require.resolve('./install_prebuilt_rules'));
    loadTestFile(require.resolve('./status'));
    loadTestFile(require.resolve('./revert_prebuilt_rules'));
  });
};
