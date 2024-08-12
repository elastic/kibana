/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindConversationsResponse } from '@kbn/elastic-assistant-common';
import { getSpaceUrl } from '../space';
import { rootRequest } from './common';

export const getConversations = (spaceId?: string) =>
  rootRequest<FindConversationsResponse>({
    method: 'GET',
    url: spaceId
      ? getSpaceUrl(spaceId, `api/security_ai_assistant/current_user/conversations/_find`)
      : `api/security_ai_assistant/current_user/conversations/_find`,
  });

export const deleteConversations = () => {
  cy.currentSpace().then((spaceId) => {
    getConversations(spaceId).then(($response) => {
      if ($response.body) {
        const ids = $response.body.data.map((conversation) => {
          return conversation.id;
        });

        //  /api/security_ai_assistant/current_user/conversations/_bulk_action
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
