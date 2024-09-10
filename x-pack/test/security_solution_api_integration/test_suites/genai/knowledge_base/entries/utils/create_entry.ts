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
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { routeWithNamespace } from '../../../../../../common/utils/security_solution';

/**
 * Creates a Knowledge Base Entry
 * @param supertest The supertest deps
 * @param log The tooling logger
 * @param entry The entry to create
 * @param namespace The Kibana Space to create the entry in (optional)
 */
export const createEntry = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  entry: KnowledgeBaseEntryCreateProps,
  namespace?: string
): Promise<KnowledgeBaseEntryResponse> => {
  const route = routeWithNamespace(ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL, namespace);
  const response = await supertest
    .post(route)
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .send(entry);
  if (response.status !== 200) {
    throw new Error(
      `Unexpected non 200 ok when attempting to create entry: ${JSON.stringify(
        response.status
      )},${JSON.stringify(response, null, 4)}`
    );
  } else {
    return response.body;
  }
};
