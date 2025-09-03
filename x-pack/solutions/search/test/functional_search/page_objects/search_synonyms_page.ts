/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SearchSynonymsPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    SynonymsGetStartedPage: {
      TEST_IDS: {
        GET_STARTED_BUTTON: 'searchSynonymsEmptyPromptGetStartedButton',
        CREATE_SYNONYMS_SET_MODAL_INPUT: 'searchSynonymsCreateSynonymsSetModalFieldText',
        CREATE_SYNONYMS_SET_MODAL_CREATE_BUTTON: 'searchSynonymsCreateSynonymsSetModalCreateButton',
        CREATE_SYNONYMS_SET_MODAL_OVERWRITE_CHECKBOX:
          'searchSynonymsCreateSynonymsSetModalForceWrite',
      },
      async expectSynonymsGetStartedPageComponentsToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.GET_STARTED_BUTTON);
      },
      async clickCreateSynonymsSetButton() {
        await testSubjects.click(this.TEST_IDS.GET_STARTED_BUTTON);
      },
      async setSynonymsSetName(name: string) {
        await testSubjects.setValue(this.TEST_IDS.CREATE_SYNONYMS_SET_MODAL_INPUT, name);
      },
      async clickSaveButton() {
        await testSubjects.click(this.TEST_IDS.CREATE_SYNONYMS_SET_MODAL_CREATE_BUTTON);
      },
      async clickOverwriteCheckbox() {
        await testSubjects.click(this.TEST_IDS.CREATE_SYNONYMS_SET_MODAL_OVERWRITE_CHECKBOX);
      },
    },
    SynonymsSetsListPage: {
      TEST_IDS: {
        SYNONYMS_SET_TABLE: 'synonyms-set-table',
        SYNONYMS_SET_ITEM_NAME: 'synonyms-set-item-name',
        SYNONYMS_SET_ITEM_RULE_COUNT: 'synonyms-set-item-rule-count',
        PAGINATION_NEXT_BUTTON: 'pagination-button-next',
        PAGE_PREVIOUS_BUTTON: 'pagination-button-previous',
      },
      async getSynonymsSetsList() {
        const table = await testSubjects.find(this.TEST_IDS.SYNONYMS_SET_TABLE);
        const allRows = await table
          .findByTagName('tbody')
          .then((tbody) => tbody.findAllByTagName('tr'));

        return Promise.all(
          allRows.map(async (row) => {
            const $ = await row.parseDomContent();
            return {
              name: $.findTestSubject(this.TEST_IDS.SYNONYMS_SET_ITEM_NAME).text().trim(),
              ruleCount: Number(
                $.findTestSubject(this.TEST_IDS.SYNONYMS_SET_ITEM_RULE_COUNT).text()
              ),
            };
          })
        );
      },
      async clickSynonymsSet(name: string) {
        // find synonym set with name and click on it
        const table = await testSubjects.findAll(this.TEST_IDS.SYNONYMS_SET_ITEM_NAME);
        for (const item of table) {
          const text = await item.getVisibleText();
          if (text === name) {
            await item.click();
            return;
          }
        }
        throw new Error(`Synonyms set with name "${name}" not found`);
      },
      async expectSynonymsSetsListPageComponentsToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.SYNONYMS_SET_TABLE);
        await testSubjects.existOrFail(this.TEST_IDS.SYNONYMS_SET_ITEM_RULE_COUNT);
      },
      async clickPaginationNext() {
        await testSubjects.click(this.TEST_IDS.PAGINATION_NEXT_BUTTON);
      },
      async clickPaginationPrevious() {
        await testSubjects.click(this.TEST_IDS.PAGE_PREVIOUS_BUTTON);
      },
    },
    SynonymsSetDetailPage: {
      TEST_IDS: {
        EMPTY_RULES_CARDS_ADD_EQUIVALENT_RULE_BUTTON:
          'searchSynonymsSynonymsSetEmptyRulesCardsAddEquivalentRuleButton',
        EMPTY_RULES_CARDS_ADD_EXPLICIT_RULE_BUTTON:
          'searchSynonymsSynonymsSetEmptyRulesCardsAddExplicitRuleButton',
        TABLE_EXPAND_RULE_BUTTON: 'searchSynonymsColumnsButton',
        TABLE_FROM_RULES: 'synonyms-set-item-explicit-from',
        TABLE_TO_RULES: 'synonyms-set-item-explicit-to',
        TABLE_EQUIVALENT_RULES: 'synonyms-set-item-equivalent',
        RULE_ACTIONS_DELETE_BUTTON: 'searchSynonymsSynonymsSetTableDeleteRuleButton',
        RULE_ACTIONS_EDIT_BUTTON: 'searchSynonymsSynonymsSetTableEditRuleButton',
        ADD_NEW_RULE_BUTTON: 'searchSynonymsSynonymsSetRuleTableAddRuleButton',
      },
      async expectSynonymsSetDetailPageNavigated(name: string) {
        const h1Element = await find.byCssSelector('main header h1');
        const text = await h1Element.getVisibleText();
        if (text !== name) {
          throw new Error(`Expected page title to be "${name}" but got "${text}"`);
        }
      },

      async expectEmptyPromptToExist() {
        await testSubjects.existOrFail(this.TEST_IDS.EMPTY_RULES_CARDS_ADD_EQUIVALENT_RULE_BUTTON);
        await testSubjects.existOrFail(this.TEST_IDS.EMPTY_RULES_CARDS_ADD_EXPLICIT_RULE_BUTTON);
      },
      async getSynonymsRules() {
        const table = await testSubjects.find('synonyms-set-table');
        const allRows = await table
          .findByTagName('tbody')
          .then((tbody) => tbody.findAllByTagName('tr'));

        return Promise.all(
          allRows.map(async (row) => {
            const $ = await row.parseDomContent();
            if ($.findTestSubject('synonyms-set-item-explicit-from').length > 0) {
              return {
                synonyms: `${$.findTestSubject('synonyms-set-item-explicit-from')
                  .text()
                  .trim()} => ${$.findTestSubject('synonyms-set-item-explicit-to').text().trim()}`,
              };
            } else {
              return {
                synonyms: $.findTestSubject('synonyms-set-item-equivalent').text().trim(),
              };
            }
          })
        );
      },
      async clickCreateRuleButton() {
        await testSubjects.click(this.TEST_IDS.ADD_NEW_RULE_BUTTON);
      },
      async clickEquivalentRule() {
        await testSubjects.click(this.TEST_IDS.EMPTY_RULES_CARDS_ADD_EQUIVALENT_RULE_BUTTON);
      },
      async clickExplicitRule() {
        await testSubjects.click(this.TEST_IDS.EMPTY_RULES_CARDS_ADD_EXPLICIT_RULE_BUTTON);
      },
      async deleteRule(index: number) {
        const table = await testSubjects.find('synonyms-set-table');
        const allRows = await table
          .findByTagName('tbody')
          .then((tbody) => tbody.findAllByTagName('tr'));
        const deleteButton = await allRows[index].findByTestSubject(
          this.TEST_IDS.RULE_ACTIONS_DELETE_BUTTON
        );
        await deleteButton.click();
        await testSubjects.click('confirmModalConfirmButton');
      },
      async editRule(index: number) {
        const table = await testSubjects.find('synonyms-set-table');
        const allRows = await table
          .findByTagName('tbody')
          .then((tbody) => tbody.findAllByTagName('tr'));
        const editButton = await allRows[index].findByTestSubject(
          this.TEST_IDS.RULE_ACTIONS_EDIT_BUTTON
        );
        await editButton.click();
      },
    },
    SynonymRuleFlyout: {
      TEST_IDS: {
        FLYOUT_CLOSE_BUTTON: 'euiFlyoutCloseButton',
        FLYOUT_SAVE_BUTTON: 'searchSynonymsSynonymsRuleFlyoutSaveButton',
        FLYOUT_FROM_INPUT: 'searchSynonymsSynonymsRuleFlyoutFromTermsInput',
        FLYOUT_MAPTO_INPUT: 'searchSynonymsSynonymsRuleFlyoutMapToTermsInput',
        FLYOUT_FROM_BADGE: 'searchSynonymsSynonymsRuleFlyoutFromTermBadge',
      },
      async addFromSynonym(synonym: string) {
        await testSubjects.setValue(this.TEST_IDS.FLYOUT_FROM_INPUT, synonym);
        await testSubjects.setValue(this.TEST_IDS.FLYOUT_FROM_INPUT, '\uE007');
      },
      async addMapTo(synonym: string) {
        await testSubjects.setValue(this.TEST_IDS.FLYOUT_MAPTO_INPUT, synonym);
      },
      async clickSaveButton() {
        await testSubjects.click(this.TEST_IDS.FLYOUT_SAVE_BUTTON);
      },
      async removeSynonym(index: number) {
        // get the badges and click on the one with the index
        const badges = await testSubjects.findAll(this.TEST_IDS.FLYOUT_FROM_BADGE);
        if (index >= badges.length) {
          throw new Error(`Badge with index ${index} not found`);
        }
        const deleteButton = await badges[index].findByTagName('button');
        await deleteButton.click();
      },
    },
  };
}
