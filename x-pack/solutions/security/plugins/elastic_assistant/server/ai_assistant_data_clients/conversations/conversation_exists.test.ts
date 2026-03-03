/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { conversationExists } from './conversation_exists';
import { getBasicEmptySearchResponse } from '../../__mocks__/response';
import { getConversationSearchEsMock } from '../../__mocks__/conversations_schema.mock';

describe('conversationExists', () => {
  let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
  let esClient: ReturnType<
    typeof elasticsearchClientMock.createScopedClusterClient
  >['asCurrentUser'];

  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
    esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  });

  test('returns true when conversation exists', async () => {
    esClient.search.mockResponse(getConversationSearchEsMock());

    const result = await conversationExists({
      esClient,
      logger: loggerMock,
      conversationIndex: '.kibana-elastic-ai-assistant-conversations',
      id: 'test-id',
    });

    expect(result).toBe(true);
    expect(esClient.search).toHaveBeenCalledWith({
      query: {
        bool: {
          must: [
            {
              term: {
                _id: 'test-id',
              },
            },
          ],
        },
      },
      _source: false,
      ignore_unavailable: true,
      index: '.kibana-elastic-ai-assistant-conversations',
      size: 0,
    });
  });

  test('returns false when conversation does not exist', async () => {
    esClient.search.mockResponse(getBasicEmptySearchResponse());

    const result = await conversationExists({
      esClient,
      logger: loggerMock,
      conversationIndex: '.kibana-elastic-ai-assistant-conversations',
      id: 'non-existent-id',
    });

    expect(result).toBe(false);
  });

  test('returns false and logs error when search throws error', async () => {
    const error = new Error('Search failed');
    esClient.search.mockRejectedValue(error);

    const result = await conversationExists({
      esClient,
      logger: loggerMock,
      conversationIndex: '.kibana-elastic-ai-assistant-conversations',
      id: 'test-id',
    });

    expect(result).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Error checking if conversation exists: Error: Search failed with id: test-id'
    );
  });
});
