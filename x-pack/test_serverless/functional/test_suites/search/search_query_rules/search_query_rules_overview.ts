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
    describe('Creating a query ruleset from an empty deployment', () => {
      it('is Empty State page loaded successfully', async () => {
        await pageObjects.searchQueryRules.QueryRulesEmptyPromptPage.expectQueryRulesEmptyPromptPageComponentsToExist();
      });
      it('should be able to create a new ruleset', async () => {
        await pageObjects.searchQueryRules.QueryRulesEmptyPromptPage.clickCreateQueryRulesSetButton();
        await pageObjects.searchQueryRules.QueryRulesCreateRulesetModal.setQueryRulesSetName(
          'my-test-ruleset'
        );
        await pageObjects.searchQueryRules.QueryRulesCreateRulesetModal.clickSaveButton();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageNavigated(
          'my-test-ruleset'
        );
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageBackButtonToExist();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageSaveButtonToExist();
        // Delete the ruleset created for this test
        await es.transport.request({
          path: '_query_rules/my-test-ruleset',
          method: 'DELETE',
        });
      });
    });
    describe('Adding a new ruleset in a non-empty deployment', () => {
      it('is rulesets management page loaded successfully', async () => {
        await es.transport.request({
          path: '_query_rules/my-test-ruleset',
          method: 'PUT',
          body: {
            rules: [
              {
                rule_id: 'rule1',
                type: 'pinned',
                criteria: [
                  {
                    type: 'fuzzy',
                    metadata: 'query_string',
                    values: ['puggles', 'pugs'],
                  },
                  {
                    type: 'exact',
                    metadata: 'user_country',
                    values: ['us'],
                  },
                ],
                actions: {
                  docs: [
                    {
                      _index: 'my-index-000001',
                      _id: 'id1',
                    },
                    {
                      _index: 'my-index-000002',
                      _id: 'id2',
                    },
                  ],
                },
              },
            ],
          },
        });
        await pageObjects.searchQueryRules.QueryRulesManagementPage.expectQueryRulesTableToExist();
      });

      it('should be able to create a new ruleset on top of an exidsting one', async () => {
        await pageObjects.searchQueryRules.QueryRulesManagementPage.clickCreateQueryRulesRulesetButton();
        await pageObjects.searchQueryRules.QueryRulesCreateRulesetModal.setQueryRulesSetName(
          'my-test-ruleset-2'
        );
        await pageObjects.searchQueryRules.QueryRulesCreateRulesetModal.clickSaveButton();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageNavigated(
          'my-test-ruleset-2'
        );
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageBackButtonToExist();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageSaveButtonToExist();
        // Delete the rulesets created for this test
        await es.transport.request({
          path: '_query_rules/my-test-ruleset',
          method: 'DELETE',
        });
        await es.transport.request({
          path: '_query_rules/my-test-ruleset-2',
          method: 'DELETE',
        });
      });
    });
  });
}
