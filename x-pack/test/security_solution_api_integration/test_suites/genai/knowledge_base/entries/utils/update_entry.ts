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
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID,
  KnowledgeBaseEntryUpdateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import type { User } from './auth/types';

import { routeWithNamespace } from '../../../../../../common/utils/security_solution';

/**
 * Updates a Knowledge Base Entry
 * @param supertest The supertest deps
 * @param supertestWithoutAuth The supertest deps
 * @param log The tooling logger
 * @param entry The entry to create
 * @param space The Kibana Space to create the entry in (optional)
 * @param expectedHttpCode The expected http status code (optional)
 */
export const updateEntry = async ({
  supertest,
  supertestWithoutAuth,
  log,
  entry,
  space,
  user,
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  supertestWithoutAuth: SuperTest.Agent;
  log: ToolingLog;
  entry: KnowledgeBaseEntryUpdateProps;
  space?: string;
  user?: User;
  expectedHttpCode?: number;
}): Promise<KnowledgeBaseEntryResponse> => {
  const route = routeWithNamespace(
    ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID,
    space
  ).replace('{id}', entry.id);

  let request = (user ? supertestWithoutAuth : supertest)
    .put(route)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1);

  if (user) {
    request = request.auth(user.username, user.password);
  }

  const response = await request.send(entry).expect(expectedHttpCode);

  return response.body;
};
