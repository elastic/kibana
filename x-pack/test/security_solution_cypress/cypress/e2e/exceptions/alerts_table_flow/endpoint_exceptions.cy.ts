/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../tags';

import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  expandFirstAlert,
  goToClosedAlertsOnRuleDetailsPage,
  openAddEndpointExceptionFromAlertActionButton,
  openAddEndpointExceptionFromFirstAlert,
  waitForAlerts,
} from '../../../tasks/alerts';
import { login, visitWithoutDateRange } from '../../../tasks/login';
import { getEndpointRule } from '../../../objects/rule';
import { goToRuleDetails } from '../../../tasks/alerts_detection_rules';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/create_new_rule';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../urls/navigation';
import {
  addExceptionEntryFieldValueAndSelectSuggestion,
  addExceptionEntryFieldValueValue,
  addExceptionFlyoutItemName,
  editExceptionFlyoutItemName,
  selectCloseSingleAlerts,
  submitNewExceptionItem,
  validateExceptionConditionField,
} from '../../../tasks/exceptions';
import { ALERTS_COUNT } from '../../../screens/alerts';
import {
  ADD_AND_BTN,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
} from '../../../screens/exceptions';
import { goToEndpointExceptionsTab } from '../../../tasks/rule_details';

describe(
  'Endpoint Exceptions workflows from Alert',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    const ITEM_NAME = 'Sample Exception List Item';
    const ITEM_NAME_EDIT = 'Sample Exception List Item';
    const ADDITIONAL_ENTRY = 'host.hostname';

    beforeEach(() => {
      cy.task('esArchiverUnload', 'endpoint');
      cy.task('esArchiverResetKibana');
      login();
      deleteAlertsAndRules();
      cy.task('esArchiverLoad', 'endpoint');
      createRule(getEndpointRule());
      visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
      goToRuleDetails();
      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();
    });

    after(() => {
      cy.task('esArchiverUnload', 'endpoint');
    });

    it('Should be able to create and close single Endpoint exception from overflow menu', () => {
      // The Endpoint will populated with predefined fields
      openAddEndpointExceptionFromFirstAlert();

      // As the endpoint.alerts-* is used to trigger the alert the
      // file.Ext.code_signature will be auto-populated
      validateExceptionConditionField('file.Ext.code_signature');

      selectCloseSingleAlerts();
      addExceptionFlyoutItemName(ITEM_NAME);
      submitNewExceptionItem();

      // Instead of immediately checking if the Opened Alert has moved to the closed tab,
      // use the waitForAlerts method to create a buffer, allowing the alerts some time to
      // be moved to the Closed Alert tab.
      waitForAlerts();

      // Closed alert should appear in table
      goToClosedAlertsOnRuleDetailsPage();
      cy.get(ALERTS_COUNT).should('exist');
    });

    it('Should be able to create Endpoint exception from Alerts take action button, and change multiple exception items without resetting to initial auto-prefilled entries', () => {
      // Open first Alert Summary
      expandFirstAlert();

      // The Endpoint should populated with predefined fields
      openAddEndpointExceptionFromAlertActionButton();

      // As the endpoint.alerts-* is used to trigger the alert the
      // file.Ext.code_signature will be auto-populated
      validateExceptionConditionField('file.Ext.code_signature');
      addExceptionFlyoutItemName(ITEM_NAME);

      cy.get(ADD_AND_BTN).click();
      // edit conditions
      addExceptionEntryFieldValueAndSelectSuggestion(ADDITIONAL_ENTRY, 6);
      addExceptionEntryFieldValueValue('foo', 4);

      // Change the name again
      editExceptionFlyoutItemName(ITEM_NAME_EDIT);

      // validate the condition is still "agent.name" or got rest after the name is changed
      validateExceptionConditionField(ADDITIONAL_ENTRY);

      selectCloseSingleAlerts();
      submitNewExceptionItem();

      // Endpoint Exception will move to Endpoint List under Exception tab of rule
      goToEndpointExceptionsTab();

      // new exception item displays
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', ITEM_NAME_EDIT);
      cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).contains('span', ADDITIONAL_ENTRY);
    });
  }
);
