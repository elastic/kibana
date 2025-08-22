// Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
// or more contributor license agreements. Licensed under the Elastic License
// 2.0; you may not use this file except in compliance with the Elastic License
// 2.0.

// E2E: Navigation and visibility for GenAI Settings page

/// <reference types="cypress" />

describe('GenAI Settings Navigation', () => {
  beforeEach(() => {
    // Assumes user is logged in and has appropriate permissions
    cy.login();
  });

  it('should navigate to the GenAI Settings page via Management', () => {
    cy.visit('/app/management/ai/genAiSettings');
    cy.get('[data-test-subj="genAiSettingsPage"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-test-subj="genAiSettingsTitle"]').should('contain', 'AI settings');
  });

  it('should show the default LLM setting section', () => {
    cy.visit('/app/management/ai/genAiSettings');
    cy.get('[data-test-subj="defaultAIConnectorSection"]').should('be.visible');
    cy.get('[data-test-subj="defaultAIConnectorTitle"]').should('contain', 'Default LLM');
  });

  it('should show connectors section', () => {
    cy.visit('/app/management/ai/genAiSettings');
    cy.get('[data-test-subj="connectorsSection"]').should('be.visible');
    cy.get('[data-test-subj="connectorsTitle"]').should('contain', 'Connectors');
  });

  it('should show feature visibility section', () => {
    cy.visit('/app/management/ai/genAiSettings');
    cy.get('[data-test-subj="aiFeatureVisibilitySection"]').should('be.visible');
  });
});
