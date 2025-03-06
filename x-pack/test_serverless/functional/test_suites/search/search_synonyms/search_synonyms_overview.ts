/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'searchSynonyms',
    'embeddedConsole',
    'common',
  ]);
  const browser = getService('browser');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('Serverless Synonyms Overview', function () {
    before(async () => {
      await kibanaServer.uiSettings.update({ 'searchSynonyms:synonymsEnabled': 'true' });
      await pageObjects.svlCommonPage.loginWithRole('admin');
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'searchSynonyms',
      });
    });
    describe('Synonyms get started Page', () => {
      it('is loaded successfully', async () => {
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.expectSynonymsGetStartedPageComponentsToExist();
      });
    });

    describe('synonyms sets list page', () => {
      before(async () => {
        await es.transport.request({
          path: '_synonyms/test',
          method: 'PUT',
          body: {
            synonyms_set: [
              {
                id: 'rule1',
                synonyms: 'a, b, c',
              },
              {
                id: 'rule2',
                synonyms: 'd, e, f',
              },
            ],
          },
        });
      });
      it('loads successfully', async () => {
        await browser.refresh();
        await pageObjects.searchSynonyms.SynonymsSetsListPage.expectSynonymsSetsListPageComponentsToExist();
      });
      after(async () => {
        await es.transport.request({
          path: '_synonyms/test',
          method: 'DELETE',
        });
      });
    });
  });
}
