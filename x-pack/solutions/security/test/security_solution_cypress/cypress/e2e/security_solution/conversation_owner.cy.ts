/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { CONVERSATIONS_PAGE, CONVERSATION_ITEM } from '../../screens/conversations';
import { CONVERSATION_CREATE_BUTTON } from '../../screens/conversation_details';

const TEST_CONVERSATION_NAME = 'Test Conversation for Owner Check';

describe('Conversation Owner Functionality', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    cy.visit('/app/security/conversations');
  });

  it('should create a conversation and verify owner is set correctly', () => {
    // Create a new conversation
    cy.get(CONVERSATION_CREATE_BUTTON).click();
    cy.get('[data-test-subj="conversation-name-input"]').type(TEST_CONVERSATION_NAME);
    cy.get('[data-test-subj="save-conversation-button"]').click();
    
    // Verify conversation is created and owner is displayed
    cy.get(CONVERSATIONS_PAGE).should('be.visible');
    cy.get(CONVERSATION_ITEM).contains(TEST_CONVERSATION_NAME).should('exist');
    
    // Click on the conversation to view details
    cy.get(CONVERSATION_ITEM).contains(TEST_CONVERSATION_NAME).click();
    
    // Verify owner information is displayed in conversation details
    cy.get('[data-test-subj="conversation-owner-info"]').should('be.visible');
  });

  it('should filter conversations by owner when is_owner flag is set', () => {
    // Ensure we're on the conversations page
    cy.visit('/app/security/conversations');
    
    // Filter conversations by current user (is_owner=true)
    cy.get('[data-test-subj="conversations-filter-is-owner"]').click();
    
    // Verify that only conversations owned by current user are displayed
    cy.get(CONVERSATION_ITEM).should('exist');
    
    // Check that the conversation owner matches the logged-in user
    cy.get('[data-test-subj="conversation-owner-info"]').should('contain', 'current-user');
  });
});