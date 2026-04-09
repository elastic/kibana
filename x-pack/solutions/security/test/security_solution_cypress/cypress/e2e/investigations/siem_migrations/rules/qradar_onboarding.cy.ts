/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ONBOARDING_SIEM_MIGRATIONS_LIST,
  RULE_MIGRATIONS_GROUP_PANEL,
  RULE_MIGRATION_DESCRIPTION,
  REFERENCE_SETS_UPLOAD_STEP,
} from '../../../../screens/siem_migrations';
import { TOASTER_MESSAGE } from '../../../../screens/alerts_detection_rules';
import { deleteConnectors } from '../../../../tasks/api_calls/common';
import { createBedrockConnector } from '../../../../tasks/api_calls/connectors';
import { cleanMigrationData } from '../../../../tasks/api_calls/siem_migrations';
import { visit } from '../../../../tasks/navigation';
import {
  openUploadRulesFlyout,
  selectMigrationConnector,
  setMigrationName,
  startMigrationFromFlyout,
  selectQRadarMigrationSource,
  uploadQRadarRules,
} from '../../../../tasks/siem_migrations';
import { GET_STARTED_URL } from '../../../../urls/navigation';
import { role } from '../common/role';
import {
  QRADAR_TEST_RULES_XML,
  QRADAR_TEST_RULES_XML_WITH_REFERENCE_SETS,
  QRADAR_BUILDING_BLOCK_ONLY_XML,
} from '../../../../fixtures/siem_migrations/qradar_test_data';

// TODO: https://github.com/elastic/kibana/issues/228940 remove @skipInServerlessMKI tag when privileges issue is fixed
describe(
  'Rule Migrations - QRadar Basic Workflow',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
      role.setup();
    });

    beforeEach(() => {
      deleteConnectors();
      createBedrockConnector();
      role.login();
      cy.log('Creating Bedrock connector');
      visit(`${GET_STARTED_URL}/siem_migrations`);
      selectMigrationConnector();
      openUploadRulesFlyout();
      selectQRadarMigrationSource();
      setMigrationName();
    });

    afterEach(() => {
      cleanMigrationData();
    });

    after(() => {
      role.teardown();
    });

    it('should be able to create and start QRadar migrations', () => {
      cy.intercept({
        url: '**/qradar/rules',
      }).as('createQRadarRules');

      cy.intercept({
        url: '**/start',
      }).as('startMigration');

      uploadQRadarRules(QRADAR_TEST_RULES_XML);

      startMigrationFromFlyout();

      cy.wait('@createQRadarRules').its('response.statusCode').should('eq', 200);
      cy.wait('@startMigration')
        .its('request.body.settings')
        .should('have.property', 'skip_prebuilt_rules_matching', false);

      cy.get(RULE_MIGRATIONS_GROUP_PANEL).within(() => {
        cy.get(ONBOARDING_SIEM_MIGRATIONS_LIST).should('have.length', 1);
      });
    });

    it('should show error toast when uploading only building block rules', () => {
      uploadQRadarRules(QRADAR_BUILDING_BLOCK_ONLY_XML);

      cy.get(TOASTER_MESSAGE).should('be.visible');
      cy.contains('Failed to upload rules file').should('be.visible');
    });

    it('should exclude building block rules from the uploaded count and ready panel count', () => {
      uploadQRadarRules(QRADAR_TEST_RULES_XML);

      // Success toast count should exclude building block rules (3 total, 1 building block = 2 eligible)
      cy.contains('2 rules uploaded').should('be.visible');

      // Close the flyout to see the ready panel
      cy.get('[data-test-subj="euiFlyoutCloseButton"]').click();

      // Ready panel count should also exclude building block rules
      cy.get(RULE_MIGRATION_DESCRIPTION).should('contain.text', '2 rules');
    });

    it('should identify missing reference sets from QRadar rules', () => {
      cy.intercept({
        url: '**/qradar/rules',
      }).as('createQRadarRules');

      uploadQRadarRules(QRADAR_TEST_RULES_XML_WITH_REFERENCE_SETS);

      cy.wait('@createQRadarRules').its('response.statusCode').should('eq', 200);

      // Verify the reference sets step is shown after rules are uploaded
      cy.get(REFERENCE_SETS_UPLOAD_STEP.STEP_NUMBER).should('exist');
      cy.get(REFERENCE_SETS_UPLOAD_STEP.TITLE).should('contain.text', 'reference sets');
    });
  }
);
