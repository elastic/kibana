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
  DeleteKnowledgeBaseEntryRequestParamsInput,
  DeleteKnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import type { User } from './auth/types';

import { routeWithNamespace } from '../../../../../../common/utils/security_solution';

/**
 * Delete Knowledge Base Entry
 * @param supertest The supertest deps
 * @param supertestWithoutAuth The supertest deps
 * @param log The tooling logger
 * @param params Params for delete API (optional)
 * @param space The Kibana Space to delete entries in (optional)
 * @param user The user to perform search on behalf of
 */

export const deleteEntry = async ({
  supertest,
  supertestWithoutAuth,
  log,
  user,
  params,
  space,
  expectedHttpCode = 200,
}: {
  supertest: SuperTest.Agent;
  supertestWithoutAuth: SuperTest.Agent;
  log: ToolingLog;
  user?: User;
  params: DeleteKnowledgeBaseEntryRequestParamsInput;
  space?: string;
  expectedHttpCode?: number;
}): Promise<DeleteKnowledgeBaseEntryResponse> => {
  const route = routeWithNamespace(
    ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BY_ID,
    space
  ).replace('{id}', params.id);
  let request = (user ? supertestWithoutAuth : supertest)
    .delete(route)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1);

  if (user) {
    request = request.auth(user.username, user.password);
  }

  const response = await request.send().expect(expectedHttpCode);

  if (response.status !== expectedHttpCode) {
    throw new Error(
      `Unexpected non ${expectedHttpCode} ok when attempting to delete entry: ${JSON.stringify(
        response.status
      )},${JSON.stringify(response, null, 4)}`
    );
  } else {
    return response.body;
  }
};
