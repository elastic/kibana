// Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
// or more contributor license agreements. Licensed under the Elastic License
// 2.0; you may not use this file except in compliance with the Elastic License
// 2.0.

// E2E: Permissions and access control for GenAI Settings

/// <reference types="cypress" />

describe('GenAI Settings - Permissions', () => {
  it('should not allow users without Management > Advanced Settings privilege to access the page', () => {
    // Simulate a user without the required privilege
    cy.loginAs('user_without_advanced_settings');
    cy.visit('/app/management/ai/genAiSettings');
    cy.get('body').then($body => {
      if ($body.find('[data-test-subj="genAiSettingsPage"]').length > 0) {
        cy.get('[data-test-subj="genAiSettingsPage"]').should('not.be.visible');
      } else {
        cy.contains('You do not have permission').should('exist');
      }
    });
  });

  it('should allow users with Management > Advanced Settings privilege to view (but not edit) the default LLM setting', () => {
    cy.loginAs('user_with_advanced_settings');
    cy.visit('/app/management/ai/genAiSettings');
    cy.get('[data-test-subj="genAiSettingsPage"]').should('be.visible');
    cy.get('[data-test-subj="defaultAIConnectorComboBox"]').should('exist').and('be.disabled');
    cy.get('[data-test-subj="defaultAIConnectorOnlyCheckbox"]').should('exist').and('be.disabled');
  });
});
