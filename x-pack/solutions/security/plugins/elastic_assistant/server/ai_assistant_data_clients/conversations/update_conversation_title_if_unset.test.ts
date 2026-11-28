/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { updateConversationTitleIfUnset } from './update_conversation_title_if_unset';
import type { EsConversationSchema } from './types';
import { getBasicEmptySearchResponse } from '../../__mocks__/response';
import { authenticatedUser } from '../../__mocks__/user';

const CONVERSATION_INDEX = '.kibana-elastic-ai-assistant-conversations-default';
const BACKING_INDEX = '.ds-.kibana-elastic-ai-assistant-conversations-default-000001';
const NEW_CHAT = 'New chat';

const getTitleSearchResponse = (
  title: string,
  seqNo: number
): estypes.SearchResponse<Pick<EsConversationSchema, 'title'>> => ({
  took: 1,
  timed_out: false,
  _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
  hits: {
    total: 1,
    max_score: 0,
    hits: [
      {
        _id: 'conversation-1',
        _index: BACKING_INDEX,
        _seq_no: seqNo,
        _primary_term: 1,
        _source: { title },
      },
    ],
  },
});

const versionConflict = new errors.ResponseError({
  statusCode: 409,
  body: { error: { type: 'version_conflict_engine_exception' } },
  headers: {},
  warnings: [],
  meta: {} as never,
});

describe('updateConversationTitleIfUnset', () => {
  let esClient: ReturnType<
    typeof elasticsearchClientMock.createScopedClusterClient
  >['asCurrentUser'];
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const update = () =>
    updateConversationTitleIfUnset({
      esClient,
      logger,
      conversationIndex: CONVERSATION_INDEX,
      id: 'conversation-1',
      title: 'Generated title',
      placeholderTitle: NEW_CHAT,
      user: authenticatedUser,
    });

  beforeEach(() => {
    esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    logger = loggingSystemMock.createLogger();
  });

  it('writes the title guarded by the seq_no it read when the title is still the placeholder', async () => {
    esClient.search.mockResponse(getTitleSearchResponse(NEW_CHAT, 7));

    await expect(update()).resolves.toBe(true);

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: BACKING_INDEX,
        id: 'conversation-1',
        if_seq_no: 7,
        if_primary_term: 1,
        doc: expect.objectContaining({ title: 'Generated title' }),
      })
    );
  });

  it('writes the title when the conversation has an empty title', async () => {
    esClient.search.mockResponse(getTitleSearchResponse('', 3));

    await expect(update()).resolves.toBe(true);

    expect(esClient.update).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a title the user has set', async () => {
    esClient.search.mockResponse(getTitleSearchResponse('Lucky title', 9));

    await expect(update()).resolves.toBe(false);

    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('does not write when the conversation is not found', async () => {
    esClient.search.mockResponse(getBasicEmptySearchResponse());

    await expect(update()).resolves.toBe(false);

    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('does not overwrite a rename that lands between the read and the write', async () => {
    esClient.search
      .mockResponseOnce(getTitleSearchResponse(NEW_CHAT, 7))
      .mockResponseOnce(getTitleSearchResponse('Lucky title', 8));
    esClient.update.mockRejectedValueOnce(versionConflict);

    await expect(update()).resolves.toBe(false);

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.update).toHaveBeenCalledTimes(1);
  });

  it('writes the title after a concurrent write that left the title unset', async () => {
    esClient.search
      .mockResponseOnce(getTitleSearchResponse(NEW_CHAT, 7))
      .mockResponseOnce(getTitleSearchResponse(NEW_CHAT, 8));
    esClient.update.mockRejectedValueOnce(versionConflict);

    await expect(update()).resolves.toBe(true);

    expect(esClient.update).toHaveBeenCalledTimes(2);
    expect(esClient.update).toHaveBeenLastCalledWith(expect.objectContaining({ if_seq_no: 8 }));
  });

  it('only searches conversations owned by the user', async () => {
    esClient.search.mockResponse(getTitleSearchResponse(NEW_CHAT, 7));

    await update();

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: CONVERSATION_INDEX,
        seq_no_primary_term: true,
        query: {
          bool: {
            must: [{ term: { _id: 'conversation-1' } }],
            filter: [expect.objectContaining({ bool: expect.anything() })],
          },
        },
      })
    );
  });

  it('rethrows errors other than version conflicts', async () => {
    esClient.search.mockResponse(getTitleSearchResponse(NEW_CHAT, 7));
    esClient.update.mockRejectedValueOnce(new Error('boom'));

    await expect(update()).rejects.toThrow('boom');
  });
});
