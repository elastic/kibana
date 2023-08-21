/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { tag } from '../../../tags';

import { getNewRule } from '../../../objects/rule';
import {
  ALERTS_COUNT,
  TAKE_ACTION_POPOVER_BTN,
  SELECTED_ALERTS,
  ALERT_COUNT_TABLE_COLUMN,
  ALERT_EMBEDDABLE_EMPTY_PROMPT,
} from '../../../screens/alerts';

import {
  selectNumberOfAlerts,
  waitForAlerts,
  markAcknowledgedFirstAlert,
  goToAcknowledgedAlerts,
  closeAlerts,
  closeFirstAlert,
  goToClosedAlerts,
  goToOpenedAlerts,
  openAlerts,
  openFirstAlert,
  selectCountTable,
  waitForPageFilters,
  sumAlertCountFromAlertCountTable,
  parseAlertsCountToInt,
} from '../../../tasks/alerts';
import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import { waitForAlertsToPopulate } from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';

import { ALERTS_URL } from '../../../urls/navigation';

describe('Changing alert status', { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] }, () => {
  before(() => {
    cy.task('esArchiverLoad', 'auditbeat_big');
    cleanKibana();
  });

  after(() => {
    cy.task('esArchiverUnload', 'auditbeat_big');
  });

  context('Opening alerts', () => {
    beforeEach(() => {
      login();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      selectNumberOfAlerts(3);
      cy.get(SELECTED_ALERTS).should('have.text', `Selected 3 alerts`);
      closeAlerts();
      waitForAlerts();
      waitForPageFilters();
      selectCountTable();
    });

    it('Open one alert when more than one closed alerts are selected', () => {
      waitForAlertsToPopulate();
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((numberOfOpenedAlertsText) => {
          const numberOfOpenedAlerts = parseInt(numberOfOpenedAlertsText, 10);
          goToClosedAlerts();
          waitForAlerts();
          cy.get(ALERTS_COUNT)
            .invoke('text')
            .then((alertNumberString) => {
              const numberOfAlerts = alertNumberString.split(' ')[0];
              const numberOfAlertsToBeOpened = 1;
              const numberOfAlertsToBeSelected = 3;

              cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
              selectNumberOfAlerts(numberOfAlertsToBeSelected);
              cy.get(SELECTED_ALERTS).should(
                'have.text',
                `Selected ${numberOfAlertsToBeSelected} alerts`
              );
              cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

              // TODO: Popover not shwing up in cypress UI, but code is in the UtilityBar
              // cy.get(TAKE_ACTION_POPOVER_BTN).should('not.have.attr', 'disabled');

              openFirstAlert();
              waitForAlerts();

              const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeOpened;
              cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);

              sumAlertCountFromAlertCountTable((sumAlerts) => {
                expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfAlerts));
              });

              goToOpenedAlerts();
              waitForAlerts();

              selectCountTable();

              cy.get(ALERTS_COUNT).should(
                'have.text',
                `${numberOfOpenedAlerts + numberOfAlertsToBeOpened} alerts`.toString()
              );

              sumAlertCountFromAlertCountTable((sumAlerts) => {
                expect(sumAlerts).to.eq(
                  parseAlertsCountToInt(numberOfOpenedAlerts + numberOfAlertsToBeOpened)
                );
              });
            });
        });
    });
  });
  context('Marking alerts as acknowledged', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      selectCountTable();
    });
    it.skip('Mark one alert as acknowledged when more than one open alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeMarkedAcknowledged = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

          markAcknowledgedFirstAlert();
          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfAlerts));
          });

          goToAcknowledgedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeMarkedAcknowledged} alert`);

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(numberOfAlertsToBeMarkedAcknowledged));
          });
        });
    });
  });
  context('Closing alerts', () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(getNewRule({ rule_id: '1', max_signals: 100 }));
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      selectCountTable();
    });
    it('Closes and opens alerts', () => {
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

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);
          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfAlertsAfterClosing));
          });

          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alerts`);

          const numberOfAlertsToBeOpened = 1;
          selectNumberOfAlerts(numberOfAlertsToBeOpened);

          cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeOpened} alert`);

          openAlerts();
          waitForAlerts();

          const expectedNumberOfClosedAlertsAfterOpened = 2;
          cy.get(ALERTS_COUNT).should(
            'have.text',
            `${expectedNumberOfClosedAlertsAfterOpened} alerts`
          );

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfClosedAlertsAfterOpened));
          });
          goToOpenedAlerts();
          waitForAlerts();

          const expectedNumberOfOpenedAlerts =
            +numberOfAlerts - expectedNumberOfClosedAlertsAfterOpened;

          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfOpenedAlerts} alerts`);

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfOpenedAlerts));
          });
        });
    });

    it.skip('Closes one alert when more than one opened alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeClosed = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

          closeFirstAlert();
          waitForAlerts();

          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);
          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfAlerts));
          });

          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alert`);

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(numberOfAlertsToBeClosed));
          });
        });
    });

    it('Updates count table whenever alert status is updated in table', () => {
      const numberOfAlertsToBeClosed = 1;
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlerts} alerts`);
          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(numberOfAlerts));
          });

          selectNumberOfAlerts(numberOfAlertsToBeClosed);

          cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeClosed} alert`);

          closeAlerts();
          waitForAlerts();

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfAlertsAfterClosing));
          });
          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alert`);

          const numberOfAlertsToBeOpened = 1;
          selectNumberOfAlerts(numberOfAlertsToBeOpened);

          cy.get(SELECTED_ALERTS).should('have.text', `Selected ${numberOfAlertsToBeOpened} alert`);
          const alertRuleNameColumn = ALERT_COUNT_TABLE_COLUMN(1);
          const alertCountColumn = ALERT_COUNT_TABLE_COLUMN(3);
          cy.get(alertRuleNameColumn).should('exist').should('have.text', getNewRule().name);

          openAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('not.exist');
          cy.get(alertCountColumn).should('not.exist');
          cy.get(alertRuleNameColumn).should('not.exist');
          cy.get(ALERT_EMBEDDABLE_EMPTY_PROMPT).should('exist');
        });
    });
  });

  // TODO: Are you sure that read only role should be able to close alerts?
  context.skip('Changing alert status with read only role', () => {
    beforeEach(() => {
      login(ROLES.t2_analyst);
      deleteAlertsAndRules();
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      selectCountTable();
    });

    it.skip('Mark one alert as acknowledged when more than one open alerts are selected', () => {
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .then((alertNumberString) => {
          const numberOfAlerts = alertNumberString.split(' ')[0];
          const numberOfAlertsToBeMarkedAcknowledged = 1;
          const numberOfAlertsToBeSelected = 3;

          cy.get(TAKE_ACTION_POPOVER_BTN).should('not.exist');
          selectNumberOfAlerts(numberOfAlertsToBeSelected);
          cy.get(TAKE_ACTION_POPOVER_BTN).should('exist');

          markAcknowledgedFirstAlert();
          const expectedNumberOfAlerts = +numberOfAlerts - numberOfAlertsToBeMarkedAcknowledged;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlerts} alerts`);

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfAlerts));
          });
          goToAcknowledgedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeMarkedAcknowledged} alert`);

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(numberOfAlertsToBeMarkedAcknowledged));
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

          const expectedNumberOfAlertsAfterClosing = +numberOfAlerts - numberOfAlertsToBeClosed;
          cy.get(ALERTS_COUNT).should('have.text', `${expectedNumberOfAlertsAfterClosing} alerts`);

          sumAlertCountFromAlertCountTable((sumAlerts) => {
            expect(sumAlerts).to.eq(parseAlertsCountToInt(expectedNumberOfAlertsAfterClosing));
          });
          goToClosedAlerts();
          waitForAlerts();

          cy.get(ALERTS_COUNT).should('have.text', `${numberOfAlertsToBeClosed} alerts`);
        });
    });
  });
});
