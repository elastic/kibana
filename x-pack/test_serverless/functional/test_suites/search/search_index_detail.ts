/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from "../../ftr_provider_context";

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'embeddedConsole',
    'svlSearchIndexDetailPage',
  ]);
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const indexName = 'test-my-index';


  describe('search index detail page', () =>{
    before(async ()=>{
      await pageObjects.svlCommonPage.loginWithRole('viewer');
      await es.indices.create({ index: indexName });
    })

    after(async () => {
      await esDeleteAllIndices(indexName);
    })
    it('loads index detail page', async () =>{
      await pageObjects.svlSearchIndexDetailPage.expectToBeIndexDetailPage();
      await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
      await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPage();
      await pageObjects.svlSearchIndexDetailPage.expectBackToIndicesButtonExists();

    });
  })
}
