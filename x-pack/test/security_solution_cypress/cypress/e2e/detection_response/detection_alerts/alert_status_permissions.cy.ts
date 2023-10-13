/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ROLES } from '@kbn/security-solution-plugin/common/test';

import { getNewRule } from '../../../objects/rule';
import { ALERTS_COUNT, TAKE_ACTION_POPOVER_BTN, SELECTED_ALERTS } from '../../../screens/alerts';

import {
  selectNumberOfAlerts,
  waitForAlerts,
  markAcknowledgedFirstAlert,
  closeAlerts,
  selectCountTable,
  sumAlertCountFromAlertCountTable,
  parseAlertsCountToInt,
} from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';

import { ALERTS_URL } from '../../../urls/navigation';

describe('Alert status change permissions', { tags: ['@ess'] }, () => {
  before(() => {
    cleanKibana();
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_big' });
  });

  after(() => {
    cy.task('esArchiverUnload', 'auditbeat_big');
  });

  context('Changing alert status with read only role', () => {
    beforeEach(() => {
      login(ROLES.t2_analyst);
      deleteAlertsAndRules();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      selectCountTable();
    });

    it('Mark one alert as acknowledged when more than one open alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

          markAcknowledgedFirstAlert();
          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`); // user with read only role cannot mark alerts as acknowledged

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(numberOfAlerts));
          });
        });
    });

    it('Closes alerts', () => {
      const numberOfAlertsToBeClosed = 3;
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);
          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(numberOfAlerts));
          });
          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should(
            'have.text',
            `Selected ${numberOfAlertsToBeClosed} alerts`
          );

          closeAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`); // user with read only role cannot mark alerts as acknowledged

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(numberOfAlerts));
          });
        });
    });
  });
});
