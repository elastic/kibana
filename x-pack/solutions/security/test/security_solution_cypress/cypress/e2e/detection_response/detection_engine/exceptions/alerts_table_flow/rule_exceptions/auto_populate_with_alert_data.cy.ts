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
  editExceptionFlyoutItemName,
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

describe('Auto populate exception with Alert data', { tags: ['@ess', '@serverless'] }, () => {
  const ITEM_NAME = 'Sample Exception Item';
  const ITEM_NAME_EDIT = 'Sample Exception Item Edit';
  const ADDITIONAL_ENTRY = 'host.hostname';

  beforeEach(() => {
    cy.task('esArchiverUnload', { archiveName: 'endpoint_2' });
    cy.task('esArchiverLoad', { archiveName: 'endpoint_2' });
    login();
    createRule(getEndpointRule()).then((rule) =>
      visitRuleDetailsPage(rule.body.id, { tab: 'alerts' })
    );

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

    cy.intercept('POST', '/api/detection_engine/rules/*/exceptions').as('exception_creation');

    addExceptionFlyoutItemName(ITEM_NAME);
    submitNewExceptionItem();

    cy.wait('@exception_creation').then(({ response }) => {
      cy.wrap(response?.body[0].name).should('eql', ITEM_NAME);
      cy.wrap(response?.body[0].entries).should('eql', [
        {
          field: 'host.name',
          operator: 'included',
          type: 'match',
          value: 'siem-kibana',
        },
        {
          field: 'user.name',
          operator: 'included',
          type: 'match',
          value: 'test',
        },
        {
          field: 'process.executable',
          operator: 'included',
          type: 'match',
          value: '/bin/zsh',
        },
        {
          field: 'file.path',
          operator: 'included',
          type: 'match',
          value: '123',
        },
        {
          field: 'process.name',
          operator: 'included',
          type: 'match',
          value: 'zsh',
        },
        {
          field: 'process.args',
          operator: 'included',
          type: 'match_any',
          value: ['-zsh'],
        },
      ]);
      cy.wrap(response?.body[0].comments[0].comment).should(
        'contain',
        'Exception conditions are pre-filled with relevant data from an alert with the alert id (_id):'
      );
    });
  });

  it('Should create a Rule exception from Alerts take action button and change multiple exception items without resetting to initial auto-prefilled entries', () => {
    cy.get(LOADING_INDICATOR).should('not.exist');

    // Open first Alert Summary
    expandFirstAlert();

    // The Rule exception should populated with highlighted fields
    openAddRuleExceptionFromAlertActionButton();

    cy.intercept('POST', '/api/detection_engine/rules/*/exceptions').as('exception_creation');

    addExceptionFlyoutItemName(ITEM_NAME);

    cy.get(ADD_AND_BTN).click();

    // edit conditions
    addExceptionEntryFieldValue(ADDITIONAL_ENTRY, 5);
    addExceptionEntryFieldValueValue('foo', 5);

    // Change the name again
    editExceptionFlyoutItemName(ITEM_NAME_EDIT);

    submitNewExceptionItem();

    cy.wait('@exception_creation').then(({ response }) => {
      cy.wrap(response?.body[0].name).should('eql', ITEM_NAME_EDIT);
      cy.wrap(response?.body[0].entries).should('eql', [
        {
          field: 'host.name',
          operator: 'included',
          type: 'match',
          value: 'siem-kibana',
        },
        {
          field: 'user.name',
          operator: 'included',
          type: 'match',
          value: 'test',
        },
        {
          field: 'process.executable',
          operator: 'included',
          type: 'match',
          value: '/bin/zsh',
        },
        {
          field: 'file.path',
          operator: 'included',
          type: 'match',
          value: '123',
        },
        {
          field: 'process.name',
          operator: 'included',
          type: 'match',
          value: 'zsh',
        },
        {
          field: 'host.hostname',
          operator: 'included',
          type: 'match',
          value: 'foo',
        },
      ]);
      cy.wrap(response?.body[0].comments[0].comment).should(
        'contain',
        'Exception conditions are pre-filled with relevant data from an alert with the alert id (_id):'
      );
    });

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

    cy.intercept('POST', '/api/detection_engine/rules/*/exceptions').as('exception_creation');

    const highlightedFieldsBasedOnAlertDoc = [
      'host.name',
      'agent.id',
      'user.name',
      'process.executable',
      'file.path',
    ];

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

    // add condition - should be the only condition now
    addExceptionEntryFieldValue(ADDITIONAL_ENTRY, 0);
    addExceptionEntryFieldValueValue('foo', 0);

    // Add name that is required to save
    editExceptionFlyoutItemName(ITEM_NAME);

    submitNewExceptionItem();

    cy.wait('@exception_creation').then(({ response }) => {
      cy.wrap(response?.body[0].name).should('eql', ITEM_NAME);
      cy.wrap(response?.body[0].entries).should('eql', [
        {
          field: 'host.hostname',
          operator: 'included',
          type: 'match',
          value: 'foo',
        },
      ]);
      cy.wrap(response?.body[0].comments[0].comment).should(
        'contain',
        'Exception conditions are pre-filled with relevant data from an alert with the alert id (_id):'
      );
    });
  });
});
