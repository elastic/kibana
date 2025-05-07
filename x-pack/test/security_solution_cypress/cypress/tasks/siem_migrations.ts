/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as SELECTORS from '../screens/siem_migrations';

export const toggleSiemMigrationsCard = () => {
  cy.get(SELECTORS.ONBOARDING_SIEM_MIGRATION_CARDS.AI_CONNECTORS).click();
};

export const selectMigrationConnector = () => {
  cy.get(SELECTORS.ONBOARDING_SIEM_MIGRATION_TOPIC).click();
  toggleSiemMigrationsCard();
  cy.get(SELECTORS.ONBOARDING_SIEM_MIGRATION_CARDS.SELECT_CONNECTORS).click();
  cy.get(SELECTORS.FAKE_BEDROCK_SELECTOR).click();
  cy.get(SELECTORS.ONBOARDING_SIEM_MIGRATION_CARDS.SELECT_CONNECTORS).should(
    'have.text',
    'bedrock fake'
  );
  cy.get(SELECTORS.ONBOARDING_SIEM_MIGRATION_CARDS.AI_CONNECTORS).within(() => {
    cy.get('[title = "Completed"]').should('exist');
  });
};

export const toggleMigrateRulesCard = () => {
  cy.get(SELECTORS.ONBOARDING_SIEM_MIGRATION_CARDS.MIGRATE_RULES).click();
};

export const openUploadRulesFlyout = () => {
  toggleMigrateRulesCard();
  cy.get(SELECTORS.UPLOAD_RULES_BTN).click();
  cy.get(SELECTORS.UPLOAD_RULES_FLYOUT).should('exist');
};

export const uploadRules = (splunkRulesJSON: object) => {
  cy.get(SELECTORS.UPLOAD_RULES_FILE_PICKER).selectFile({
    contents: Cypress.Buffer.from(JSON.stringify(splunkRulesJSON)),
    fileName: 'rules.json',
    mimeType: 'text/plain',
  });
  cy.get(SELECTORS.UPLOAD_RULES_FILE_BTN).should('not.be.disabled').click();
};

export const startMigrationFromFlyout = () => {
  cy.get(SELECTORS.START_MIGRATION_FROM_FLYOUT_BTN).should('not.be.disabled');
  cy.get(SELECTORS.START_MIGRATION_FROM_FLYOUT_BTN).click();
  cy.get(SELECTORS.UPLOAD_RULES_FLYOUT).should('not.exist');
};

export const saveUpdatedTranslatedRuleQuery = () => {
  cy.get(SELECTORS.TRANSLATED_RULE_SAVE_BTN).click();
  cy.get(SELECTORS.TRANSLATED_RULE_SAVE_BTN).should('not.exist');
};

export const updateTranslatedRuleQuery = (newQuery: string) => {
  cy.get(SELECTORS.TRANSLATED_RULE_EDIT_BTN).click();
  cy.get(SELECTORS.TRANSLATED_RULE_SAVE_BTN).should('be.visible');

  cy.get(SELECTORS.TRANSLATED_RULE_QUERY_EDITOR_INPUT).type(
    Cypress.platform === 'darwin' ? '{cmd+a}' : '{ctrl+a}',
    { force: true }
  );

  cy.get(SELECTORS.TRANSLATED_RULE_QUERY_EDITOR_INPUT).type(newQuery, { force: true });
};

export const editTranslatedRuleByRow = (rowNum: number) => {
  cy.get(SELECTORS.TRANSLATED_RULES_RESULT_TABLE.RULE_NAME).eq(rowNum).click();
  cy.get(SELECTORS.TRANSLATED_RULE_DETAILS_FLYOUT).should('be.visible');
};

export const reprocessFailedRules = () => {
  cy.get(SELECTORS.REPROCESS_FAILED_RULES_BTN).click();
};
