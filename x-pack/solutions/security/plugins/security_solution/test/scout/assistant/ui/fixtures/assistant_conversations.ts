/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND,
} from '@kbn/elastic-assistant-common';
import type {
  ConversationCreateProps,
  ConversationResponse,
  FindConversationsResponse,
} from '@kbn/elastic-assistant-common';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import type {
  ApiClientFixture,
  ElasticsearchRoleDescriptor,
  SamlAuth,
  ScoutTestConfig,
} from '@kbn/scout-security';

const PLATFORM_ENGINEER_ROLE = 'platform_engineer';

const spacePath = (spaceId: string, path: string) => `s/${spaceId}${path}`;

const writeHeaders = (cookieHeader: Record<string, string>): Record<string, string> => ({
  ...cookieHeader,
  ...PUBLIC_API_HEADERS,
  'kbn-xsrf': 'scout',
});

/**
 * Returns a session cookie header for the same user `browserAuth.loginAsPlatformEngineer()` logs in as.
 * Conversations are owned by the user that creates them, so they must be seeded with this session.
 */
export const getPlatformEngineerCookieHeader = async ({
  samlAuth,
  config,
  roleDescriptors,
}: {
  samlAuth: SamlAuth;
  config: ScoutTestConfig;
  roleDescriptors: { serverless: Map<string, ElasticsearchRoleDescriptor> };
}): Promise<Record<string, string>> => {
  if (config.serverless) {
    const { cookieHeader } = await samlAuth.asInteractiveUser(PLATFORM_ENGINEER_ROLE);
    return cookieHeader;
  }
  // On stateful, `loginAsPlatformEngineer()` applies the serverless role descriptor to the worker's custom role.
  const roleDescriptor = roleDescriptors.serverless.get(PLATFORM_ENGINEER_ROLE);
  if (!roleDescriptor) {
    throw new Error(`No role descriptor found for ${PLATFORM_ENGINEER_ROLE}`);
  }
  const { cookieHeader } = await samlAuth.asInteractiveUser(roleDescriptor);
  return cookieHeader;
};

/** Creates a conversation owned by the user of `cookieHeader` in the given space. */
export const createConversation = async ({
  apiClient,
  cookieHeader,
  spaceId,
  conversation,
}: {
  apiClient: ApiClientFixture;
  cookieHeader: Record<string, string>;
  spaceId: string;
  conversation: ConversationCreateProps;
}): Promise<ConversationResponse> => {
  const response = await apiClient.post(
    spacePath(spaceId, ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL),
    {
      headers: writeHeaders(cookieHeader),
      responseType: 'json',
      body: conversation,
    }
  );
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to create conversation "${conversation.title}": ${
        response.statusCode
      } ${JSON.stringify(response.body)}`
    );
  }
  return response.body as ConversationResponse;
};

/** Deletes a conversation owned by the user of `cookieHeader`; a missing conversation is ignored. */
export const deleteConversation = async ({
  apiClient,
  cookieHeader,
  spaceId,
  id,
}: {
  apiClient: ApiClientFixture;
  cookieHeader: Record<string, string>;
  spaceId: string;
  id: string;
}): Promise<void> => {
  const response = await apiClient.delete(
    spacePath(spaceId, ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID.replace('{id}', id)),
    { headers: writeHeaders(cookieHeader) }
  );
  if (response.statusCode !== 200 && response.statusCode !== 404) {
    throw new Error(`Failed to delete conversation ${id}: ${response.statusCode}`);
  }
};

/** Deletes the conversations with this exact title owned by the user of `cookieHeader` (leftovers of an interrupted run). */
export const deleteConversationsByTitle = async ({
  apiClient,
  cookieHeader,
  spaceId,
  title,
}: {
  apiClient: ApiClientFixture;
  cookieHeader: Record<string, string>;
  spaceId: string;
  title: string;
}): Promise<void> => {
  const filter = encodeURIComponent(`title:"${title}"`);
  const response = await apiClient.get(
    spacePath(
      spaceId,
      `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND}?filter=${filter}&per_page=100`
    ),
    {
      headers: { ...cookieHeader, ...PUBLIC_API_HEADERS },
      responseType: 'json',
    }
  );
  if (response.statusCode !== 200) {
    throw new Error(`Failed to find conversations "${title}": ${response.statusCode}`);
  }
  const { data } = response.body as FindConversationsResponse;
  for (const { id } of data) {
    await deleteConversation({ apiClient, cookieHeader, spaceId, id });
  }
};
