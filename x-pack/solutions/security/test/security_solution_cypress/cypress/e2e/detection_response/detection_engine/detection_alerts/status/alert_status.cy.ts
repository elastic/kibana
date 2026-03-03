/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visit } from '../../../../../tasks/navigation';
import { ALERTS_COUNT, SELECTED_ALERTS } from '../../../../../screens/alerts';
import { ruleDetailsUrl } from '../../../../../urls/rule_details';
import {
  closeAlerts,
  closeFirstAlert,
  goToClosedAlertsOnRuleDetailsPage,
  goToOpenedAlertsOnRuleDetailsPage,
  markAcknowledgedFirstAlert,
  markAlertsAcknowledged,
  openAlerts,
  openFirstAlert,
  selectNumberOfAlerts,
  waitForAlerts,
} from '../../../../../tasks/alerts';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { login } from '../../../../../tasks/login';
import { goToAcknowledgedAlertsOnRuleDetailsPage } from '../../../../../tasks/alerts';
import { getNewRule } from '../../../../../objects/rule';
import { createRule } from '../../../../../tasks/api_calls/rules';

describe('Changing alert status', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
  });

  context('Opening alerts', () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(getNewRule()).then((createdRule) => {
        visit(ruleDetailsUrl(createdRule.body.id, 'alerts'));
      });
      waitForAlertsToPopulate();
      selectNumberOfAlerts(3);
      cy.get(SELECTED_ALERTS).should('have.text', `Selected 3 alerts`);
      closeAlerts();
      waitForAlerts();
    });

    it('can mark a closed alert as open', () => {
      waitForAlertsToPopulate();
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfOpenedAlertsText) => {
          const numberOfOpenAlerts = parseInt(numberOfOpenedAlertsText, 10);
          goToClosedAlertsOnRuleDetailsPage();
          waitForAlerts();
          cy.get(ALERTS_COUNT)
            .invoke('text')
            .then((alertNumberString) => {
              const numberOfClosedAlerts = alertNumberString.split(' ')[0];
              const numberOfAlertsToBeOpened = 1;

              openFirstAlert();
              waitForAlerts();

              const expectedNumberOfAlerts = +numberOfClosedAlerts - numberOfAlertsToBeOpened;
              cy.get(ALERTS_COUNT).contains(expectedNumberOfAlerts);

              goToOpenedAlertsOnRuleDetailsPage();
              waitForAlerts();

              cy.get(ALERTS_COUNT).contains(`${numberOfOpenAlerts + numberOfAlertsToBeOpened}`);
            });
        });
    });

    it('can bulk open alerts', () => {
      waitForAlertsToPopulate();
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfOpenedAlertsText) => {
          const numberOfOpenedAlerts = parseInt(numberOfOpenedAlertsText, 10);
          goToClosedAlertsOnRuleDetailsPage();
          waitForAlerts();
          cy.get(ALERTS_COUNT)
            .invoke('text')
            .then((alertNumberString) => {
              const numberOfAlerts = alertNumberString.split(' ')[0];
              const numberOfAlertsToBeOpened = 2;
              const numberOfAlertsToBeSelected = 2;

              selectNumberOfAlerts(numberOfAlertsToBeSelected);
              cy.get(SELECTED_ALERTS).should(
                'have.text',
                `Selected ${numberOfAlertsToBeSelected} alerts`
              );

              openAlerts();
              waitForAlerts();

              const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeOpened;
              cy.get(ALERTS_COUNT).contains(expectedNumberOfAlerts);

              goToOpenedAlertsOnRuleDetailsPage();
              waitForAlerts();

              cy.get(ALERTS_COUNT).contains(`${numberOfOpenedAlerts + numberOfAlertsToBeOpened}`);
            });
        });
    });
  });

  context('Marking alerts as acknowledged', () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(getNewRule()).then((createdRule) => {
        visit(ruleDetailsUrl(createdRule.body.id, 'alerts'));
      });
      waitForAlertsToPopulate();
    });

    it('can mark alert as acknowledged', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeMarkedAcknowledged = 1;

          markAcknowledgedFirstAlert();
          waitForAlerts();
          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
          cy.get(ALERTS_COUNT).contains(expectedNumberOfAlerts);

          goToAcknowledgedAlertsOnRuleDetailsPage();
          waitForAlerts();

          cy.get(ALERTS_COUNT).contains(`${numberOfAlertsToBeMarkedAcknowledged}`);
        });
    });

    it('can bulk mark alerts as acknowledged', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeMarkedAcknowledged = 2;
          const numberOfAlertsToBeSelected = 2;

          selectNumberOfAlerts(numberOfAlertsToBeSelected);

          markAlertsAcknowledged();
          waitForAlerts();
          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
          cy.get(ALERTS_COUNT).contains(expectedNumberOfAlerts);

          goToAcknowledgedAlertsOnRuleDetailsPage();
          waitForAlerts();

          cy.get(ALERTS_COUNT).contains(numberOfAlertsToBeMarkedAcknowledged);
        });
    });
  });

  context('Closing alerts', () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(getNewRule()).then((createdRule) => {
        visit(ruleDetailsUrl(createdRule.body.id, 'alerts'));
      });
      waitForAlertsToPopulate();
    });
    it('can close an alert', () => {
      const numberOfAlertsToBeClosed = 1;
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);

          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeClosed} alert`);

          closeFirstAlert();
          waitForAlerts();

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).contains(expectedNumberOfAlertsAfterClosing);

          goToClosedAlertsOnRuleDetailsPage();
          waitForAlerts();

          cy.get(ALERTS_COUNT).contains(numberOfAlertsToBeClosed);
        });
    });

    it('can bulk close alerts', () => {
      const numberOfAlertsToBeClosed = 2;
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);

          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should(
            'have.text',
            `Selected ${numberOfAlertsToBeClosed} alerts`
          );

          closeAlerts();
          waitForAlerts();

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).contains(expectedNumberOfAlertsAfterClosing);

          goToClosedAlertsOnRuleDetailsPage();
          waitForAlerts();

          cy.get(ALERTS_COUNT).contains(numberOfAlertsToBeClosed);
        });
    });
  });
});
