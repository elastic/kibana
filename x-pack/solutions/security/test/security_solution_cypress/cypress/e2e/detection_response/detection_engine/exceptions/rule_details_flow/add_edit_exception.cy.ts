/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getException, getExceptionList } from '../../../../../objects/exception';
import { getNewRule } from '../../../../../objects/rule';

import { createRule } from '../../../../../tasks/api_calls/rules';
import { login } from '../../../../../tasks/login';
import {
  addExceptionFlyoutFromViewerHeader,
  openEditException,
  openExceptionFlyoutFromEmptyViewerPrompt,
  removeException,
  searchForExceptionItem,
  visitRuleDetailsPage,
} from '../../../../../tasks/rule_details';
import {
  addExceptionFlyoutItemName,
  editException,
  editExceptionFlyoutItemName,
  selectAddToRuleRadio,
  selectSharedListToAddExceptionTo,
  submitEditedExceptionItem,
  submitNewExceptionItem,
  addExceptionEntryFieldValueOfItemX,
  addExceptionEntryFieldValueValue,
} from '../../../../../tasks/exceptions';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  NO_EXCEPTIONS_SEARCH_RESULTS_PROMPT,
  CLOSE_ALERTS_CHECKBOX,
  CONFIRM_BTN,
  ADD_TO_SHARED_LIST_RADIO_INPUT,
  EXCEPTION_ITEM_CONTAINER,
  VALUES_MATCH_ANY_INPUT,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  FIELD_INPUT_PARENT,
} from '../../../../../screens/exceptions';
import {
  createExceptionList,
  createExceptionListItem,
  deleteExceptionLists,
} from '../../../../../tasks/api_calls/exceptions';

