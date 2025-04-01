/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../../objects/rule';

import { createRule } from '../../../../../tasks/api_calls/rules';
import { login } from '../../../../../tasks/login';
import {
  openEditException,
  openExceptionFlyoutFromEmptyViewerPrompt,
  searchForExceptionItem,
  visitRuleDetailsPage,
  waitForPageToBeLoaded as waitForRuleDetailsPageToBeLoaded,
} from '../../../../../tasks/rule_details';
import {
  addExceptionConditions,
  addExceptionFlyoutItemName,
  editException,
  editExceptionFlyoutItemName,
  selectOs,
  submitEditedExceptionItem,
  submitNewExceptionItem,
} from '../../../../../tasks/exceptions';

import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  NO_EXCEPTIONS_SEARCH_RESULTS_PROMPT,
  CLOSE_ALERTS_CHECKBOX,
  CONFIRM_BTN,
  ADD_TO_RULE_OR_LIST_SECTION,
  CLOSE_SINGLE_ALERT_CHECKBOX,
  EXCEPTION_ITEM_CONTAINER,
  VALUES_INPUT,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  FIELD_INPUT_PARENT,
} from '../../../../../screens/exceptions';
import {
  createEndpointExceptionList,
  createEndpointExceptionListItem,
  deleteEndpointExceptionList,
  deleteExceptionLists,
} from '../../../../../tasks/api_calls/exceptions';

// https://github.com/elastic/kibana/issues/187279
describe(
  'Add endpoint exception from rule details',
  { tags: ['@ess', '@serverless, @skipInServerlessMKI'] },
  () => {
    const ITEM_NAME = 'Sample Exception List Item';
    const NEW_ITEM_NAME = 'Exception item-EDITED';
    const ITEM_FIELD = 'event.code';
    const FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD = 'agent.type';

    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
    });

    beforeEach(() => {
      deleteExceptionLists();
      deleteEndpointExceptionList();

      login();
      deleteAlertsAndRules();
    });

    describe('without exception items', () => {
      beforeEach(() => {
        createEndpointExceptionList().then((response) => {
          createRule(
            getNewRule({
              query: 'event.code:*',
              index: ['auditbeat*'],
              exceptions_list: [
                {
                  id: response.body.id,
                  list_id: response.body.list_id,
                  type: response.body.type,
                  namespace_type: response.body.namespace_type,
                },
              ],
              rule_id: '2',
              enabled: false,
            })
          ).then((rule) => visitRuleDetailsPage(rule.body.id, { tab: 'endpoint_exceptions' }));
        });
      });

      it('creates an exception item', () => {
        // when no exceptions exist, empty component shows with action to add exception

        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

        // open add exception modal
        openExceptionFlyoutFromEmptyViewerPrompt();

        // submit button is disabled if no paramerters were added
        cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

        // for endpoint exceptions, must specify OS
        selectOs('windows');

        // add exception item conditions
        addExceptionConditions({
          field: 'event.code',
          operator: 'is',
          values: ['foo'],
        });

        // Name is required so want to check that submit is still disabled
        cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

        // add exception item name
        addExceptionFlyoutItemName(ITEM_NAME);

        // Option to add to rule or add to list should NOT appear
        cy.get(ADD_TO_RULE_OR_LIST_SECTION).should('not.exist');

        // not testing close alert functionality here, just ensuring that the options appear as expected
        cy.get(CLOSE_SINGLE_ALERT_CHECKBOX).should('not.exist');
        cy.get(CLOSE_ALERTS_CHECKBOX).should('exist');

        // submit
        submitNewExceptionItem();

        // new exception item displays
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/179582
    describe.skip('with exception items', () => {
      beforeEach(() => {
        createEndpointExceptionList().then((response) => {
          createEndpointExceptionListItem({
            comments: [],
            description: 'Exception list item',
            entries: [
              {
                field: ITEM_FIELD,
                operator: 'included',
                type: 'match',
                value: 'foo',
              },
            ],
            name: ITEM_NAME,
            tags: [],
            type: 'simple',
            os_types: ['windows'],
          });

          createRule(
            getNewRule({
              name: 'Rule with exceptions',
              query: 'event.code:*',
              index: ['auditbeat*'],
              exceptions_list: [
                {
                  id: response.body.id,
                  list_id: response.body.list_id,
                  type: response.body.type,
                  namespace_type: response.body.namespace_type,
                },
              ],
              rule_id: '2',
              enabled: false,
            })
          ).then((rule) => {
            visitRuleDetailsPage(rule.body.id, { tab: 'endpoint_exceptions' });
            waitForRuleDetailsPageToBeLoaded('Rule with exceptions');
          });
        });
      });

      it('edits an endpoint exception item', () => {
        // displays existing exception items
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
        cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', ITEM_NAME);
        cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should('have.text', ` ${ITEM_FIELD}IS foo`);

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
        cy.get(VALUES_INPUT).should('have.value', 'foo');

        // edit conditions
        editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

        // submit
        submitEditedExceptionItem();

        // new exception item displays
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

        // check that updates stuck
        cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', NEW_ITEM_NAME);
        cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should('have.text', ' agent.typeIS foo');
      });

      it('allows user to search for items', () => {
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

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
  }
);
