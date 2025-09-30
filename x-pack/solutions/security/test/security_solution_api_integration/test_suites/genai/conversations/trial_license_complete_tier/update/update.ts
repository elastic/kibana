/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  deleteAllConversations,
  getConversationBadRequestError,
  getConversationNotFoundError,
} from '../../utils/helpers';
import { getConversationsApis } from '../../utils/apis';
import { getSimpleConversation } from '../../mocks';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Update - Common', () => {
    beforeEach(async () => {
      await deleteAllConversations({ supertest, log });
    });

    describe('Happy path', () => {
      it('should update a conversation', async () => {
        const apis = getConversationsApis({ supertest });

        const conversationToCreate = getSimpleConversation();
        const createdConversation = await apis.create({ conversation: conversationToCreate });

        const conversationToUpdate = { id: createdConversation.id, title: 'Updated Conversation' };
        const updatedConversation = await apis.update({
          id: createdConversation.id,
          conversation: conversationToUpdate,
        });

        expect(updatedConversation).toEqual(
          expect.objectContaining({
            ...createdConversation,
            ...conversationToUpdate,
            // Use latest `updateAt` value
            updatedAt: updatedConversation.updatedAt,
          })
        );
      });
    });

    describe('Errors handling', () => {
      it('should return `Not Found` error if conversation does not exist', async () => {
        const apis = getConversationsApis({ supertest });

        const conversationToCreate = getSimpleConversation();
        const createdConversation = await apis.create({ conversation: conversationToCreate });

        const conversationToUpdate = { id: createdConversation.id, title: 'Updated Conversation' };
        const result = await apis.update({
          id: 'fake-conversation-1',
          conversation: conversationToUpdate,
          expectedHttpCode: 404,
        });

        expect(result).toEqual(getConversationNotFoundError('fake-conversation-1'));
      });

      it('should return a `Bad Request` error if `id` attribute is `undefined`', async () => {
        const apis = getConversationsApis({ supertest });

        const conversationToCreate = getSimpleConversation();
        const createdConversation = await apis.create({ conversation: conversationToCreate });

        const conversationToUpdate = { title: 'Updated Conversation' };
        const result = await apis.update({
          id: createdConversation.id,
          conversation: conversationToUpdate,
          expectedHttpCode: 400,
        });

        expect(result).toEqual(getConversationBadRequestError('id'));
      });
    });
  });
};
