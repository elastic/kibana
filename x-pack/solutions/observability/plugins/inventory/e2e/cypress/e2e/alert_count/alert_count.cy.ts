/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apmSynthtrace, entitiesSynthtrace, infraSynthtrace } from '../../../synthtrace';
import {
  CONTAINER_ID,
  HOST_NAME,
  SERVICE_NAME,
  generateEntityAlerts,
  cleanEntityAlerts,
  generateEntities,
  generateHosts,
  generateTraces,
} from './generate_data';

const start = new Date(Date.now() - 5 * 60000).toISOString();
const end = new Date().toISOString();

const getNumber = (text: string) => text.replace(/\D/g, '');

const verifyNumber = (element: Cypress.Chainable<JQuery<Element>>, alertsCount: string) => {
  element.invoke('text').then((testSubjElementCount) => {
    expect(getNumber(testSubjElementCount)).to.equal(alertsCount);
  });
};

const verifyAlertsTableCount = (alertsCount: string) => {
  verifyNumber(cy.getByTestSubj('activeAlertCount'), alertsCount);
  verifyNumber(cy.getByTestSubj('toolbar-alerts-count'), alertsCount);
};

// Temporary skipping those test, will be enabled in the future once we fix them https://github.com/elastic/kibana/issues/204558
describe.skip('Alert count', () => {
  beforeEach(() => {
    cy.loginAsSuperUser();

    cy.updateAdvancedSettings({
      'observability:entityCentricExperience': true,
    });

    cy.intercept('GET', '/internal/entities/managed/enablement', {
      fixture: 'eem_enabled.json',
    }).as('getEEMStatus');

    entitiesSynthtrace.index(
      generateEntities({ from: new Date(start).getTime(), to: new Date(end).getTime() })
    );

    generateEntityAlerts(start);
  });

  afterEach(() => {
    cy.updateAdvancedSettings({
      'observability:entityCentricExperience': false,
    });
    entitiesSynthtrace.clean();
    cleanEntityAlerts();
  });

  describe('When there is entities and signal data', () => {
    describe('Service', () => {
      before(() => {
        apmSynthtrace.index(
          generateTraces({ from: new Date(start).getTime(), to: new Date(end).getTime() })
        );
      });

      after(() => {
        apmSynthtrace.clean();
      });

      beforeEach(() => {
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('service').click();
      });

      it('Should display the correct alert count in the entity detail views', () => {
        cy.getByTestSubj('inventoryAlertsBadgeLink')
          .invoke('text')
          .then((inventoryAlertsBadgeLinkCount) => {
            cy.contains(SERVICE_NAME).click();
            cy.url().should('include', `/app/apm/services/${SERVICE_NAME}/overview`);

            verifyNumber(
              cy.getByTestSubj('alertsTab').get('.euiBadge'),
              inventoryAlertsBadgeLinkCount
            );
            cy.getByTestSubj('alertsTab').click();
            cy.url().should('include', `/app/apm/services/${SERVICE_NAME}/alerts`);
            cy.getByTestSubj('alert-status-filter-active-button').click();
            verifyNumber(cy.getByTestSubj('toolbar-alerts-count'), inventoryAlertsBadgeLinkCount);
          });
      });

      it('Should display the correct alert count in the alerts app', () => {
        cy.getByTestSubj('inventoryAlertsBadgeLink')
          .invoke('text')
          .then((inventoryAlertsBadgeLinkCount) => {
            cy.getByTestSubj('inventoryAlertsBadgeLink').click();
            cy.url().should('include', `/app/observability/alerts`);
            verifyAlertsTableCount(inventoryAlertsBadgeLinkCount);
          });
      });

      it('Should display the correct alert count in the services inventory', () => {
        cy.getByTestSubj('inventoryAlertsBadgeLink')
          .invoke('text')
          .then((inventoryAlertsBadgeLinkCount) => {
            cy.visitKibana(`/app/apm/services?rangeFrom=${start}&rangeTo=${end}`);
            verifyNumber(
              cy.getByTestSubj('serviceInventoryAlertsBadgeLink'),
              inventoryAlertsBadgeLinkCount
            );
          });
      });
    });

    describe('Host', () => {
      before(() => {
        infraSynthtrace.index(
          generateHosts({
            from: start,
            to: end,
          })
        );
      });

      after(() => {
        infraSynthtrace.clean();
      });

      beforeEach(() => {
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('host').click();
      });

      it('Should display the correct alert count in the entity detail views', () => {
        cy.getByTestSubj('inventoryAlertsBadgeLink')
          .invoke('text')
          .then((inventoryAlertsBadgeLinkCount) => {
            cy.contains(HOST_NAME).click();
            cy.url().should('include', `/app/metrics/detail/host/${HOST_NAME}`);
            cy.getByTestSubj('hostsView-alert-status-filter-active-button').click();
            verifyAlertsTableCount(inventoryAlertsBadgeLinkCount);
          });
      });

      it('Should display the correct alert count in the alerts app', () => {
        cy.getByTestSubj('inventoryAlertsBadgeLink')
          .invoke('text')
          .then((inventoryAlertsBadgeLinkCount) => {
            cy.getByTestSubj('inventoryAlertsBadgeLink').click();
            cy.url().should('include', `/app/observability/alerts`);
            verifyAlertsTableCount(inventoryAlertsBadgeLinkCount);
          });
      });

      it('Should display the correct alert count in the hosts inventory', () => {
        cy.getByTestSubj('inventoryAlertsBadgeLink')
          .invoke('text')
          .then((inventoryAlertsBadgeLinkCount) => {
            cy.visitKibana('/app/metrics/hosts');

            verifyNumber(
              cy.getByTestSubj('hostInventoryAlertsBadgeLink'),
              inventoryAlertsBadgeLinkCount
            );
          });
      });
    });

    describe('Container', () => {
      beforeEach(() => {
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('container').click();
      });

      it('Should display the correct alert count in the entity detail views', () => {
        cy.getByTestSubj('inventoryAlertsBadgeLink')
          .invoke('text')
          .then((inventoryAlertsBadgeLinkCount) => {
            cy.contains(CONTAINER_ID).click();
            cy.url().should('include', `/app/metrics/detail/container/${CONTAINER_ID}`);
            cy.getByTestSubj('hostsView-alert-status-filter-active-button').click();
            verifyAlertsTableCount(inventoryAlertsBadgeLinkCount);
          });
      });

      it('Should display the correct alert count in the alerts app', () => {
        cy.getByTestSubj('inventoryAlertsBadgeLink')
          .invoke('text')
          .then((inventoryAlertsBadgeLinkCount) => {
            cy.getByTestSubj('inventoryAlertsBadgeLink').click();
            cy.url().should('include', `/app/observability/alerts`);
            verifyAlertsTableCount(inventoryAlertsBadgeLinkCount);
          });
      });
    });
  });
});
