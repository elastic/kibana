/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MIGRATION_PANEL_NAME,
  ONBOARDING_SIEM_MIGRATIONS_LIST,
  ONBOARDING_TRANSLATIONS_RESULT_TABLE,
  RULE_MIGRATIONS_GROUP_PANEL,
  RULE_MIGRATION_PROGRESS_BAR,
  REFERENCE_SETS_UPLOAD_STEP,
} from '../../../../screens/siem_migrations';
import { deleteConnectors } from '../../../../tasks/api_calls/common';
import { createBedrockConnector } from '../../../../tasks/api_calls/connectors';
import { cleanMigrationData } from '../../../../tasks/api_calls/siem_migrations';
import { visit } from '../../../../tasks/navigation';
import {
  openUploadRulesFlyout,
  selectMigrationConnector,
  startMigrationFromFlyout,
  toggleMigrateRulesCard,
  renameMigration,
  selectQRadarMigrationSource,
  uploadQRadarRules,
  selectAutomaticMigrationTopic,
} from '../../../../tasks/siem_migrations';
import { GET_STARTED_URL } from '../../../../urls/navigation';
import { role } from '../common/role';
import {
  QRADAR_TEST_RULES_XML,
  QRADAR_TEST_RULES_XML_WITH_REFERENCE_SETS,
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
      visit(GET_STARTED_URL);
    });

    after(() => {
      role.teardown();
    });

    context('First QRadar Migration', () => {
      beforeEach(() => {
        cleanMigrationData();
      });

      it('should be able to create QRadar migrations', () => {
        selectMigrationConnector();
        openUploadRulesFlyout();

        // Select QRadar as the migration source
        selectQRadarMigrationSource();

        // Upload QRadar XML rules
        uploadQRadarRules(QRADAR_TEST_RULES_XML);

        cy.intercept({
          url: '**/qradar/rules',
        }).as('createQRadarRules');

        cy.intercept({
          url: '**/start',
        }).as('startMigration');

        startMigrationFromFlyout();

        cy.wait('@createQRadarRules').its('response.statusCode').should('eq', 200);
        cy.wait('@startMigration')
          .its('request.body.settings')
          .should('have.property', 'skip_prebuilt_rules_matching', false);

        cy.get(RULE_MIGRATIONS_GROUP_PANEL).within(() => {
          cy.get(ONBOARDING_SIEM_MIGRATIONS_LIST).should('have.length', 1);
          cy.get(RULE_MIGRATION_PROGRESS_BAR).should('have.length', 1);
        });
      });

      it('should identify missing reference sets from QRadar rules', () => {
        selectMigrationConnector();
        openUploadRulesFlyout();

        // Select QRadar as the migration source
        selectQRadarMigrationSource();

        // Upload QRadar XML rules that contain reference sets
        uploadQRadarRules(QRADAR_TEST_RULES_XML_WITH_REFERENCE_SETS);

        cy.intercept({
          url: '**/qradar/rules',
        }).as('createQRadarRules');

        cy.intercept({
          url: '**/resources/missing',
        }).as('getMissingResources');

        cy.wait('@createQRadarRules').its('response.statusCode').should('eq', 200);

        // Verify the reference sets step is shown after rules are uploaded
        cy.get(REFERENCE_SETS_UPLOAD_STEP.STEP_NUMBER).should('exist');
        cy.get(REFERENCE_SETS_UPLOAD_STEP.TITLE).should('contain.text', 'reference sets');
      });
    });

    context('On Successful QRadar Translation', () => {
      beforeEach(() => {
        cy.task('esArchiverLoad', {
          archiveName: 'siem_migrations/qradar_rules',
        });

        cy.task('esArchiverLoad', {
          archiveName: 'siem_migrations/qradar_rule_migrations',
        });

        selectAutomaticMigrationTopic();
        toggleMigrateRulesCard();
      });

      afterEach(() => {
        cy.task('esArchiverUnload', {
          archiveName: 'siem_migrations/qradar_rules',
        });

        cy.task('esArchiverUnload', {
          archiveName: 'siem_migrations/qradar_rule_migrations',
        });
      });

      it('should be able to see the result of the completed QRadar migration', () => {
        cy.get(RULE_MIGRATIONS_GROUP_PANEL).within(() => {
          cy.get(ONBOARDING_SIEM_MIGRATIONS_LIST).should('have.length', 1);
          cy.get(ONBOARDING_TRANSLATIONS_RESULT_TABLE.TRANSLATION_STATUS_COUNT('Failed')).should(
            'have.text',
            1
          );
          cy.get(
            ONBOARDING_TRANSLATIONS_RESULT_TABLE.TRANSLATION_STATUS_COUNT('Partially translated')
          ).should('have.text', 2);
          cy.get(
            ONBOARDING_TRANSLATIONS_RESULT_TABLE.TRANSLATION_STATUS_COUNT('Translated')
          ).should('have.text', 1);
        });
      });

      it('should be able to rename the QRadar migration', () => {
        cy.get(ONBOARDING_SIEM_MIGRATIONS_LIST).should('have.length', 1);
        renameMigration('Renamed QRadar Migration');
        cy.get(MIGRATION_PANEL_NAME).should('have.text', 'Renamed QRadar Migration');
      });
    });
  }
);
