/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteEndpointExceptionList } from '../../../../../tasks/api_calls/exceptions';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import {
  expandFirstAlert,
  goToClosedAlertsOnRuleDetailsPage,
  openAddEndpointExceptionFromAlertActionButton,
  openAddEndpointExceptionFromFirstAlert,
  waitForAlerts,
} from '../../../../../tasks/alerts';
import { login } from '../../../../../tasks/login';
import { getEndpointRule } from '../../../../../objects/rule';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';
import {
  addExceptionEntryFieldValueAndSelectSuggestion,
  addExceptionEntryFieldValueValue,
  addExceptionFlyoutItemName,
  editExceptionFlyoutItemName,
  selectCloseSingleAlerts,
  submitNewExceptionItem,
  validateExceptionConditionField,
} from '../../../../../tasks/exceptions';
import { ALERTS_COUNT } from '../../../../../screens/alerts';
import {
  ADD_NESTED_BTN,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
} from '../../../../../screens/exceptions';
import {
  goToEndpointExceptionsTab,
  visitRuleDetailsPage,
  waitForTheRuleToBeExecuted,
} from '../../../../../tasks/rule_details';

// TODO: https://github.com/elastic/kibana/issues/161539
describe(
  'Endpoint Exceptions workflows from Alert',
  { tags: ['@ess', '@serverless', '@skipInServerless'] },
  () => {
    const ITEM_NAME = 'Sample Exception List Item';
    const ITEM_NAME_EDIT = 'Sample Exception List Item';
    const ADDITIONAL_ENTRY = 'host.hostname';

    beforeEach(() => {
      cy.task('esArchiverUnload', { archiveName: 'endpoint' });
      login();
      deleteAlertsAndRules();
      deleteEndpointExceptionList();

      cy.task('esArchiverLoad', { archiveName: 'endpoint' });
      createRule(getEndpointRule()).then((rule) =>
        visitRuleDetailsPage(rule.body.id, { tab: 'alerts' })
      );

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'endpoint' });
      deleteEndpointExceptionList();
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

      // Add non-nested condition
      cy.get(ADD_NESTED_BTN).click();
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
