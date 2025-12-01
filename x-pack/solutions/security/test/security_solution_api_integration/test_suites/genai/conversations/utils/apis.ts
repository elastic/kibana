/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { replaceParams } from '@kbn/openapi-common/shared';
import type {
  BulkActionBase,
  ConversationCreateProps,
  ConversationUpdateProps,
  FindConversationsRequestQuery,
} from '@kbn/elastic-assistant-common';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
} from '@kbn/elastic-assistant-common';

import { routeWithNamespace } from '@kbn/detections-response-ftr-services';
import type { User } from '../../utils/auth/types';

/**
 * Source: Partial version of the PerformBulkActionRequestBody
 * Used for testing bad request error handling when user does not pass required attributes
 */
export interface PartialPerformBulkActionRequestBody {
  delete?: Partial<BulkActionBase>;
  create?: Partial<ConversationCreateProps>[];
  update?: Partial<ConversationUpdateProps>[];
}

const configureTest = ({
  test,
  user,
  internal,
}: {
  test: SuperTest.Test;
  user?: User;
  internal?: boolean;
}) => {
  const configuredTest = test
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, internal ? API_VERSIONS.internal.v1 : API_VERSIONS.public.v1)
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');
  if (user) {
    configuredTest.auth(user.username, user.password);
  }
  return configuredTest;
};

export const getConversationsApis = ({
  user,
  supertest,
}: {
  supertest: SuperTest.Agent;
  user?: User;
}) => {
  return {
    /**
     * Creates a Conversation
     * @param param0
     * @returns
     */
    create: async ({
      conversation,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      conversation: ConversationCreateProps;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL, kibanaSpace);
      const configuredTest = configureTest({ test: supertest.post(route), user });
      const response = await configuredTest.send(conversation).expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Finds Conversations
     * @param param0
     * @returns
     */
    find: async ({
      query,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      query: FindConversationsRequestQuery;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND, kibanaSpace);
      const configuredTest = configureTest({ test: supertest.get(route), user });
      const response = await configuredTest.query(query).expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Gets a Conversation
     */
    get: async ({
      id,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      id: string;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        replaceParams(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID, { id }),
        kibanaSpace
      );
      const configuredTest = configureTest({ test: supertest.get(route), user });
      const response = await configuredTest.expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Updates a Conversation
     */
    update: async ({
      id,
      conversation,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      id: string;
      conversation: Partial<ConversationUpdateProps>;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        replaceParams(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID, { id }),
        kibanaSpace
      );
      const configuredTest = configureTest({ test: supertest.put(route), user });
      const response = await configuredTest.send(conversation).expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Deletes a Conversation
     */
    delete: async ({
      id,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      id: string;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        replaceParams(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID, { id }),
        kibanaSpace
      );
      const configuredTest = configureTest({ test: supertest.delete(route), user });
      const response = await configuredTest.expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Deletes all Conversations
     */
    deleteAll: async ({
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL, kibanaSpace);
      const configuredTest = configureTest({ test: supertest.delete(route), user });
      const response = await configuredTest.expect(expectedHttpCode);

      return response.body;
    },

    /**
     * Performs bulk actions
     * @param param0
     * @returns
     */
    bulk: async ({
      bulkActions,
      kibanaSpace = 'default',
      expectedHttpCode = 200,
    }: {
      bulkActions: PartialPerformBulkActionRequestBody;
      kibanaSpace?: string;
      expectedHttpCode?: number;
    }) => {
      const route = routeWithNamespace(
        ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
        kibanaSpace
      );
      const configuredTest = configureTest({ test: supertest.post(route), user, internal: true });
      const response = await configuredTest.send(bulkActions).expect(expectedHttpCode);

      return response.body;
    },
  };
};
