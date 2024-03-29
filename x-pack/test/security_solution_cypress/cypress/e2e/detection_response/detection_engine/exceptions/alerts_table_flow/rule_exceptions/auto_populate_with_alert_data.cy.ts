/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LOADING_INDICATOR } from '../../../../../../screens/security_header';
import { getEndpointRule } from '../../../../../../objects/rule';
import { createRule } from '../../../../../../tasks/api_calls/rules';
import {
  addExceptionFromFirstAlert,
  expandFirstAlert,
  openAddRuleExceptionFromAlertActionButton,
} from '../../../../../../tasks/alerts';
import {
  addExceptionEntryFieldValue,
  addExceptionEntryFieldValueValue,
  addExceptionFlyoutItemName,
  submitNewExceptionItem,
  validateExceptionConditionField,
  validateExceptionCommentCountAndText,
  editExceptionFlyoutItemName,
  validateHighlightedFieldsPopulatedAsExceptionConditions,
  validateEmptyExceptionConditionField,
} from '../../../../../../tasks/exceptions';
import { login } from '../../../../../../tasks/login';
import { goToExceptionsTab, visitRuleDetailsPage } from '../../../../../../tasks/rule_details';

import { deleteAlertsAndRules } from '../../../../../../tasks/api_calls/common';
import {
  ADD_AND_BTN,
  ENTRY_DELETE_BTN,
  EXCEPTION_CARD_ITEM_CONDITIONS,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
} from '../../../../../../screens/exceptions';
import { waitForAlertsToPopulate } from '../../../../../../tasks/create_new_rule';

// TODO: https://github.com/elastic/kibana/issues/161539
// See https://github.com/elastic/kibana/issues/163967
describe.skip(
  'Auto populate exception with Alert data',
  { tags: ['@ess', '@serverless', '@brokenInServerless'] },
  () => {
    const ITEM_NAME = 'Sample Exception Item';
    const ITEM_NAME_EDIT = 'Sample Exception Item Edit';
    const ADDITIONAL_ENTRY = 'host.hostname';

    beforeEach(() => {
      cy.task('esArchiverUnload', { archiveName: 'endpoint' });
      cy.task('esArchiverLoad', { archiveName: 'endpoint' });
      login();
      createRule(getEndpointRule()).then((rule) => visitRuleDetailsPage(rule.body.id));

      waitForAlertsToPopulate();
    });
    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'endpoint' });
      deleteAlertsAndRules();
    });
    afterEach(() => {
      cy.task('esArchiverUnload', { archiveName: 'endpoint' });
    });

    it('Should create a Rule exception item from alert actions overflow menu and auto populate the conditions using alert Highlighted fields', () => {
      cy.get(LOADING_INDICATOR).should('not.exist');
      addExceptionFromFirstAlert();

      const highlightedFieldsBasedOnAlertDoc = [
        'host.name',
        'agent.id',
        'user.name',
        'process.executable',
        'file.path',
      ];

      /**
       * Validate the highlighted fields are auto populated, these
       * fields are based on the alert document that should be generated
       * when the endpoint rule runs
       */
      validateHighlightedFieldsPopulatedAsExceptionConditions(highlightedFieldsBasedOnAlertDoc);

      /**
       * Validate that the comments are opened by default with one comment added
       * showing a text contains information about the pre-filled conditions
       */
      validateExceptionCommentCountAndText(
        1,
        'Exception conditions are pre-filled with relevant data from an alert with the alert id (_id):'
      );

      addExceptionFlyoutItemName(ITEM_NAME);
      submitNewExceptionItem();
    });
    it('Should create a Rule exception from Alerts take action button and change multiple exception items without resetting to initial auto-prefilled entries', () => {
      cy.get(LOADING_INDICATOR).should('not.exist');

      // Open first Alert Summary
      expandFirstAlert();

      // The Rule exception should populated with highlighted fields
      openAddRuleExceptionFromAlertActionButton();

      const highlightedFieldsBasedOnAlertDoc = [
        'host.name',
        'agent.id',
        'user.name',
        'process.executable',
        'file.path',
      ];

      /**
       * Validate the highlighted fields are auto populated, these
       * fields are based on the alert document that should be generated
       * when the endpoint rule runs
       */
      validateHighlightedFieldsPopulatedAsExceptionConditions(highlightedFieldsBasedOnAlertDoc);

      /**
       * Validate that the comments are opened by default with one comment added
       * showing a text contains information about the pre-filled conditions
       */
      validateExceptionCommentCountAndText(
        1,
        'Exception conditions are pre-filled with relevant data from an alert with the alert id (_id):'
      );

      addExceptionFlyoutItemName(ITEM_NAME);

      cy.get(ADD_AND_BTN).click();

      // edit conditions
      addExceptionEntryFieldValue(ADDITIONAL_ENTRY, 5);
      addExceptionEntryFieldValueValue('foo', 5);

      // Change the name again
      editExceptionFlyoutItemName(ITEM_NAME_EDIT);

      // validate the condition is still 'host.hostname' or got rest after the name is changed
      validateExceptionConditionField(ADDITIONAL_ENTRY);

      submitNewExceptionItem();

      goToExceptionsTab();

      // new exception item displays
      cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);
      cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', ITEM_NAME_EDIT);
      cy.get(EXCEPTION_CARD_ITEM_CONDITIONS).contains('span', 'host.hostname');
    });
    it('Should delete all prefilled exception entries when creating a Rule exception from Alerts take action button without resetting to initial auto-prefilled entries', () => {
      cy.get(LOADING_INDICATOR).should('not.exist');

      // Open first Alert Summary
      expandFirstAlert();

      // The Rule exception should populated with highlighted fields
      openAddRuleExceptionFromAlertActionButton();

      const highlightedFieldsBasedOnAlertDoc = [
        'host.name',
        'agent.id',
        'user.name',
        'process.executable',
        'file.path',
      ];

      /**
       * Validate the highlighted fields are auto populated, these
       * fields are based on the alert document that should be generated
       * when the endpoint rule runs
       */
      validateHighlightedFieldsPopulatedAsExceptionConditions(highlightedFieldsBasedOnAlertDoc);

      /**
       * Delete all the highlighted fields to see if any condition
       * will prefuilled again.
       */
      const highlightedFieldsCount = highlightedFieldsBasedOnAlertDoc.length - 1;
      highlightedFieldsBasedOnAlertDoc.forEach((_, index) =>
        cy
          .get(ENTRY_DELETE_BTN)
          .eq(highlightedFieldsCount - index)
          .click()
      );

      /**
       * Validate that there are no highlighted fields are auto populated
       * after the deletion
       */
      validateEmptyExceptionConditionField();
    });
  }
);
