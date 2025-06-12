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
    QueryRulesGetStartedPage: {
      TEST_IDS: {
        GET_STARTED_BUTTON: 'searchQueryRulesEmptyPromptGetStartedButton',
        CREATE_QUERY_RULES_SET_MODAL_INPUT: 'searchRulesetCreateRulesetModalFieldText',
        CREATE_QUERY_RULES_SET_MODAL_CREATE_BUTTON: 'searchRulesetCreateRulesetModalCreateButton',
      },
      async expectQueryRulesGetStartedPageComponentsToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.GET_STARTED_BUTTON);
      },
      async clickCreateQueryRulesSetButton() {
        await testSubjects.click(this.TEST_IDS.GET_STARTED_BUTTON);
      },
      async setQueryRulesSetName(name: string) {
        await testSubjects.setValue(this.TEST_IDS.CREATE_QUERY_RULES_SET_MODAL_INPUT, name);
      },
      async clickSaveButton() {
        await testSubjects.click(this.TEST_IDS.CREATE_QUERY_RULES_SET_MODAL_CREATE_BUTTON);
      },
    },
  };
}
