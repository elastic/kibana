/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { CONVERSATIONS_PAGE, CONVERSATION_ITEM } from '../../screens/conversations';

const TEST_CONVERSATION_NAME = 'Test Conversation for Filtering';

describe('Conversation Filtering by Owner', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    cy.visit('/app/security/conversations');
  });

  it('should display all conversations when is_owner filter is not applied', () => {
    // Ensure we're on the conversations page
    cy.get(CONVERSATIONS_PAGE).should('be.visible');
    
    // Verify that conversations are displayed without filtering
    cy.get(CONVERSATION_ITEM).should('exist');
  });

  it('should display only owner conversations when is_owner flag is true', () => {
    // Create a conversation to ensure we have at least one
    cy.get('[data-test-subj="create-conversation-button"]').click();
    cy.get('[data-test-subj="conversation-name-input"]').type(TEST_CONVERSATION_NAME);
    cy.get('[data-test-subj="save-conversation-button"]').click();
    
    // Apply is_owner filter
    cy.get('[data-test-subj="conversations-filter-is-owner"]').click();
    
    // Verify that only conversations owned by current user are displayed
    cy.get(CONVERSATION_ITEM).should('exist');
    cy.get('[data-test-subj="conversation-owner-info"]').should('contain', 'current-user');
  });

  it('should reset filter when clicking clear filter button', () => {
    // Apply is_owner filter
    cy.get('[data-test-subj="conversations-filter-is-owner"]').click();
    
    // Verify filtered results
    cy.get(CONVERSATION_ITEM).should('exist');
    
    // Clear the filter
    cy.get('[data-test-subj="clear-conversations-filter-button"]').click();
    
    // Verify all conversations are displayed again
    cy.get(CONVERSATION_ITEM).should('exist');
  });
});