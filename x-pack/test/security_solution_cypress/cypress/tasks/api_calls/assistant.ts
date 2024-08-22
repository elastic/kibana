/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationCreateProps,
  ConversationResponse,
  FindConversationsResponse,
  FindPromptsResponse,
} from '@kbn/elastic-assistant-common';
import { getMockConversation } from '../../objects/assistant';
import { getSpaceUrl } from '../space';
import { rootRequest, waitForRootRequest } from './common';

export const getConversations = (spaceId?: string) =>
  rootRequest<FindConversationsResponse>({
    method: 'GET',
    url: spaceId
      ? getSpaceUrl(spaceId, `api/security_ai_assistant/current_user/conversations/_find`)
      : `api/security_ai_assistant/current_user/conversations/_find`,
  });

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
  cy.currentSpace().then((spaceId) => {
    getConversations(spaceId).then(($response) => {
      if ($response.body) {
        const ids = $response.body.data.map((conversation) => {
          return conversation.id;
        });

        if (ids.length) {
          rootRequest({
            method: 'POST',
            url: spaceId
              ? getSpaceUrl(
                  spaceId,
                  `internal/elastic_assistant/current_user/conversations/_bulk_action`
                )
              : `internal/elastic_assistant/current_user/conversations/_bulk_action`,
            headers: {
              'kbn-xsrf': 'cypress-creds',
              'x-elastic-internal-origin': 'security-solution',
              'elastic-api-version': '1',
            },
            body: {
              delete: { ids },
            },
          });
        }
      }
    });
  });
};

export const getPrompts = (spaceId?: string) =>
  rootRequest<FindPromptsResponse>({
    method: 'GET',
    url: spaceId
      ? getSpaceUrl(spaceId, `api/security_ai_assistant/prompts/_find`)
      : `api/security_ai_assistant/prompts/_find`,
  });

export const deletePrompts = () => {
  cy.currentSpace().then((spaceId) => {
    getPrompts(spaceId).then(($response) => {
      if ($response.body) {
        const ids = $response.body.data.map((prompt) => {
          return prompt.id;
        });

        if (ids.length) {
          rootRequest({
            method: 'POST',
            url: spaceId
              ? getSpaceUrl(spaceId, `api/security_ai_assistant/prompts/_bulk_action`)
              : `api/security_ai_assistant/prompts/_bulk_action`,
            body: {
              delete: { ids },
            },
          });
        }
      }
    });
  });
};
