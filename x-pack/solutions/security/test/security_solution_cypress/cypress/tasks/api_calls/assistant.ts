/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationCreateProps, ConversationResponse } from '@kbn/elastic-assistant-common';
import type {
  PerformPromptsBulkActionRequestBody,
  PerformPromptsBulkActionResponse,
  PromptCreateProps,
} from '@kbn/elastic-assistant-common/impl/schemas';
import { deleteAllDocuments } from './elasticsearch';
import { getMockConversation, getMockCreatePrompt } from '../../objects/assistant';
import { getSpaceUrl } from '../space';
import { rootRequest, waitForRootRequest, API_HEADERS } from './common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

const createConversation = (
  body?: Partial<ConversationCreateProps>
): Cypress.Chainable<Cypress.Response<ConversationResponse>> =>
  cy.currentSpace().then((spaceId) =>
    rootRequest<ConversationResponse>({
      method: 'POST',
      url: spaceId
        ? getSpaceUrl(spaceId, `api/security_ai_assistant/current_user/conversations`)
        : `api/security_ai_assistant/current_user/conversations`,
      body: getMockConversation(body),
    })
  );

export const waitForConversation = (body?: Partial<ConversationCreateProps>) =>
  waitForRootRequest<ConversationResponse>(createConversation(body));

export const deleteConversations = () => {
  cy.log('Delete all conversations');
  deleteAllDocuments(`.kibana-elastic-ai-assistant-conversations-*`);
};

export const deletePrompts = () => {
  cy.log('Delete all prompts');
  deleteAllDocuments(`.kibana-elastic-ai-assistant-prompts-*`);
};

const bulkPrompts = (
  body: PerformPromptsBulkActionRequestBody
): Cypress.Chainable<Cypress.Response<PerformPromptsBulkActionResponse>> =>
  cy.currentSpace().then((spaceId) =>
    rootRequest<PerformPromptsBulkActionResponse>({
      method: 'POST',
      url: spaceId
        ? getSpaceUrl(spaceId, `api/security_ai_assistant/prompts/_bulk_action`)
        : `api/security_ai_assistant/prompts/_bulk_action`,
      body,
    })
  );
export const waitForCreatePrompts = (prompts: Array<Partial<PromptCreateProps>>) => {
  return waitForRootRequest<PerformPromptsBulkActionResponse>(
    bulkPrompts({ create: prompts.map((prompt) => getMockCreatePrompt(prompt)) })
  );
};

/**
 * Verify that a user profile exists and is searchable
 * This ensures the user profile is seeded properly for sharing functionality
 */
export const verifyUserProfileExists = (username: string): Cypress.Chainable<boolean> => {
  cy.log(`Verifying user profile exists for: ${username}`);

  return cy.currentSpace().then((spaceId) => {
    return rootRequest<{ users: Array<{ uid: string; user: { username: string } }> }>({
      method: 'POST',
      url: spaceId
        ? getSpaceUrl(spaceId, `internal/elastic_assistant/users/_suggest`)
        : `internal/elastic_assistant/users/_suggest`,
      body: { searchTerm: username, size: 10 },
      headers: {
        ...API_HEADERS,
        [ELASTIC_HTTP_VERSION_HEADER]: ['1'], // Override version for elastic assistant internal API
      },
    }).then((response) => {
      const users = response.body.users || [];
      const userExists = users.some((user) => user.user.username === username);
      cy.log(`User profile exists for ${username}: ${userExists}`);
      return userExists;
    });
  });
};

/**
 * Wait for user profile to exist with retry logic
 */
export const waitForUserProfile = (
  username: string,
  maxRetries: number = 10
): Cypress.Chainable<boolean> => {
  cy.log(`Waiting for user profile: ${username}`);

  const checkUserProfile = (attempt: number): Cypress.Chainable<boolean> => {
    if (attempt > maxRetries) {
      cy.log(`Failed to find user profile for ${username} after ${maxRetries} attempts`);
      return cy.wrap(false);
    }

    return verifyUserProfileExists(username).then((exists) => {
      if (exists) {
        cy.log(`User profile found for ${username} on attempt ${attempt}`);
        return cy.wrap(true);
      } else {
        cy.log(`User profile not found for ${username}, attempt ${attempt}/${maxRetries}`);
        return checkUserProfile(attempt + 1);
      }
    });
  };

  return checkUserProfile(1);
};
