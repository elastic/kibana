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
    'searchQueryRules',
    'embeddedConsole',
    'common',
  ]);
  const browser = getService('browser');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('Serverless Query Rules Overview', function () {
    before(async () => {
      await kibanaServer.uiSettings.update({ 'queryRules:queryRulesEnabled': 'true' });
      await pageObjects.svlCommonPage.loginWithRole('developer');
    });
    beforeEach(async () => {
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'searchQueryRules',
      });
    });
    describe('Query Rules get started Page', () => {
      it('is loaded successfully', async () => {
        await pageObjects.searchQueryRules.QueryRulesGetStartedPage.expectQueryRulesGetStartedPageComponentsToExist();
      });
      it('should be able to create a new test query rules set', async () => {
        await pageObjects.searchQueryRules.QueryRulesGetStartedPage.clickCreateQueryRulesSetButton();
        await pageObjects.searchQueryRules.QueryRulesGetStartedPage.setQueryRulesSetName(
          'test-query-ruleset'
        );
        await pageObjects.searchQueryRules.QueryRulesGetStartedPage.clickSaveButton();
      });
    });
  });
}
