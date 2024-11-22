/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getPageObjects } = providerContext;
  const pageObjects = getPageObjects(['cisAddIntegration', 'header', 'svlCommonPage']);

  describe('Test Cloud Security Posture Integrations on Serverless', function () {
    this.tags(['skipMKI']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
    });

    beforeEach(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
      await cisIntegration.navigateToAddIntegrationCspmPage();
    });

    it('Integration installation form should not be available without required PLI', async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();
      const pliBlockExists = await cisIntegration.checkIntegrationPliAuthBlockExists();

      expect(pliBlockExists).to.be(true);
    });
  });
}
