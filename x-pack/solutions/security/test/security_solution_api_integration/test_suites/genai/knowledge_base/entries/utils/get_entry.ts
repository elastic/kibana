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
  ReadKnowledgeBaseEntryResponse,
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID,
  ReadKnowledgeBaseEntryRequestParamsInput,
} from '@kbn/elastic-assistant-common';
import type { User } from './auth/types';

import { routeWithNamespace } from '../../../../../../common/utils/security_solution';

/**
 * Get Knowledge Base Entry
 * @param supertest The supertest deps
 * @param supertestWithoutAuth The supertest deps
 * @param log The tooling logger
 * @param params Params for find API (optional)
 * @param space The Kibana Space to find entries in (optional)
 * @param user The user to perform search on behalf of
 */

export const getEntry = async ({
  supertest,
  supertestWithoutAuth,
  log,
  user,
  params,
  space,
}: {
  supertest: SuperTest.Agent;
  supertestWithoutAuth: SuperTest.Agent;
  log: ToolingLog;
  user?: User;
  params: ReadKnowledgeBaseEntryRequestParamsInput;
  space?: string;
}): Promise<ReadKnowledgeBaseEntryResponse> => {
  const route = routeWithNamespace(
    ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID,
    space
  ).replace('{id}', params.id);
  const request = user ? supertestWithoutAuth.auth(user.username, user.password) : supertest;
  const response = await request
    .get(route)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
    .send();
  if (response.status !== 200) {
    throw new Error(
      `Unexpected non 200 ok when attempting to find entries: ${JSON.stringify(
        response.status
      )},${JSON.stringify(response, null, 4)}`
    );
  } else {
    return response.body;
  }
};
