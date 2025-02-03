/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import {
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
  API_VERSIONS,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryUpdateProps,
  PerformKnowledgeBaseEntryBulkActionResponse,
} from '@kbn/elastic-assistant-common';
import type { User } from './auth/types';

import { routeWithNamespace } from '../../../../../../common/utils/security_solution';

/**
 * Performs bulk actions on Knowledge Base entries
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param payload The bulk action payload
 * @param space The Kibana Space to update the entry in (optional)
 * @param expectedHttpCode The expected http status code (optional)
 */
export const bulkActionKnowledgeBaseEntries = async ({
  supertest,
  log,
  payload,
  space,
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  log: ToolingLog;
  payload: {
    create?: KnowledgeBaseEntryCreateProps[];
    update?: KnowledgeBaseEntryUpdateProps[];
    delete?: { ids: string[] };
  };
  space?: string;
  expectedHttpCode?: number;
}): Promise<PerformKnowledgeBaseEntryBulkActionResponse> => {
  const route = routeWithNamespace(
    ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
    space
  );
  const response = await supertest
    .post(route)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
    .send(payload)
    .expect(expectedHttpCode);

  return response.body;
};

/**
 * Performs bulk actions on Knowledge Base entries for a given User
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param payload The bulk action payload
 * @param user The user to update the entry on behalf of
 * @param space The Kibana Space to update the entry in (optional)
 * @param expectedHttpCode The expected http status code (optional)
 */
export const bulkActionKnowledgeBaseEntriesForUser = async ({
  supertestWithoutAuth,
  log,
  payload,
  user,
  space,
  expectedHttpCode = 200,
}: {
  supertestWithoutAuth: SuperTest.Agent;
  log: ToolingLog;
  payload: {
    create?: KnowledgeBaseEntryCreateProps[];
    update?: KnowledgeBaseEntryUpdateProps[];
    delete?: { ids: string[] };
  };
  user: User;
  space?: string;
  expectedHttpCode?: number;
}): Promise<PerformKnowledgeBaseEntryBulkActionResponse> => {
  const route = routeWithNamespace(
    ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
    space
  );
  const response = await supertestWithoutAuth
    .post(route)
    .auth(user.username, user.password)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
    .send(payload)
    .expect(expectedHttpCode);

  return response.body;
};
