/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SearchQueryRulesPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    QueryRulesEmptyPromptPage: {
      TEST_IDS: {
        GET_STARTED_BUTTON: 'searchQueryRulesEmptyPromptGetStartedButton',
      },
      async expectQueryRulesEmptyPromptPageComponentsToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.GET_STARTED_BUTTON);
      },
      async clickCreateQueryRulesSetButton() {
        await testSubjects.click(this.TEST_IDS.GET_STARTED_BUTTON);
      },
    },
    QueryRulesCreateRulesetModal: {
      TEST_IDS: {
        CREATE_QUERY_RULES_SET_MODAL_INPUT: 'searchRulesetCreateRulesetModalFieldText',
        CREATE_QUERY_RULES_SET_MODAL_CREATE_BUTTON: 'searchRulesetCreateRulesetModalCreateButton',
      },
      async setQueryRulesSetName(name: string) {
        await testSubjects.setValue(this.TEST_IDS.CREATE_QUERY_RULES_SET_MODAL_INPUT, name);
      },
      async clickSaveButton() {
        await testSubjects.click(this.TEST_IDS.CREATE_QUERY_RULES_SET_MODAL_CREATE_BUTTON);
      },
    },
    QueryRulesDeleteRulesetModal: {
      TEST_IDS: {
        DELETE_QUERY_RULES_RULESET_MODAL_DELETE_BUTTON:
          'searchRulesetDeleteRulesetModalDeleteButton',
        DELETE_QUERY_RULES_RULESET_MODAL_ACKNOWLEDGE_BUTTON: 'confirmDeleteRulesetCheckbox',
        DELETE_QUERY_RULES_RULESET_MODAL_CANCEL_BUTTON:
          'searchRulesetDeleteRulesetModalCancelButton',
      },
      async clickDeleteButton() {
        await testSubjects.click(this.TEST_IDS.DELETE_QUERY_RULES_RULESET_MODAL_DELETE_BUTTON);
      },
      async clickAcknowledgeButton() {
        await testSubjects.click(this.TEST_IDS.DELETE_QUERY_RULES_RULESET_MODAL_ACKNOWLEDGE_BUTTON);
      },
      async clickCancelButton() {
        await testSubjects.click(this.TEST_IDS.DELETE_QUERY_RULES_RULESET_MODAL_CANCEL_BUTTON);
      },
      async clickConfirmDeleteModal() {
        await testSubjects.click('confirmModalConfirmButton');
      },
    },
    QueryRulesDetailPage: {
      TEST_IDS: {
        RULESET_DETAILS_PAGE_BACK_BUTTON: 'queryRulesetDetailBackButton',
        RULESET_DETAILS_PAGE_SAVE_BUTTON: 'queryRulesetDetailHeaderSaveButton',
        RULESET_DETAILS_PAGE_HEADER: 'queryRulesetDetailHeader',
        RULESET_DETAILS_PAGE_ACTIONS_BUTTON: 'searchQueryRulesQueryRulesetActionsButton',
        RULESET_DETAILS_PAGE_DELETE_BUTTON: 'queryRulesetDetailDeleteButton',
      },
      async expectQueryRulesDetailPageNavigated(name: string) {
        const h1Element = await find.byCssSelector(
          `main header[data-test-subj="${this.TEST_IDS.RULESET_DETAILS_PAGE_HEADER}"] h1`
        );
        const text = await h1Element.getVisibleText();
        if (text !== name) {
          throw new Error(`Expected page title to be "${name}" but got "${text}"`);
        }
      },
      async expectQueryRulesDetailPageBackButtonToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.RULESET_DETAILS_PAGE_BACK_BUTTON);
      },
      async expectQueryRulesDetailPageSaveButtonToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.RULESET_DETAILS_PAGE_SAVE_BUTTON);
      },
      async clickQueryRulesDetailPageActionsButton() {
        await testSubjects.click(this.TEST_IDS.RULESET_DETAILS_PAGE_ACTIONS_BUTTON);
      },
      async clickQueryRulesDetailPageDeleteButton() {
        await testSubjects.click(this.TEST_IDS.RULESET_DETAILS_PAGE_DELETE_BUTTON);
      },
    },
    QueryRulesManagementPage: {
      TEST_IDS: {
        QUERY_RULES_RULESETS_TABLE: 'queryRulesSetTable',
        QUERY_RULES_ITEM_NAME: 'queryRuleSetName',
        QUERY_RULES_ITEM_RULE_COUNT: 'queryRuleSetItemRuleCount',
        QUERY_RULES_ITEM_ACTIONS_DELETE_BUTTON: 'queryRulesSetDeleteButton',
        CREATE_RULESET_BUTTON: 'queryRulesOverviewCreateButton',
        PAGINATION_NEXT_BUTTON: 'pagination-button-next',
        PAGINATION_PREVIOUS_BUTTON: 'pagination-button-previous',
      },
      async clickCreateQueryRulesRulesetButton() {
        await testSubjects.click(this.TEST_IDS.CREATE_RULESET_BUTTON);
      },
      async expectQueryRulesTableToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.QUERY_RULES_RULESETS_TABLE);
      },
      async getQueryRulesRulesetsList() {
        const table = await testSubjects.find(this.TEST_IDS.QUERY_RULES_RULESETS_TABLE);
        const allRows = await table
          .findByTagName('tbody')
          .then((tbody) => tbody.findAllByTagName('tr'));

        return Promise.all(
          allRows.map(async (row) => {
            const $ = await row.parseDomContent();
            return {
              name: $.findTestSubject(this.TEST_IDS.QUERY_RULES_ITEM_NAME).text().trim(),
              ruleCount: Number(
                $.findTestSubject(this.TEST_IDS.QUERY_RULES_ITEM_RULE_COUNT).text()
              ),
            };
          })
        );
      },
      async clickRuleset(name: string) {
        // find rulesets with name and click on it
        const table = await testSubjects.findAll(this.TEST_IDS.QUERY_RULES_ITEM_NAME);
        for (const item of table) {
          const text = await item.getVisibleText();
          if (text === name) {
            await item.click();
            return;
          }
        }
        throw new Error(`Ruleset with name "${name}" not found`);
      },
      async clickDeleteRulesetRow(index: number) {
        const table = await testSubjects.find(this.TEST_IDS.QUERY_RULES_RULESETS_TABLE);
        const allRows = await table
          .findByTagName('tbody')
          .then((tbody) => tbody.findAllByTagName('tr'));
        const deleteButton = await allRows[index].findByTestSubject(
          this.TEST_IDS.QUERY_RULES_ITEM_ACTIONS_DELETE_BUTTON
        );
        await deleteButton.click();
      },
      async expectQueryRulesListPageComponentsToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.QUERY_RULES_RULESETS_TABLE);
        await testSubjects.existOrFail(this.TEST_IDS.QUERY_RULES_ITEM_RULE_COUNT);
      },
      async clickPaginationNext() {
        await testSubjects.click(this.TEST_IDS.PAGINATION_NEXT_BUTTON);
      },
      async clickPaginationPrevious() {
        await testSubjects.click(this.TEST_IDS.PAGINATION_PREVIOUS_BUTTON);
      },
    },
  };
}
