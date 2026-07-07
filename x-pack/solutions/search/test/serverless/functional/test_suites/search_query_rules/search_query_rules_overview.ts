/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

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
  const retry = getService('retry');

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

  const createTestIndex = async (indexName: string, docId: string) => {
    await es.transport.request({
      path: `${indexName}/_doc/${docId}`,
      method: 'PUT',
      body: {
        title: 'Pugs are the best',
      },
    });
  };

  const deleteTestIndex = async (indexName: string) => {
    await es.transport.request({
      path: indexName,
      method: 'DELETE',
    });
  };

  describe('Serverless Query Rules Overview', function () {
    before(async () => {
      try {
        await deleteTestRuleset('my-test-ruleset');
      } catch (error) {
        // Ignore errors if ruleset doesn't exist or cannot be deleted
      }
      await pageObjects.svlCommonPage.loginWithRole('developer');
      await createTestIndex('my-index-000001', 'W08XfZcBY');
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('searchQueryRules');
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
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeDocumentIdField(
          0,
          'W08XfZcBY'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeDocumentIndexField(
          0,
          'my-index-000001'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeMetadataValues(0, 'pugs');
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.changeMetadataField(
          0,
          'my_query_field'
        );
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.expectUpdateButtonIsEnabled();
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.clickUpdateButton();
        await pageObjects.searchQueryRules.QueryRulesRuleFlyout.expectRuleFlyoutNotToExist();
        // expect flyout to be closed
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageBackButtonToExist();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.expectQueryRulesDetailPageSaveButtonToExist();
        await pageObjects.searchQueryRules.QueryRulesDetailPage.clickQueryRulesDetailPageSaveButton();

        // give time for the ruleset to be created
        await pageObjects.common.sleep(400);
        await browser.navigateTo('about:blank');
        await pageObjects.common.navigateToApp('searchQueryRules');
        await pageObjects.searchQueryRules.QueryRulesManagementPage.expectQueryRulesTableToExist();
      });
    });

    describe('Adding a new ruleset in a non-empty deployment', () => {
      before(async () => {
        await pageObjects.common.navigateToApp('searchQueryRules');
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

        // give time for the ruleset to be created
        await pageObjects.common.sleep(400);
        await pageObjects.svlCommonNavigation.sidenav.clickLink({
          deepLinkId: 'searchQueryRules',
        });
        await pageObjects.searchQueryRules.QueryRulesManagementPage.expectQueryRulesTableToExist();
        await retry.try(async () => {
          const results =
            await pageObjects.searchQueryRules.QueryRulesManagementPage.getQueryRulesRulesetsList();
          expect(results.length).to.equal(2);
        });
      });
      after(async () => {
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
        await browser.navigateTo('about:blank');
        await pageObjects.common.navigateToApp('searchQueryRules');
      });
      after(async () => {
        try {
          await deleteTestRuleset('my-test-ruleset');
        } catch (error) {
          // Ignore errors if ruleset doesn't exist or cannot be deleted
        }
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
    });
    describe('Deleting a query ruleset from the ruleset management page', () => {
      before(async () => {
        await createTestRuleset('my-test-ruleset');
        await pageObjects.common.sleep(500);
        await browser.navigateTo('about:blank');
        await pageObjects.common.navigateToApp('searchQueryRules');
      });
      after(async () => {
        try {
          await deleteTestRuleset('my-test-ruleset');
        } catch (error) {
          // Ignore errors if ruleset doesn't exist or cannot be deleted
        }
      });
      it('should be able to delete an existing ruleset and render the empty state', async () => {
        await pageObjects.searchQueryRules.QueryRulesManagementPage.expectQueryRulesTableToExist();
        await pageObjects.searchQueryRules.QueryRulesManagementPage.clickDeleteRulesetRow(0);
        await pageObjects.searchQueryRules.QueryRulesDeleteRulesetModal.clickAcknowledgeButton();
        await pageObjects.searchQueryRules.QueryRulesDeleteRulesetModal.clickConfirmDeleteModal();
        await pageObjects.searchQueryRules.QueryRulesEmptyPromptPage.expectQueryRulesEmptyPromptPageComponentsToExist();
      });
    });
    describe('Editing a query ruleset with document pinning/exclude', () => {
      before(async () => {
        await createTestRuleset('my-test-ruleset');
        await pageObjects.common.sleep(500);
        await browser.navigateTo('about:blank');
        await pageObjects.common.navigateToApp('searchQueryRules');
      });
      after(async () => {
        // give time for the ruleset to be deleted
        await pageObjects.common.sleep(500);
        await deleteTestRuleset('my-test-ruleset');
        await deleteTestIndex('my-index-000001');
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
    });
    describe('Pagination', () => {
      before(async () => {
        for (let i = 1; i <= 26; i++) {
          await createTestRuleset(`ruleset-${i}`);
        }
        await browser.navigateTo('about:blank');
        await pageObjects.common.navigateToApp('searchQueryRules');
      });
      it('should paginate through the rulesets', async () => {
        await pageObjects.searchQueryRules.QueryRulesManagementPage.expectQueryRulesTableToExist();

        const results =
          await pageObjects.searchQueryRules.QueryRulesManagementPage.getQueryRulesRulesetsList();
        expect(results.length).to.equal(25);

        await pageObjects.searchQueryRules.QueryRulesManagementPage.clickPaginationNext();
        const nextResults =
          await pageObjects.searchQueryRules.QueryRulesManagementPage.getQueryRulesRulesetsList();
        expect(nextResults.length).to.equal(1);
        await pageObjects.searchQueryRules.QueryRulesManagementPage.clickPaginationPrevious();
        const previousResults =
          await pageObjects.searchQueryRules.QueryRulesManagementPage.getQueryRulesRulesetsList();
        expect(previousResults.length).to.equal(25);
      });
      after(async () => {
        // delete all created rulesets
        for (let i = 1; i <= 26; i++) {
          await deleteTestRuleset(`ruleset-${i}`);
        }
      });
    });
  });
}
