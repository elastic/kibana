/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { deleteAlertsAndRules } from '../../../../../../tasks/api_calls/common';

import { getExceptionList } from '../../../../../../objects/exception';
import {
  EXCEPTIONS_OVERFLOW_ACTIONS_BTN,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../../../../../screens/exceptions';
import {
  createExceptionList,
  deleteEndpointExceptionList,
  deleteExceptionLists,
} from '../../../../../../tasks/api_calls/exceptions';
import {
  dismissCallOut,
  getCallOut,
  waitForCallOutToBeShown,
  MISSING_PRIVILEGES_CALLOUT,
} from '../../../../../../tasks/common/callouts';
import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';
import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';

describe('Shared exception lists - read only', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    deleteExceptionLists();
    deleteEndpointExceptionList();

    // Create exception list not used by any rules
    createExceptionList(getExceptionList(), getExceptionList().list_id);

    login(ROLES.t1_analyst);
    visit(EXCEPTIONS_URL);

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
  });

  after(() => {
    deleteAlertsAndRules();
    deleteExceptionLists();
    deleteEndpointExceptionList();
  });

  it('Displays missing privileges primary callout', () => {
    waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');
  });

  context('When a user clicks Dismiss on the callouts', () => {
    it('We hide them and persist the dismissal', () => {
      waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');

      dismissCallOut(MISSING_PRIVILEGES_CALLOUT);
      cy.reload();
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

      getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
    });
  });

  it('Exception list actions should be disabled', () => {
    cy.get(EXCEPTIONS_OVERFLOW_ACTIONS_BTN).first().should('be.disabled');
  });
});
