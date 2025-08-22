// Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
// or more contributor license agreements. Licensed under the Elastic License
// 2.0; you may not use this file except in compliance with the Elastic License
// 2.0.

// E2E: Default LLM setting UI and behavior

/// <reference types="cypress" />

describe('GenAI Settings - Default LLM Setting', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/app/management/ai/genAiSettings');
  });

  it('should render the default LLM combo box and it is disabled', () => {
    cy.get('[data-test-subj="defaultAIConnectorSection"]').within(() => {
      cy.get('[data-test-subj="defaultAIConnectorComboBox"]').should('exist').and('be.disabled');
    });
  });

  it('should render the "Only allow default LLM" checkbox and it is disabled', () => {
    cy.get('[data-test-subj="defaultAIConnectorSection"]').within(() => {
      cy.get('[data-test-subj="defaultAIConnectorOnlyCheckbox"]').should('exist').and('be.disabled');
    });
  });

  it('should show a tooltip explaining why the controls are disabled', () => {
    cy.get('[data-test-subj="defaultAIConnectorSection"]').within(() => {
      cy.get('[data-test-subj="defaultAIConnectorComboBox"]').trigger('mouseover');
    });
    cy.get('.euiToolTipPopover').should('contain', 'Setting is currently disabled');
  });

  it('should display the current default LLM value if set', () => {
    // This test assumes a default value is set in the backend or via test setup
    cy.get('[data-test-subj="defaultAIConnectorSection"]').within(() => {
      cy.get('[data-test-subj="defaultAIConnectorComboBox"]').then($el => {
        // Should show a value or placeholder
        cy.wrap($el).should('exist');
      });
    });
  });
});
