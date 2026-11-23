/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  START_MIGRATION_FROM_FLYOUT_BTN,
  START_MIGRATION_MODAL,
  TRANSLATED_WORKFLOWS_RESULT_TABLE,
  WORKFLOW_MIGRATION_READY_PANEL,
  WORKFLOWS_FLYOUT_TRANSLATE_BTN,
} from '../../../../screens/siem_migrations';
import { deleteConnectors } from '../../../../tasks/api_calls/common';
import { suppressGlobalAnnouncements } from '../../../../tasks/api_calls/suppress_global_announcements';
import { createBedrockConnector } from '../../../../tasks/api_calls/connectors';
import { cleanWorkflowsMigrationData } from '../../../../tasks/api_calls/siem_migrations';
import { visit } from '../../../../tasks/navigation';
import {
  openUploadWorkflowsFlyout,
  saveDefaultMigrationName,
  selectMigrationConnector,
  startWorkflowMigrationFromFlyout,
  uploadTinesStories,
} from '../../../../tasks/siem_migrations';
import { GET_STARTED_URL, TRANSLATED_WORKFLOWS_PAGE_URL } from '../../../../urls/navigation';
import { role } from '../common/role';
import { TINES_TEST_STORY } from './mock';

let bedrockConnectorId: string | null = null;

// TODO: https://github.com/elastic/kibana/issues/228940 remove @skipInServerlessMKI tag when privileges issue is fixed
describe(
  'Workflow Migrations - Translated Workflows Page',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'tinesWorkflowsMigration',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      role.setup();
    });

    beforeEach(() => {
      deleteConnectors();
      cleanWorkflowsMigrationData();
      role.login();
      cy.waitUntil(
        () => {
          return createBedrockConnector()
            .then((response) => {
              bedrockConnectorId = response.body.id;
            })
            .then(() => true);
        },
        { interval: 500, timeout: 12000 }
      );
      suppressGlobalAnnouncements();
      visit(`${GET_STARTED_URL}/siem_migrations`);
      selectMigrationConnector();
      openUploadWorkflowsFlyout();
      saveDefaultMigrationName();
      uploadTinesStories(TINES_TEST_STORY);
    });

    after(() => {
      role.teardown();
      cleanWorkflowsMigrationData();
    });

    it('should translate the uploaded stories and show the result in the table', () => {
      cy.intercept({ url: '**/start' }).as('startWorkflowMigration');
      startWorkflowMigrationFromFlyout();
      cy.wait('@startWorkflowMigration')
        .its('request.body.settings')
        .should('have.property', 'connector_id', bedrockConnectorId);

      visit(TRANSLATED_WORKFLOWS_PAGE_URL);

      cy.get(TRANSLATED_WORKFLOWS_RESULT_TABLE.ROWS, { timeout: 60000 }).should('have.length', 1);
      cy.get(TRANSLATED_WORKFLOWS_RESULT_TABLE.WORKFLOW_NAME).should(
        'contain.text',
        TINES_TEST_STORY.name
      );
      cy.get(TRANSLATED_WORKFLOWS_RESULT_TABLE.STATUS('full')).should('have.length', 1);
    });

    it('should offer to install the translated workflow, not to view it, and not offer bulk selection', () => {
      startWorkflowMigrationFromFlyout();
      visit(TRANSLATED_WORKFLOWS_PAGE_URL);

      cy.get(TRANSLATED_WORKFLOWS_RESULT_TABLE.INSTALL_BTN, { timeout: 60000 }).should('exist');
      cy.get(TRANSLATED_WORKFLOWS_RESULT_TABLE.VIEW_BTN).should('not.exist');
      cy.get(`${TRANSLATED_WORKFLOWS_RESULT_TABLE.TABLE} input[type="checkbox"]`).should(
        'not.exist'
      );
    });

    it('should start the translation from the page when the flyout was closed without translating', () => {
      // the translate button is enabled once the migration and its stories are created
      cy.get(WORKFLOWS_FLYOUT_TRANSLATE_BTN).should('not.be.disabled');
      cy.get('[data-test-subj="workflowDataFlyoutCloseButton"]').click();
      visit(TRANSLATED_WORKFLOWS_PAGE_URL);

      cy.get(WORKFLOW_MIGRATION_READY_PANEL).should('exist');
      cy.get(START_MIGRATION_FROM_FLYOUT_BTN).click();
      cy.get(START_MIGRATION_MODAL.START_MIGRATION_BTN).click();

      cy.get(TRANSLATED_WORKFLOWS_RESULT_TABLE.ROWS, { timeout: 60000 }).should('have.length', 1);
    });
  }
);
