/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addExceptionEntryFieldMatchIncludedValue,
  addExceptionEntryFieldValue,
  addExceptionEntryOperatorValue,
  addExceptionFlyoutItemName,
  submitNewExceptionItem,
} from '../../../../../tasks/exceptions';
import {
  openExceptionFlyoutFromEmptyViewerPrompt,
  visitRuleDetailsPage,
} from '../../../../../tasks/rule_details';
import { getNewRule } from '../../../../../objects/rule';
import { login } from '../../../../../tasks/login';
import { visit } from '../../../../../tasks/navigation';
import { RULES_MANAGEMENT_URL } from '../../../../../urls/rules_management';
import {
  createListsIndex,
  waitForListsIndex,
  waitForValueListsModalToBeLoaded,
  openValueListsModal,
  deleteValueListsFile,
  importValueList,
  KNOWN_VALUE_LIST_FILES,
  deleteValueLists,
} from '../../../../../tasks/lists';
import { createRule } from '../../../../../tasks/api_calls/rules';
import {
  CLOSE_ALERTS_CHECKBOX,
  EXCEPTIONS_TABLE_MODAL,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  NO_EXCEPTIONS_EXIST_PROMPT,
} from '../../../../../screens/exceptions';

const goToRulesAndOpenValueListModal = () => {
  visit(RULES_MANAGEMENT_URL);
  waitForListsIndex();
  waitForValueListsModalToBeLoaded();
  openValueListsModal();
};

// FLAKY: https://github.com/elastic/kibana/issues/171252
describe.skip('Use Value list in exception entry', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'exceptions' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
  });
  beforeEach(() => {
    login();
    deleteValueLists([KNOWN_VALUE_LIST_FILES.TEXT]);
    createListsIndex();
    importValueList(KNOWN_VALUE_LIST_FILES.TEXT, 'keyword');

    createRule(
      getNewRule({
        query: 'user.name:*',
        index: ['exceptions*'],
        exceptions_list: [],
        rule_id: '2',
        enabled: false,
      })
    ).then((rule) => visitRuleDetailsPage(rule.body.id, { tab: 'rule_exceptions' }));
  });

  it('Should use value list in exception entry, and validate deleting value list prompt', () => {
    const ITEM_NAME = 'Exception item with value list';
    const ITEM_FIELD = 'agent.name';

    // open add exception modal
    openExceptionFlyoutFromEmptyViewerPrompt();

    // add exception item name
    addExceptionFlyoutItemName(ITEM_NAME);

    addExceptionEntryFieldValue(ITEM_FIELD, 0);
    addExceptionEntryOperatorValue('is in list', 0);

    addExceptionEntryFieldMatchIncludedValue(KNOWN_VALUE_LIST_FILES.TEXT, 0);

    // The Close all alerts that match attributes in this exception option is disabled
    cy.get(CLOSE_ALERTS_CHECKBOX).should('exist');
    cy.get(CLOSE_ALERTS_CHECKBOX).should('have.attr', 'disabled');

    // Create exception
    submitNewExceptionItem();

    // displays existing exception items
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
    cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', ITEM_NAME);
    cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should(
      'have.text',
      ` ${ITEM_FIELD}included in value_list.txt`
    );

    // Go back to value list to delete the existing one
    goToRulesAndOpenValueListModal();

    deleteValueListsFile(KNOWN_VALUE_LIST_FILES.TEXT);

    // Toast should be shown because of exception reference
    cy.get(EXCEPTIONS_TABLE_MODAL).should('exist');
  });
});
