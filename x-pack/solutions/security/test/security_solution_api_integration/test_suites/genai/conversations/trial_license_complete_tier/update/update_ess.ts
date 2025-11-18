/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL } from '@kbn/elastic-assistant-common';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  deleteAllConversations,
  getMissingAssistantKibanaPrivilegesError,
} from '../../utils/helpers';
import { getConversationsApis } from '../../utils/apis';
import { getSimpleConversation } from '../../mocks';
import { noKibanaPrivileges, secOnlySpace2 } from '../../../utils/auth/users';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe('@ess Update - ESS', () => {
    let createdConversation: any;
    const kibanaSpace1 = 'space1';

    beforeEach(async () => {
      await deleteAllConversations({ supertest, log });
      await deleteAllConversations({ supertest, log, kibanaSpace: kibanaSpace1 });

      // Create a new conversation with the "super user" credentials
      const apisSuperuser = getConversationsApis({ supertest });
      createdConversation = await apisSuperuser.create({
        conversation: getSimpleConversation(),
        kibanaSpace: kibanaSpace1,
      });
    });

    describe('Happy path', () => {
      it('should update a conversation by `id` in a non-default space', async () => {
        const apisSuperuser = getConversationsApis({ supertest });

        const conversationToUpdate = { id: createdConversation.id, title: 'Updated Conversation' };
        const updatedConversation = await apisSuperuser.update({
          id: createdConversation.id,
          conversation: conversationToUpdate,
          kibanaSpace: kibanaSpace1,
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

    describe('RBAC', () => {
      it('should not be able to update a conversation without `assistant` kibana privileges', async () => {
        const apisNoPrivileges = getConversationsApis({
          supertest: supertestWithoutAuth,
          user: noKibanaPrivileges,
        });

        const conversationToUpdate = { id: createdConversation.id, title: 'Updated Conversation' };
        const result = await apisNoPrivileges.update({
          id: createdConversation.id,
          conversation: conversationToUpdate,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantKibanaPrivilegesError({
            routeDetails: `PUT ${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/${createdConversation.id}`,
          })
        );
      });

      it('should not be able to update a conversation in a space without kibana privileges for that space', async () => {
        const apisOnlySpace2 = getConversationsApis({
          supertest: supertestWithoutAuth,
          user: secOnlySpace2,
        });

        const conversationToUpdate = { id: createdConversation.id, title: 'Updated Conversation' };
        const result = await apisOnlySpace2.update({
          id: createdConversation.id,
          conversation: conversationToUpdate,
          kibanaSpace: kibanaSpace1,
          expectedHttpCode: 403,
        });

        expect(result).toEqual(
          getMissingAssistantKibanaPrivilegesError({
            routeDetails: `PUT ${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/${createdConversation.id}`,
          })
        );
      });
    });
  });
};
