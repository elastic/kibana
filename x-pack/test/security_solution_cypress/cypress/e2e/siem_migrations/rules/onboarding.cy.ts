/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ONBOARDING_RULE_MIGRATIONS_LIST,
  ONBOARDING_TRANSLATIONS_RESULT_TABLE,
  RULE_MIGRATIONS_GROUP_PANEL,
  RULE_MIGRATION_PROGRESS_BAR,
} from '../../../screens/siem_migrations';
import { deleteConnectors } from '../../../tasks/api_calls/common';
import { createBedrockConnector } from '../../../tasks/api_calls/connectors';
import { cleanMigrationData } from '../../../tasks/api_calls/siem_migrations';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  openUploadRulesFlyout,
  selectMigrationConnector,
  startMigrationFromFlyout,
  uploadRules,
  toggleMigrateRulesCard,
} from '../../../tasks/siem_migrations';
import { GET_STARTED_URL } from '../../../urls/navigation';

export const SPLUNK_TEST_RULES = [
  {
    preview: false,
    result: {
      id: 'some_id1',
      title: 'Alert with IP Method and URI Filters with Default Severity',
      search:
        'source="testing_data.zip:*" clientip="198.35.1.75" method=POST uri_path="/cart/error.do"',
      description: '',
      'alert.severity': '3',
    },
  },
  {
    preview: false,
    result: {
      id: 'some_id2',
      title: 'New Alert with Index filter',
      search: 'source="testing_data.zip:*"  | search server="MacBookPro.fritz.box" index=main',
      description: 'Tutorial data based on host name',
      'alert.severity': '5',
    },
  },
  {
    preview: false,
    result: {
      id: 'some_id3',
      title: 'Sample Alert in Essentials',
      search: 'source="testing_file.zip:*"',
      description: '',
      'alert.severity': '3',
    },
  },
  {
    preview: false,
    lastrow: true,
    result: {
      id: 'some_id4',
      title: 'Tutorial data based on host name',
      search: 'source="testing_file.zip:*" \n| search host=vendor_sales',
      description: 'Tutorial data based on host name',
      'alert.severity': '5',
    },
  },
];

describe(
  'Rule Migrations - Basic Workflow',
  {
    tags: ['@ess', '@serverless', '@serverlessQA'],
  },
  () => {
    beforeEach(() => {
      deleteConnectors();
      cy.task('esArchiverLoad', {
        archiveName: 'siem_migrations/rules',
      });

      cy.task('esArchiverLoad', {
        archiveName: 'siem_migrations/rule_migrations',
      });
      login(Cypress.env('IS_SERVERLESS') ? 'admin' : undefined);
      createBedrockConnector();
      visit(GET_STARTED_URL);
    });

    after(() => {
      cy.task('esArchiverUnload', {
        archiveName: 'siem_migrations/rules',
      });

      cy.task('esArchiverUnload', {
        archiveName: 'siem_migrations/rule_migrations',
      });
    });

    context('First Migration', () => {
      beforeEach(() => {
        cleanMigrationData();
      });
      it('should be able to create migrations', () => {
        selectMigrationConnector();
        openUploadRulesFlyout();
        uploadRules(SPLUNK_TEST_RULES);
        cy.intercept({
          url: '**/start',
        }).as('startMigration');
        startMigrationFromFlyout();
        cy.wait('@startMigration')
          .its('request.body.settings')
          .should('have.property', 'skip_prebuilt_rules_matching', false);
        cy.get(RULE_MIGRATIONS_GROUP_PANEL).within(() => {
          cy.get(ONBOARDING_RULE_MIGRATIONS_LIST).should('have.length', 1);
          cy.get(RULE_MIGRATION_PROGRESS_BAR).should('have.length', 1);
        });
      });
    });

    context('On Successful Translation', () => {
      context('Migration Results', () => {
        it('should be able to see the result of the completed migration', () => {
          selectMigrationConnector();
          toggleMigrateRulesCard();
          cy.get(RULE_MIGRATIONS_GROUP_PANEL).within(() => {
            cy.get(ONBOARDING_RULE_MIGRATIONS_LIST).should('have.length', 1);
            cy.get(ONBOARDING_TRANSLATIONS_RESULT_TABLE.TRANSLATION_STATUS_COUNT('Failed')).should(
              'have.text',
              1
            );
            cy.get(
              ONBOARDING_TRANSLATIONS_RESULT_TABLE.TRANSLATION_STATUS_COUNT('Partially translated')
            ).should('have.text', 4);
            cy.get(
              ONBOARDING_TRANSLATIONS_RESULT_TABLE.TRANSLATION_STATUS_COUNT('Translated')
            ).should('have.text', 1);
          });
        });
      });
    });
  }
);
