/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { deleteAllConversations, getConversationBadRequestError } from '../../utils/helpers';
import type { PartialPerformBulkActionRequestBody } from '../../utils/apis';
import { getConversationsApis } from '../../utils/apis';
import { getSimpleConversation } from '../../mocks';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Bulk Actions - Common', () => {
    beforeEach(async () => {
      await deleteAllConversations({ supertest, log });
    });

    describe('Bulk Update', () => {
      describe('Happy path', () => {
        it('should update a conversation', async () => {
          const apis = getConversationsApis({ supertest });

          const conversationToCreate = getSimpleConversation();
          const { id, updatedAt, ...restCreatedConversation } = await apis.create({
            conversation: conversationToCreate,
          });

          const conversationToUpdate = { id, title: 'Updated Conversation' };
          const bulkActions: PartialPerformBulkActionRequestBody = {
            update: [conversationToUpdate],
          };
          const result = await apis.bulk({ bulkActions });

          expect(result).toEqual({
            success: true,
            conversations_count: 1,
            attributes: {
              results: {
                updated: [
                  expect.objectContaining({
                    ...restCreatedConversation,
                    ...conversationToUpdate,
                  }),
                ],
                created: [],
                deleted: [],
                skipped: [],
              },
              summary: {
                failed: 0,
                succeeded: 1,
                skipped: 0,
                total: 1,
              },
            },
          });
        });
      });

      describe('Errors handling', () => {
        it('should return a `Internal Server Error` error if conversation does not exist', async () => {
          const apis = getConversationsApis({ supertest });

          const conversationToCreate = getSimpleConversation();
          const createdConversation = await apis.create({ conversation: conversationToCreate });

          const conversationToUpdate = {
            id: createdConversation.id,
            title: 'Updated Conversation',
          };
          const bulkActions: PartialPerformBulkActionRequestBody = {
            update: [{ ...conversationToUpdate, id: 'fake-conversation-1' }],
          };
          const result = await apis.bulk({ bulkActions, expectedHttpCode: 500 });

          expect(result.error).toEqual('Internal Server Error');
          expect(result.message).toEqual('Bulk edit failed');
        });

        it('should return a `Bad Request` error if `id` attribute is `undefined`', async () => {
          const apis = getConversationsApis({ supertest });

          const conversationToUpdate = { title: 'Updated Conversation' };
          const bulkActions: PartialPerformBulkActionRequestBody = {
            update: [conversationToUpdate],
          };
          const result = await apis.bulk({ bulkActions, expectedHttpCode: 400 });

          expect(result).toEqual(getConversationBadRequestError('update.0.id'));
        });
      });
    });
  });
};
