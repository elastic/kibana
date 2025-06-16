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
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import type { User } from './auth/types';

import { routeWithNamespace } from '../../../../../../common/utils/security_solution';

/**
 * Creates a Knowledge Base Entry
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param entry The entry to create
 * @param space The Kibana Space to create the entry in (optional)
 * @param expectedHttpCode The expected http status code (optional)
 */
export const createEntry = async ({
  supertest,
  log,
  entry,
  space,
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  log: ToolingLog;
  entry: KnowledgeBaseEntryCreateProps;
  space?: string;
  expectedHttpCode?: number;
}): Promise<KnowledgeBaseEntryResponse> => {
  const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL, space);
  const response = await supertest
    .post(route)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
    .send(entry)
    .expect(expectedHttpCode);

  return response.body;
};

/**
 * Creates a Knowledge Base Entry for a given User
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param entry The entry to create
 * @param user The user to create the entry on behalf of
 * @param space The Kibana Space to create the entry in (optional)
 * @param expectedHttpCode The expected http status code (optional)
 */
export const createEntryForUser = async ({
  supertestWithoutAuth,
  log,
  entry,
  user,
  space,
  expectedHttpCode = 200,
}: {
  supertestWithoutAuth: SuperTest.Agent;
  log: ToolingLog;
  entry: KnowledgeBaseEntryCreateProps;
  user: User;
  space?: string;
  expectedHttpCode?: number;
}): Promise<KnowledgeBaseEntryResponse> => {
  const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL, space);
  const response = await supertestWithoutAuth
    .post(route)
    .auth(user.username, user.password)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
    .send(entry)
    .expect(expectedHttpCode);

  return response.body;
};
