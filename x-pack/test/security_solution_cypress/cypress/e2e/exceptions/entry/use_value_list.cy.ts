/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import {
  addExceptionEntryFieldMatchIncludedValue,
  addExceptionEntryFieldValue,
  addExceptionEntryOperatorValue,
  addExceptionFlyoutItemName,
  submitNewExceptionItem,
} from '../../../tasks/exceptions';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import {
  goToExceptionsTab,
  openExceptionFlyoutFromEmptyViewerPrompt,
} from '../../../tasks/rule_details';
import { VALUE_LISTS_TABLE, VALUE_LISTS_ROW } from '../../../screens/lists';
import { getNewRule } from '../../../objects/rule';
import { cleanKibana } from '../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import {
  createListsIndex,
  waitForListsIndex,
  waitForValueListsModalToBeLoaded,
  selectValueListType,
  selectValueListsFile,
  uploadValueList,
  openValueListsModal,
  deleteValueListsFile,
  closeValueListsModal,
} from '../../../tasks/lists';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  CLOSE_ALERTS_CHECKBOX,
  EXCEPTIONS_TABLE_MODAL,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  NO_EXCEPTIONS_EXIST_PROMPT,
} from '../../../screens/exceptions';

const goToRulesAndOpenValueListModal = () => {
  visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
  waitForListsIndex();
  waitForValueListsModalToBeLoaded();
  openValueListsModal();
};

describe('Use Value list in exception entry', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    login();
    cy.task('esArchiverLoad', 'exceptions');
    createRule({
      ...getNewRule(),
      query: 'user.name:*',
      index: ['exceptions*'],
      exceptions_list: [],
      rule_id: '2',
    });
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
  });
  beforeEach(() => {
    createListsIndex();
  });

  afterEach(() => {
    cy.task('esArchiverUnload', 'exceptions');
  });

  it('Should use value list in exception entry, and validate deleting value list prompt', () => {
    const ITEM_NAME = 'Exception item with value list';
    const ITEM_FIELD = 'agent.name';

    goToRulesAndOpenValueListModal();

    // Add new value list of type keyword
    const listName = 'value_list.txt';
    selectValueListType('keyword');
    selectValueListsFile(listName);
    uploadValueList();

    cy.get(VALUE_LISTS_TABLE)
      .find(VALUE_LISTS_ROW)
      .should(($row) => {
        expect($row.text()).to.contain(listName);
        expect($row.text()).to.contain('Keywords');
      });
    closeValueListsModal();
    goToRuleDetails();
    goToExceptionsTab();

    // open add exception modal
    openExceptionFlyoutFromEmptyViewerPrompt();

    // add exception item name
    addExceptionFlyoutItemName(ITEM_NAME);

    addExceptionEntryFieldValue(ITEM_FIELD, 0);
    addExceptionEntryOperatorValue('is in list', 0);

    addExceptionEntryFieldMatchIncludedValue('value_list.txt', 0);

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

    deleteValueListsFile(listName);

    // Toast should be shown because of exception reference
    cy.get(EXCEPTIONS_TABLE_MODAL).should('exist');
  });
});
