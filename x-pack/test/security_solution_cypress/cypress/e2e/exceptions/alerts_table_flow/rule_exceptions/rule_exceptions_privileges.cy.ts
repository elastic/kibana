/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ROLES, SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import { visit } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import { ADD_EXCEPTION_BTN } from '../../../../screens/alerts';
import { LOADING_INDICATOR } from '../../../../screens/security_header';
import { getNewRule } from '../../../../objects/rule';
import { createRule } from '../../../../tasks/api_calls/rules';
import { expandFirstAlertActions } from '../../../../tasks/alerts';
import { login } from '../../../../tasks/login';

import { deleteAlertsAndRules } from '../../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';

const CAN_ADD_EXCEPTION: SecurityRoleName[] = [
  ROLES.t3_analyst,
  // ROLES.threat_intelligence_analyst,
  ROLES.rule_author,
  ROLES.detections_admin,
  ROLES.soc_manager,
  ROLES.platform_engineer,
  ROLES.endpoint_policy_manager,
];

const CANNOT_ADD_EXCEPTION: SecurityRoleName[] = [
  ROLES.t1_analyst,
  ROLES.t2_analyst,
  // ROLES.endpoint_operations_analyst,
];

describe('Add exception item from alert privileges', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    deleteAlertsAndRules();
    login();
    visit(ALERTS_URL);
    createRule(getNewRule());
    waitForAlertsToPopulate();
  });

  CAN_ADD_EXCEPTION.forEach((role) => {
    it(`${role} can create a rule exception item from alert actions overflow menu`, () => {
      login(role);
      visit(ALERTS_URL, { role });
      waitForAlertsToPopulate();

      cy.get(LOADING_INDICATOR).should('not.exist');
      expandFirstAlertActions();
      cy.get(ADD_EXCEPTION_BTN).should('exist');
      cy.get(ADD_EXCEPTION_BTN).should('not.have.attr', 'disabled');
    });
  });

  CANNOT_ADD_EXCEPTION.forEach((role) => {
    it(`${role} cannot create a rule exception item from alert actions overflow menu`, () => {
      login(role);
      visit(ALERTS_URL, { role });
      waitForAlertsToPopulate();

      cy.get(LOADING_INDICATOR).should('not.exist');
      expandFirstAlertActions();
      cy.get(ADD_EXCEPTION_BTN).should('not.exist');
    });
  });
});
