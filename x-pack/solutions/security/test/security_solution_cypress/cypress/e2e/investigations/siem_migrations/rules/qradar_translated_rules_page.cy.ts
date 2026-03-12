/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRANSLATED_RULES_RESULT_TABLE,
  TRANSLATED_RULE_DETAILS_FLYOUT,
} from '../../../../screens/siem_migrations';
import { deleteConnectors } from '../../../../tasks/api_calls/common';
import { createBedrockConnector } from '../../../../tasks/api_calls/connectors';
import { visit } from '../../../../tasks/navigation';
import {
  editTranslatedRuleByRow,
  selectMigrationConnector,
  navigateToTranslatedRulesPage,
  switchToOverviewTab,
} from '../../../../tasks/siem_migrations';
import { GET_STARTED_URL } from '../../../../urls/navigation';
import { role } from '../common/role';

// TODO: https://github.com/elastic/kibana/issues/228940 remove @skipInServerlessMKI tag when privileges issue is fixed
describe(
  'Rule Migrations - QRadar Translated Rules Page',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
      role.setup();
    });

    beforeEach(() => {
      deleteConnectors();
      cy.task('esArchiverLoad', {
        archiveName: 'siem_migrations/qradar_rules',
      });

      cy.task('esArchiverLoad', {
        archiveName: 'siem_migrations/qradar_rule_migrations',
      });

      createBedrockConnector();

      role.login();
      visit(GET_STARTED_URL);
      selectMigrationConnector();
      navigateToTranslatedRulesPage();
    });

    after(() => {
      role.teardown();

      cy.task('esArchiverUnload', {
        archiveName: 'siem_migrations/qradar_rules',
      });

      cy.task('esArchiverUnload', {
        archiveName: 'siem_migrations/qradar_rule_migrations',
      });
    });

    it('should be able to see the result of the completed QRadar migration', () => {
      cy.get(TRANSLATED_RULES_RESULT_TABLE.ROWS).should('have.length', 4);
      cy.get(TRANSLATED_RULES_RESULT_TABLE.STATUS('partial')).should('have.length', 2);
      cy.get(TRANSLATED_RULES_RESULT_TABLE.STATUS('full')).should('have.length', 1);
      cy.get(TRANSLATED_RULES_RESULT_TABLE.STATUS('failed')).should('have.length', 1);
    });

    it('should display MITRE ATT&CK mappings in rule details', () => {
      cy.get(TRANSLATED_RULES_RESULT_TABLE.TABLE).should('be.visible');

      // Click on the first rule (Authentication Success) which has MITRE mappings
      editTranslatedRuleByRow(0);

      // Verify the rule details flyout is displayed
      cy.get(TRANSLATED_RULE_DETAILS_FLYOUT).should('be.visible');

      // Switch to the Overview tab
      switchToOverviewTab();

      // Verify MITRE ATT&CK threat information is displayed
      // The rule should have Initial Access tactic with Valid Accounts technique
      cy.get(TRANSLATED_RULE_DETAILS_FLYOUT).within(() => {
        cy.contains('MITRE ATT&CK').should('exist');
        cy.contains('Initial Access').should('exist');
        cy.contains('Valid Accounts').should('exist');
      });
    });
  }
);
