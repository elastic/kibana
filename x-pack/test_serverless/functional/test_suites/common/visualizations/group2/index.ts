/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ loadTestFile, getPageObject }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');

  // FLAKY: https://github.com/elastic/kibana/issues/168985
  describe.skip('Visualizations - Group 2', function () {
    before(async () => {
      await svlCommonPage.login();
    });

    after(async () => {
      await svlCommonPage.forceLogout();
    });

    loadTestFile(require.resolve('./open_in_lens/agg_based'));
  });
};
