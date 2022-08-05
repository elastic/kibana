/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function enterpriseSearchSetupGuideTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const browser = getService('browser');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['workplaceSearch']);

  describe('Setup Guide', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('when no enterpriseSearch.host is configured', () => {
      it('navigating to the plugin will redirect a user to the setup guide', async () => {
        await PageObjects.workplaceSearch.navigateToPage();
        await retry.try(async function () {
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain('/workplace_search/setup_guide');

          const documentTitle = await browser.getTitle();
          expect(documentTitle).to.contain('Setup Guide - Workplace Search - Elastic');
        });
      });
    });
  });
}
