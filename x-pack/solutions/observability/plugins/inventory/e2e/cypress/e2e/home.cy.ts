/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apmSynthtrace, entitiesSynthtrace, logsSynthtrace } from '../../synthtrace';
import { generateEntities, generateLogs, generateTraces } from './generate_data';

const start = '2024-10-16T00:00:00.000Z';
const end = '2024-10-16T00:15:00.000Z';

// Temporary skipping those test, will be enabled in the future once we fix them https://github.com/elastic/kibana/issues/204558
describe.skip('Home page', () => {
  beforeEach(() => {
    cy.loginAsSuperUser();
    cy.updateAdvancedSettings({
      'observability:entityCentricExperience': true,
    });
  });

  afterEach(() => {
    cy.updateAdvancedSettings({
      'observability:entityCentricExperience': false,
    });
  });

  describe('When the entityCentricExperience FF is disabled', () => {
    it('Shows 404', () => {
      cy.updateAdvancedSettings({
        'observability:entityCentricExperience': false,
      });
      cy.visitKibana('/app/inventory');
      cy.contains('Application Not Found');
    });
  });

  describe('When EEM is disabled', () => {
    it('Shows no data screen', () => {
      cy.visitKibana('/app/inventory');
      cy.contains('See everything you have in one place');
      cy.getByTestSubj('inventoryInventoryPageTemplateFilledButton').should('exist');
    });
  });

  describe('When EEM is enabled', () => {
    describe('When there is no entities', () => {
      it('Shows inventory page with empty message', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('Inventory');
        cy.contains('Tell us what you think!');
        cy.contains('Trying for the first time?');
        cy.contains('No entities available');
        cy.getByTestSubj('addDataButton').should('exist');
        cy.getByTestSubj('associateServiceLogsButton').should('exist');
      });
    });

    describe('When there is entities and signal data', () => {
      before(() => {
        entitiesSynthtrace.index(
          generateEntities({ from: new Date(start).getTime(), to: new Date(end).getTime() })
        );
        apmSynthtrace.index(
          generateTraces({ from: new Date(start).getTime(), to: new Date(end).getTime() })
        );
        logsSynthtrace.index(
          generateLogs({ from: new Date(start).getTime(), to: new Date(end).getTime() })
        );
      });
      after(() => {
        entitiesSynthtrace.clean();
        apmSynthtrace.clean();
        logsSynthtrace.clean();
      });

      it('Shows inventory page with groups & entities', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.intercept('GET', '/internal/inventory/entities?**').as('getEntities');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('host');
        cy.getByTestSubj('inventoryGroupTitle_entityType_host').click();
        cy.wait('@getEntities');
        cy.contains('service');
        cy.getByTestSubj('inventoryGroupTitle_entityType_service').click();
        cy.wait('@getEntities');
        cy.contains('container');
        cy.getByTestSubj('inventoryGroupTitle_entityType_container').click();
        cy.wait('@getEntities');
        cy.contains('server1');
        cy.contains('synth-node-trace-logs');
        cy.contains('foo');
      });

      it('Navigates to apm when clicking on a service type entity', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('service').click();
        cy.contains('synth-node-trace-logs').click();
        cy.url().should('include', '/app/apm/services/synth-node-trace-logs/overview');
      });

      it('Navigates to apm when clicking on a logs only service', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('service').click();
        cy.contains('service-logs-only').click();
        cy.url().should('include', '/app/apm/services/service-logs-only/overview');
        cy.contains('Detect and resolve issues faster with deep visibility into your application');
      });

      it('Navigates to hosts when clicking on a host type entity', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('host').click();
        cy.contains('server1').click();
        cy.url().should('include', '/app/metrics/detail/host/server1');
      });

      it('Navigates to infra when clicking on a container type entity', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('container').click();
        cy.contains('foo').click();
        cy.url().should('include', '/app/metrics/detail/container/foo');
      });

      it('Filters entities by service type', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.intercept('GET', '/internal/inventory/entities?**').as('getEntities');
        cy.intercept('GET', '/internal/inventory/entities/types').as('getEntitiesTypes');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEntitiesTypes');
        cy.wait('@getEEMStatus');
        cy.getByTestSubj('entityType_multiSelect_filter').click();
        cy.getByTestSubj('entityType_multiSelect_filter_selection_service').click();
        cy.getByTestSubj('inventoryGroupTitle_entityType_service').click();
        cy.wait('@getEntities');
        cy.get('server1').should('not.exist');
        cy.contains('synth-node-trace-logs');
        cy.contains('foo').should('not.exist');
        cy.getByTestSubj('entityType_multiSelect_filter').click();
        cy.getByTestSubj('entityType_multiSelect_filter_selection_service').click();
        cy.getByTestSubj('inventoryGroupTitle_entityType_service').should('not.exist');
      });

      it('Filters entities by host type', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.intercept('GET', '/internal/inventory/entities?**').as('getEntities');
        cy.intercept('GET', '/internal/inventory/entities/types').as('getEntitiesTypes');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEntitiesTypes');
        cy.wait('@getEEMStatus');
        cy.getByTestSubj('entityType_multiSelect_filter').click();
        cy.getByTestSubj('entityType_multiSelect_filter_selection_host').click();
        cy.getByTestSubj('inventoryGroupTitle_entityType_host').click();
        cy.wait('@getEntities');
        cy.contains('server1');
        cy.contains('synth-node-trace-logs').should('not.exist');
        cy.contains('foo').should('not.exist');
        cy.getByTestSubj('entityType_multiSelect_filter').click();
        cy.getByTestSubj('entityType_multiSelect_filter_selection_host').click();
        cy.getByTestSubj('inventoryGroupTitle_entityType_host').should('not.exist');
      });

      it('Filters entities by container type', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.intercept('GET', '/internal/inventory/entities?**').as('getEntities');
        cy.intercept('GET', '/internal/inventory/entities/types').as('getEntitiesTypes');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEntitiesTypes');
        cy.wait('@getEEMStatus');
        cy.getByTestSubj('entityType_multiSelect_filter').click();
        cy.getByTestSubj('entityType_multiSelect_filter_selection_container').click();
        cy.getByTestSubj('inventoryGroupTitle_entityType_container').click();
        cy.wait('@getEntities');
        cy.contains('server1').should('not.exist');
        cy.contains('synth-node-trace-logs').should('not.exist');
        cy.contains('foo');
        cy.getByTestSubj('entityType_multiSelect_filter').click();
        cy.getByTestSubj('entityType_multiSelect_filter_selection_container').click();
        cy.getByTestSubj('inventoryGroupTitle_entityType_container').should('not.exist');
      });

      it('Navigates to discover with actions button in the entities list', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.intercept('GET', '/internal/inventory/entities?**').as('getEntities');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('container');
        cy.getByTestSubj('inventoryGroupTitle_entityType_container').click();
        cy.wait('@getEntities');
        // cy.getByTestSubj('inventoryEntityActionsButton').click();
        cy.getByTestSubj('inventoryEntityActionsButton-foo').click();
        cy.getByTestSubj('inventoryEntityActionExploreInDiscover').click();
        cy.url().should('include', "query:'container.id:%20%22foo%22");
      });
    });
  });
});
