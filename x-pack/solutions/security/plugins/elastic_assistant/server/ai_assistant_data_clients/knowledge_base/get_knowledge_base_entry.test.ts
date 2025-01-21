/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, Logger } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getKnowledgeBaseEntry } from './get_knowledge_base_entry';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import {
  getKnowledgeBaseEntryMock,
  getKnowledgeBaseEntrySearchEsMock,
} from '../../__mocks__/knowledge_base_entry_schema.mock';
export const mockUser = {
  username: 'my_username',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;
describe('getKnowledgeBaseEntry', () => {
  let loggerMock: Logger;
  beforeEach(() => {
    jest.clearAllMocks();
    loggerMock = loggingSystemMock.createLogger();
  });

  test('it returns an entry as expected if the entry is found', async () => {
    const data = getKnowledgeBaseEntrySearchEsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const entry = await getKnowledgeBaseEntry({
      esClient,
      knowledgeBaseIndex: '.kibana-elastic-ai-assistant-knowledge-base',
      id: '1',
      logger: loggerMock,
      user: mockUser,
    });
    const expected = getKnowledgeBaseEntryMock();
    expect(entry).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getKnowledgeBaseEntrySearchEsMock();
    data.hits.hits = [];
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const entry = await getKnowledgeBaseEntry({
      esClient,
      knowledgeBaseIndex: '.kibana-elastic-ai-assistant-knowledge-base',
      id: '1',
      logger: loggerMock,
      user: mockUser,
    });
    expect(entry).toEqual(null);
  });

  test('it throws an error if the search fails', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockRejectedValue(new Error('search failed'));
    await expect(
      getKnowledgeBaseEntry({
        esClient,
        knowledgeBaseIndex: '.kibana-elastic-ai-assistant-knowledge-base',
        id: '1',
        logger: loggerMock,
        user: mockUser,
      })
    ).rejects.toThrowError('search failed');
  });
});
