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
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  const createTestRuleset = async (rulesetId: string) => {
    await es.transport.request({
      path: `_query_rules/${rulesetId}`,
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
  };

  const deleteTestRuleset = async (rulesetId: string) => {
    await es.transport.request({
      path: `_query_rules/${rulesetId}`,
      method: 'DELETE',
    });
  };

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
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.expectRuleFlyoutToExist();
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeDocumentIndexField(
          0,
          'my-index-000001'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeDocumentIdField(
          0,
          'W08XfZcBY'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeMetadataValues(0, 'pugs');
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeMetadataField(
          0,
          'my_query_field'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.clickUpdateButton();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageBackButtonToExist();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageSaveButtonToExist();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.clickQueryRulesDetailPageSaveButton();
      });
      after(async () => {
        try {
          await deleteTestRuleset('my-test-ruleset');
        } catch (error) {
          // Ignore errors if ruleset doesn't exist or cannot be deleted
        }
      });
    });

    describe('Adding a new ruleset in a non-empty deployment', () => {
      before(async () => {
        await createTestRuleset('my-test-ruleset');
      });
      it('should be able to create a new ruleset on top of an existing one', async () => {
        await pageObjects.searchQueryRules.QueryRulesManagementPage.expectQueryRulesTableToExist();
        await pageObjects.searchQueryRules.QueryRulesManagementPage.clickCreateQueryRulesRulesetButton();
        await pageObjects.searchQueryRules.QueryRulesCreateRulesetModal.setQueryRulesSetName(
          'my-test-ruleset-2'
        );
        await pageObjects.searchQueryRules.QueryRulesCreateRulesetModal.clickSaveButton();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageNavigated(
          'my-test-ruleset-2'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.expectRuleFlyoutToExist();
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeDocumentIndexField(
          0,
          'my-index-000001'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeDocumentIdField(
          0,
          'W08XfZcBY'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeMetadataValues(0, 'pugs');
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeMetadataField(
          0,
          'my_query_field'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.clickUpdateButton();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageBackButtonToExist();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageSaveButtonToExist();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.clickQueryRulesDetailPageSaveButton();
      });
      after(async () => {
        try {
          await deleteTestRuleset('my-test-ruleset');
        } catch (error) {
          // Ignore errors if ruleset doesn't exist or cannot be deleted
        }
        try {
          await deleteTestRuleset('my-test-ruleset-2');
        } catch (error) {
          // Ignore errors if ruleset doesn't exist or cannot be deleted
        }
      });
    });
    describe('Deleting a query ruleset from the ruleset details page', () => {
      before(async () => {
        await createTestRuleset('my-test-ruleset');
      });
      it('should be able to delete an existing ruleset and render the empty state', async () => {
        await pageObjects.searchQueryRules.QueryRulesManagementPage.expectQueryRulesTableToExist();
        await pageObjects.searchQueryRules.QueryRulesManagementPage.clickRuleset('my-test-ruleset');
        await pageObjects.searchQueryRules.QueryRulesDetailPage.clickQueryRulesDetailPageActionsButton();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.clickQueryRulesDetailPageDeleteButton();
        await pageObjects.searchQueryRules.QueryRulesDeleteRulesetModal.clickAcknowledgeButton();
        await pageObjects.searchQueryRules.QueryRulesDeleteRulesetModal.clickConfirmDeleteModal();
        await pageObjects.searchQueryRules.QueryRulesEmptyPromptPage.expectQueryRulesEmptyPromptPageComponentsToExist();
      });
      after(async () => {
        try {
          await deleteTestRuleset('my-test-ruleset');
        } catch (error) {
          // Ignore errors if ruleset doesn't exist or cannot be deleted
        }
      });
    });
    describe('Deleting a query ruleset from the ruleset management page', () => {
      before(async () => {
        await createTestRuleset('my-test-ruleset');
      });
      it('should be able to delete an existing ruleset and render the empty state', async () => {
        await pageObjects.searchQueryRules.QueryRulesManagementPage.clickDeleteRulesetRow(0);
        await pageObjects.searchQueryRules.QueryRulesDeleteRulesetModal.clickAcknowledgeButton();
        await pageObjects.searchQueryRules.QueryRulesDeleteRulesetModal.clickConfirmDeleteModal();
        await pageObjects.searchQueryRules.QueryRulesEmptyPromptPage.expectQueryRulesEmptyPromptPageComponentsToExist();
      });
    });
    describe('Editing a query ruleset with document pinning/exclude', () => {
      before(async () => {
        await createTestRuleset('my-test-ruleset');
      });
      it('should edit the document id and the criteria field', async () => {
        await pageObjects.searchQueryRules.QueryRulesManagementPage.expectQueryRulesTableToExist();
        await pageObjects.searchQueryRules.QueryRulesManagementPage.clickRuleset('my-test-ruleset');
        await pageObjects.searchQueryRules.QueryRulesDetailPage.clickEditRulesetRule(0);
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.expectRuleFlyoutToExist();
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeDocumentIdField(
          0,
          'W08XfZcBYqFvZsDKwTp4'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.clickActionTypePinned();
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.clickActionTypeExclude();
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeMetadataField(
          0,
          'my_query_field'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.clickUpdateButton();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.clickQueryRulesDetailPageSaveButton();
      });
      after(async () => {
        try {
          await deleteTestRuleset('my-test-ruleset');
        } catch (error) {
          // Ignore errors if ruleset doesn't exist or cannot be deleted
        }
      });
    });
  });
}
