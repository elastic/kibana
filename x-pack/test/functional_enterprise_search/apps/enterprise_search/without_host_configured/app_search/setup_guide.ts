/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function enterpriseSearchSetupGuideTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');

  const PageObjects = getPageObjects(['appSearch']);

  describe('Setup Guide', function () {
    before(async () => await esArchiver.load('empty_kibana'));
    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('when no enterpriseSearch.host is configured', () => {
      it('navigating to the plugin will redirect a user to the setup guide', async () => {
        await PageObjects.appSearch.navigateToPage();
        await retry.try(async function () {
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain('/app_search/setup_guide');
        });
      });
    });
  });
}
