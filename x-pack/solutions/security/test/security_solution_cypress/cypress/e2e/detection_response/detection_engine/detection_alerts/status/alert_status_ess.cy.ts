/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { ruleDetailsUrl } from '../../../../../urls/rule_details';
import { getNewRule } from '../../../../../objects/rule';
import {
  CLOSE_SELECTED_ALERTS_BTN,
  MARK_ALERT_ACKNOWLEDGED_BTN,
  TAKE_ACTION_POPOVER_BTN,
} from '../../../../../screens/alerts';

import { selectNumberOfAlerts } from '../../../../../tasks/alerts';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';
import { login } from '../../../../../tasks/login';
import { visit } from '../../../../../tasks/navigation';

import { ALERTS_URL } from '../../../../../urls/navigation';

// Failing: See https://github.com/elastic/kibana/issues/237208
describe.skip('Changing alert status privileges - ESS', { tags: ['@ess'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
  });

  context('User is readonly', () => {
    beforeEach(() => {
      login();
      visit(ALERTS_URL);
      deleteAlertsAndRules();
      createRule(getNewRule()).then((createdRule) => {
        login(ROLES.reader);
        visit(ruleDetailsUrl(createdRule.body.id));
      });
      waitForAlertsToPopulate();
    });

    it('should not allow users to bulk change the alert status', () => {
      selectNumberOfAlerts(2);
      cy.get(TAKE_ACTION_POPOVER_BTN).first().click();
      cy.get(TAKE_ACTION_POPOVER_BTN).should('be.visible');

      cy.get(CLOSE_SELECTED_ALERTS_BTN).should('not.exist');
      cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).should('not.exist');
    });
  });
});
