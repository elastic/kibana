/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION } from '@kbn/elastic-assistant-common';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  deleteAllConversations,
  getMissingAssistantKibanaPrivilegesError,
} from '../../utils/helpers';
import type { PartialPerformBulkActionRequestBody } from '../../utils/apis';
import { getConversationsApis } from '../../utils/apis';
import { getSimpleConversation } from '../../mocks';
import { noKibanaPrivileges, secOnlySpace2 } from '../../../utils/auth/users';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe('@ess Bulk Actions - ESS', () => {
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

    describe('Bulk Update', () => {
      describe('Happy path', () => {
        it('should update a conversation by `id` in a non-default space', async () => {
          const apisSuperuser = getConversationsApis({ supertest });

          const { id, updatedAt, ...restCreatedConversation } = createdConversation;

          const conversationToUpdate = { id, title: 'Updated Conversation' };
          const bulkActions: PartialPerformBulkActionRequestBody = {
            update: [conversationToUpdate],
          };
          const result = await apisSuperuser.bulk({ bulkActions, kibanaSpace: kibanaSpace1 });

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

      describe('RBAC', () => {
        it('should not be able to update a conversation without `assistant` kibana privileges', async () => {
          const apisNoPrivileges = getConversationsApis({
            supertest: supertestWithoutAuth,
            user: noKibanaPrivileges,
          });

          const conversationToUpdate = {
            id: createdConversation.id,
            title: 'Updated Conversation',
          };
          const bulkActions: PartialPerformBulkActionRequestBody = {
            update: [conversationToUpdate],
          };
          const result = await apisNoPrivileges.bulk({
            bulkActions,
            kibanaSpace: kibanaSpace1,
            expectedHttpCode: 403,
          });

          expect(result).toEqual(
            getMissingAssistantKibanaPrivilegesError({
              routeDetails: `POST ${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION}`,
            })
          );
        });

        it('should not be able to update a conversation in a space without kibana privileges for that space', async () => {
          const apisOnlySpace2 = getConversationsApis({
            supertest: supertestWithoutAuth,
            user: secOnlySpace2,
          });

          const conversationToUpdate = {
            id: createdConversation.id,
            title: 'Updated Conversation',
          };
          const bulkActions: PartialPerformBulkActionRequestBody = {
            update: [conversationToUpdate],
          };
          const result = await apisOnlySpace2.bulk({
            bulkActions,
            kibanaSpace: kibanaSpace1,
            expectedHttpCode: 403,
          });

          expect(result).toEqual(
            getMissingAssistantKibanaPrivilegesError({
              routeDetails: `POST ${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION}`,
            })
          );
        });
      });
    });
  });
};
