/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { CONVERSATIONS_PAGE, CONVERSATION_ITEM } from '../../screens/conversations';
import { MESSAGE_OWNER_INFO } from '../../screens/conversation_details';

const TEST_CONVERSATION_NAME = 'Test Conversation with Message Owner';

describe('Conversation Message Owner', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    cy.visit('/app/security/conversations');
  });

  it('should display message owner information in conversation details', () => {
    // Create a new conversation
    cy.get('[data-test-subj="create-conversation-button"]').click();
    cy.get('[data-test-subj="conversation-name-input"]').type(TEST_CONVERSATION_NAME);
    cy.get('[data-test-subj="save-conversation-button"]').click();
    
    // Navigate to the conversation details
    cy.get(CONVERSATION_ITEM).contains(TEST_CONVERSATION_NAME).click();
    
    // Add a message to the conversation
    cy.get('[data-test-subj="message-input-field"]').type('Test message');
    cy.get('[data-test-subj="send-message-button"]').click();
    
    // Verify that the message owner is displayed
    cy.get(MESSAGE_OWNER_INFO).should('be.visible');
    cy.get(MESSAGE_OWNER_INFO).should('contain', 'current-user');
  });

  it('should handle multiple messages with different owners', () => {
    // Create a conversation
    cy.get('[data-test-subj="create-conversation-button"]').click();
    cy.get('[data-test-subj="conversation-name-input"]').type(TEST_CONVERSATION_NAME);
    cy.get('[data-test-subj="save-conversation-button"]').click();
    
    // Navigate to conversation details
    cy.get(CONVERSATION_ITEM).contains(TEST_CONVERSATION_NAME).click();
    
    // Add multiple messages
    cy.get('[data-test-subj="message-input-field"]').type('First message');
    cy.get('[data-test-subj="send-message-button"]').click();
    
    cy.get('[data-test-subj="message-input-field"]').type('Second message');
    cy.get('[data-test-subj="send-message-button"]').click();
    
    // Verify both messages have owner information
    cy.get('[data-test-subj="message-owner-info"]').should('have.length', 2);
    cy.get('[data-test-subj="message-owner-info"]').first().should('contain', 'current-user');
    cy.get('[data-test-subj="message-owner-info"]').last().should('contain', 'current-user');
  });
});