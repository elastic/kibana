/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { getNewRule } from '../../../../objects/rule';
import {
  COLLAPSED_ACTION_BTN,
  RULE_CHECKBOX,
  RULE_NAME,
} from '../../../../screens/alerts_detection_rules';
import { VALUE_LISTS_MODAL_ACTIVATOR } from '../../../../screens/lists';
import { createRule } from '../../../../tasks/api_calls/rules';
import {
  dismissCallOut,
  getCallOut,
  waitForCallOutToBeShown,
  MISSING_PRIVILEGES_CALLOUT,
} from '../../../../tasks/common/callouts';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

// TODO: https://github.com/elastic/kibana/issues/164451 We should find a way to make this spec work in Serverless
// TODO: https://github.com/elastic/kibana/issues/161540
describe('All rules - read only', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    createRule(getNewRule({ rule_id: '1', enabled: false }));
    login(ROLES.t1_analyst);
    visitRulesManagementTable();
    cy.get(RULE_NAME).should('have.text', getNewRule().name);
  });

  it('Does not display select boxes for rules', () => {
    cy.get(RULE_CHECKBOX).should('not.exist');
  });

  it('Disables value lists upload', () => {
    cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('be.disabled');
  });

  it('Does not display action options', () => {
    // These are the 3 dots at the end of the row that opens up
    // options to take action on the rule
    cy.get(COLLAPSED_ACTION_BTN).should('not.exist');
  });

  it('Displays missing privileges primary callout', () => {
    waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');
  });

  context('When a user clicks Dismiss on the callouts', () => {
    it('We hide them and persist the dismissal', () => {
      waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');

      dismissCallOut(MISSING_PRIVILEGES_CALLOUT);
      cy.reload();
      cy.get(RULE_NAME).should('have.text', getNewRule().name);

      getCallOut(MISSING_PRIVILEGES_CALLOUT).should('not.exist');
    });
  });
});
