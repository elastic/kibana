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
} from '../../../tasks/exceptions';
import { openExceptionFlyoutFromEmptyViewerPrompt } from '../../../tasks/rule_details';
import { getNewRule } from '../../../objects/rule';
import { cleanKibana } from '../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL, ruleDetailsUrl } from '../../../urls/navigation';
import {
  createListsIndex,
  waitForListsIndex,
  waitForValueListsModalToBeLoaded,
  openValueListsModal,
  deleteValueListsFile,
  importValueList,
  KNOWN_VALUE_LIST_FILES,
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

// Flaky on serverless
describe(
  'Use Value list in exception entry',
  { tags: ['@ess', '@serverless', '@brokenInServerless'] },
  () => {
    beforeEach(() => {
      cleanKibana();
      login();
      createListsIndex();
      cy.task('esArchiverLoad', { archiveName: 'exceptions' });
      importValueList(KNOWN_VALUE_LIST_FILES.TEXT, 'keyword');

      createRule(
        getNewRule({
          query: 'user.name:*',
          index: ['exceptions*'],
          exceptions_list: [],
          rule_id: '2',
          enabled: false,
        })
      ).then((rule) => visitWithoutDateRange(ruleDetailsUrl(rule.body.id, 'rule_exceptions')));
    });

    afterEach(() => {
      cy.task('esArchiverUnload', 'exceptions');
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
  }
);
