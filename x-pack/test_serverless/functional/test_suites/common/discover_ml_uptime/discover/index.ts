/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ loadTestFile, getPageObject }: FtrProviderContext) => {
  const svlCommonPage = getPageObject('svlCommonPage');

  describe('Discover alerting', function () {
    before(async function () {
      // TODO: Update with valid SAML role
      await svlCommonPage.loginWithRole('system_indices_superuser');
    });

    loadTestFile(require.resolve('./search_source_alert'));
  });
};
