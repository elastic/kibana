/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES, SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import { getNewRule } from '../../../../objects/rule';
import { ALERTS_COUNT, SELECTED_ALERTS } from '../../../../screens/alerts';

import {
  selectNumberOfAlerts,
  waitForAlerts,
  closeFirstAlert,
  goToClosedAlerts,
} from '../../../../tasks/alerts';
import { createRule } from '../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';

import { ALERTS_URL } from '../../../../urls/navigation';

const CAN_UPDATE_ALERT_STATUS: SecurityRoleName[] = [
  ROLES.t1_analyst,
  ROLES.t2_analyst,
  // ROLES.t3_analyst,
  ROLES.threat_intelligence_analyst,
  ROLES.rule_author,
  ROLES.detections_admin,
  ROLES.soc_manager,
  ROLES.platform_engineer,
  // ROLES.endpoint_operations_analyst,
  ROLES.endpoint_policy_manager,
];

describe('Changing alert status privileges', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_big' });
  });

  after(() => {
    cy.task('esArchiverUnload', 'auditbeat_big');
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(ALERTS_URL);
    createRule(getNewRule({ rule_id: '1', max_signals: 100 }));
    waitForAlertsToPopulate();
  });

  describe('can update status', () => {
    CAN_UPDATE_ALERT_STATUS.forEach((role) => {
      it(`${role} can close an alert`, () => {
        const numberOfAlertsToBeClosed = 1;

        login(role);
        visit(ALERTS_URL, { role });
        waitForAlertsToPopulate();

        cy.get(ALERTS_COUNT)
          .invoke('text')
          .then((alertNumberString) => {
            const numberOfAlerts = alertNumberString.split(' ')[0];
            cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);

            selectNumberOfAlerts(numberOfAlertsToBeClosed);

            cy.get(SELECTED_ALERTS).should(
              'have.text',
              `Selected ${numberOfAlertsToBeClosed} alert`
            );

            closeFirstAlert();
            waitForAlerts();

            const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
            cy.get(ALERTS_COUNT).contains(expectedNumberOfAlertsAfterClosing);

            goToClosedAlerts();
            waitForAlerts();

            cy.get(ALERTS_COUNT).contains(numberOfAlertsToBeClosed);
          });
      });
    });
  });
});
