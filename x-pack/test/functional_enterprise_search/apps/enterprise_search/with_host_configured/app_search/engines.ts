/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Browser } from '@kbn/ftr-common-functional-ui-services';
import { AppSearchService, IEngine } from '../../../../services/app_search_service';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function enterpriseSearchSetupEnginesTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const browser = getService('browser') as Browser;
  const retry = getService('retry');
  const appSearch = getService('appSearch') as AppSearchService;
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['appSearch', 'security']);

  describe('Engines Overview', function () {
    let engine1: IEngine;
    let engine2: IEngine;
    let metaEngine: IEngine;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      engine1 = await appSearch.createEngine();
      engine2 = await appSearch.createEngine();
      metaEngine = await appSearch.createMetaEngine([engine1.name, engine2.name]);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      appSearch.destroyEngine(engine1.name);
      appSearch.destroyEngine(engine2.name);
      appSearch.destroyEngine(metaEngine.name);
    });

    describe('when an enterpriseSearch.host is configured', () => {
      it('navigating to the enterprise_search plugin will redirect a user to the App Search Engines Overview page', async () => {
        await PageObjects.security.forceLogout();
        const { user, password } = appSearch.getEnterpriseSearchUser();
        await PageObjects.security.login(user, password, {
          expectSpaceSelector: false,
        });

        await PageObjects.appSearch.navigateToPage();
        await retry.try(async function () {
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.contain('/app_search');

          const documentTitle = await browser.getTitle();
          expect(documentTitle).to.contain('App Search - Elastic');
        });
      });

      it('lists engines', async () => {
        const engineLinks = await PageObjects.appSearch.getEngineLinks();
        const engineLinksText = await Promise.all(engineLinks.map((l) => l.getVisibleText()));

        expect(engineLinksText.includes(engine1.name)).to.equal(true);
        expect(engineLinksText.includes(engine2.name)).to.equal(true);
      });

      it('lists meta engines', async () => {
        const metaEngineLinks = await PageObjects.appSearch.getMetaEngineLinks();
        const metaEngineLinksText = await Promise.all(
          metaEngineLinks.map((l) => l.getVisibleText())
        );
        expect(metaEngineLinksText.includes(metaEngine.name)).to.equal(true);
      });
    });
  });
}
