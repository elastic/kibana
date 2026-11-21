/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UPLOAD_WORKFLOWS_FILE_PICKER,
  UPLOAD_WORKFLOWS_SUBMIT_BTN,
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
  uploadTinesStories,
} from '../../../../tasks/siem_migrations';
import { GET_STARTED_URL } from '../../../../urls/navigation';
import { role } from '../common/role';
import { TINES_TEST_STORY } from './mock';

// TODO: https://github.com/elastic/kibana/issues/228940 remove @skipInServerlessMKI tag when privileges issue is fixed
describe(
  'Workflow Migrations - Onboarding',
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
          return createBedrockConnector().then(() => true);
        },
        { interval: 500, timeout: 12000 }
      );
      suppressGlobalAnnouncements();
      visit(`${GET_STARTED_URL}/siem_migrations`);
    });

    after(() => {
      role.teardown();
      cleanWorkflowsMigrationData();
    });

    it('should be able to create a workflow migration by uploading a Tines story export', () => {
      selectMigrationConnector();
      openUploadWorkflowsFlyout();
      cy.get(WORKFLOWS_FLYOUT_TRANSLATE_BTN).should('be.disabled');
      saveDefaultMigrationName();
      uploadTinesStories(TINES_TEST_STORY);
      cy.get(WORKFLOWS_FLYOUT_TRANSLATE_BTN).should('not.be.disabled');
    });

    it('should not allow uploading a file that is not a Tines story export', () => {
      selectMigrationConnector();
      openUploadWorkflowsFlyout();
      saveDefaultMigrationName();
      cy.get(UPLOAD_WORKFLOWS_FILE_PICKER).selectFile({
        contents: Cypress.Buffer.from(JSON.stringify({ name: 'A story without agents' })),
        fileName: 'invalid.json',
        mimeType: 'application/json',
      });
      cy.contains('The file does not contain a valid Tines story export').should('exist');
      cy.get(UPLOAD_WORKFLOWS_SUBMIT_BTN).should('be.disabled');
    });
  }
);
