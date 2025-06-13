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
    QueryRulesDetailPage: {
      TEST_IDS: {
        RULESET_DETAILS_PAGE_BACK_BUTTON: 'queryRulesetDetailBackButton',
        RULESET_DETAILS_PAGE_SAVE_BUTTON: 'queryRulesetDetailHeaderSaveButton',
        RULESET_DETAILS_PAGE_HEADER: 'queryRulesetDetailHeader',
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
    },
    QueryRulesManagementPage: {
      TEST_IDS: {
        CREATE_RULESET_BUTTON: 'queryRulesOverviewCreateButton',
        QUERY_RULES_SET_TABLE: 'queryRulesSetTable',
      },
      async clickCreateQueryRulesRulesetButton() {
        await testSubjects.click(this.TEST_IDS.CREATE_RULESET_BUTTON);
      },
      async expectQueryRulesTableToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.QUERY_RULES_SET_TABLE);
      },
    },
  };
}