describe('Add/edit exception from rule details', { tags: ['@ess', '@serverless'] }, () => {
  const FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD = 'agent.name';
  const ITEM_FIELD = 'unique_value.test';

  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'exceptions' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteExceptionLists();
  });

  describe('existing list and items', () => {
    const exceptionList = getExceptionList();
    beforeEach(() => {
      // create rule with exceptions
      createExceptionList(exceptionList, exceptionList.list_id).then((response) => {
        createExceptionListItem(exceptionList.list_id, {
          list_id: exceptionList.list_id,
          item_id: 'simple_list_item',
          tags: [],
          type: 'simple',
          description: 'Test exception item 2',
          name: 'Sample Exception List Item 2',
          namespace_type: 'single',
          entries: [
            {
              field: ITEM_FIELD,
              operator: 'included',
              type: 'match_any',
              value: ['foo'],
            },
          ],
        });

        createRule(
          getNewRule({
            query: 'agent.name:*',
            index: ['exceptions*'],
            exceptions_list: [
              {
                id: response.body.id,
                list_id: exceptionList.list_id,
                type: exceptionList.type,
                namespace_type: exceptionList.namespace_type,
              },
            ],
            rule_id: '2',
          })
        ).then((rule) => visitRuleDetailsPage(rule.body.id, { tab: 'rule_exceptions' }));
      });
    });

    it('can edit an exception item', () => {
      const NEW_ITEM_NAME = 'Exception item-EDITED';
      const ITEM_NAME = 'Sample Exception List Item 2';

      // displays existing exception items
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', ITEM_NAME);
      cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should('have.text', ' unique_value.testis one of foo');

      // open edit exception modal
      openEditException();

      // edit exception item name
      editExceptionFlyoutItemName(NEW_ITEM_NAME);

      // check that the existing item's field is being populated
      cy.get(EXCEPTION_ITEM_CONTAINER)
        .eq(0)
        .find(FIELD_INPUT_PARENT)
        .eq(0)
        .should('have.value', ITEM_FIELD);
      cy.get(VALUES_MATCH_ANY_INPUT).should('have.text', 'foo');

      // edit conditions
      editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

      // submit
      submitEditedExceptionItem();

      // new exception item displays
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

      // check that updates stuck
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', NEW_ITEM_NAME);
      cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should('have.text', ' agent.nameIS foo');
    });

    it('displays no exceptions prompt when exceptions are removed', () => {
      // displays existing exception items
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

      // when removing exception and again, no more exist, empty screen shows again
      removeException();
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');
    });

    describe('rule with existing shared exceptions', () => {
      it('Creates an exception item to add to shared list', () => {
        // displays existing exception items
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');

        // open add exception modal
        addExceptionFlyoutFromViewerHeader();

        // add exception item conditions
        addExceptionEntryFieldValueOfItemX(`${getException().field}{downarrow}{enter}`, 0, 0);
        addExceptionEntryFieldValueValue(getException().value, 0);

        // Name is required so want to check that submit is still disabled
        cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

        // add exception item name
        addExceptionFlyoutItemName('My item name');

        // select to add exception item to a shared list
        selectSharedListToAddExceptionTo(1);

        // not testing close alert functionality here, just ensuring that the options appear as expected
        cy.get(CLOSE_ALERTS_CHECKBOX).should('exist');
        cy.get(CLOSE_ALERTS_CHECKBOX).should('not.have.attr', 'disabled');

        // submit
        submitNewExceptionItem();

        // new exception item displays
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 2);
      });

      it('Creates an exception item to add to rule only', () => {
        // displays existing exception items
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');

        // open add exception modal
        addExceptionFlyoutFromViewerHeader();

        // add exception item conditions
        addExceptionEntryFieldValueOfItemX(`${getException().field}{downarrow}{enter}`, 0, 0);
        addExceptionEntryFieldValueValue(getException().value, 0);

        // Name is required so want to check that submit is still disabled
        cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

        // add exception item name
        addExceptionFlyoutItemName('My item name');

        // select to add exception item to rule only
        selectAddToRuleRadio();

        // not testing close alert functionality here, just ensuring that the options appear as expected
        cy.get(CLOSE_ALERTS_CHECKBOX).should('exist');
        cy.get(CLOSE_ALERTS_CHECKBOX).should('not.have.attr', 'disabled');

        // submit
        submitNewExceptionItem();

        // new exception item displays
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 2);
      });

      // Trying to figure out with EUI why the search won't trigger
      it('Can search for items', () => {
        // displays existing exception items
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');

        // can search for an exception value
        searchForExceptionItem('foo');

        // new exception item displays
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

        // displays empty search result view if no matches found
        searchForExceptionItem('abc');

        // new exception item displays
        cy.get(NO_EXCEPTIONS_SEARCH_RESULTS_PROMPT).should('exist');
      });
    });
  });

  describe('rule without existing exceptions', () => {
    beforeEach(() => {
      createRule(
        getNewRule({
          query: 'agent.name:*',
          index: ['exceptions*'],
          interval: '1m',
          rule_id: 'rule_testing',
        })
      ).then((rule) => visitRuleDetailsPage(rule.body.id, { tab: 'rule_exceptions' }));
    });

    afterEach(() => {
      cy.task('esArchiverUnload', { archiveName: 'exceptions_2' });
    });

    it('Cannot create an item to add to rule but not shared list as rule has no lists attached', () => {
      // when no exceptions exist, empty component shows with action to add exception
      cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

      // open add exception modal
      openExceptionFlyoutFromEmptyViewerPrompt();

      // add exception item conditions
      addExceptionEntryFieldValueOfItemX(`agent.name{downarrow}{enter}`, 0, 0);
      addExceptionEntryFieldValueValue('foo', 0);

      // Name is required so want to check that submit is still disabled
      cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

      // add exception item name
      addExceptionFlyoutItemName('My item name');

      // select to add exception item to rule only
      selectAddToRuleRadio();

      // Check that add to shared list is disabled, should be unless
      // rule has shared lists attached to it already
      cy.get(ADD_TO_SHARED_LIST_RADIO_INPUT).should('have.attr', 'disabled');

      // submit
      submitNewExceptionItem();

      // new exception item displays
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
    });
  });
});
