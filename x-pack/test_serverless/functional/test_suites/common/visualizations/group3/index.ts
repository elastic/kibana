/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ loadTestFile, getPageObject }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');

  describe('Visualizations - Group 3', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
    });

    loadTestFile(require.resolve('./open_in_lens/tsvb'));
  });
};
