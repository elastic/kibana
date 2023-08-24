/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { getNewRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import {
  openExceptionFlyoutFromEmptyViewerPrompt,
  goToExceptionsTab,
} from '../../../tasks/rule_details';
import {
  addExceptionFlyoutItemName,
  addTwoAndedConditions,
  addTwoORedConditions,
  submitNewExceptionItem,
} from '../../../tasks/exceptions';
import {
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
} from '../../../screens/exceptions';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';

describe(
  'Add multiple conditions and validate the generated exceptions',
  { tags: [tag.ESS, tag.SERVERLESS] },
  () => {
    beforeEach(() => {
      cy.task('esArchiverResetKibana');
      login();
      // At least create Rule with exceptions_list to be able to view created exceptions
      createRule({
        ...getNewRule(),
        query: 'agent.name:*',
        index: ['exceptions*'],
        exceptions_list: [],
        rule_id: '2',
      });
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      goToExceptionsTab();
    });

    after(() => {
      cy.task('esArchiverUnload', 'exceptions');
    });
    const exceptionName = 'My item name';

    it('Use multipe AND conditions and validate it generates one exception', () => {
      // open add exception modal
      openExceptionFlyoutFromEmptyViewerPrompt();

      // add exception item name
      addExceptionFlyoutItemName(exceptionName);

      // add  Two ANDed condition
      addTwoAndedConditions('agent.name', 'foo', '@timestamp', '123');

      submitNewExceptionItem();

      // Only one Exception should generated
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

      // validate the And operator is displayed correctly
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', exceptionName);
      cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).should(
        'have.text',
        ' agent.nameIS fooAND @timestampIS 123'
      );
    });

    it('Use multipe OR conditions and validate it generates multiple exceptions', () => {
      // open add exception modal
      openExceptionFlyoutFromEmptyViewerPrompt();

      // add exception item name
      addExceptionFlyoutItemName(exceptionName);

      // exception item 1
      // add  Two ORed condition
      addTwoORedConditions('agent.name', 'foo', '@timestamp', '123');

      submitNewExceptionItem();

      // Two Exceptions should be generated
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 2);

      // validate the details of the first exception
      cy.get(EXCEPTION_CARD_ITEM_NAME).eq(0).should('have.text', exceptionName);
    });
  }
);
