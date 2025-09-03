/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION } from '@kbn/elastic-assistant-common';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  deleteAllConversations,
  getMissingAssistantKibanaPrivilegesError,
} from '../../utils/helpers';
import type { PartialPerformBulkActionRequestBody } from '../../utils/apis';
import { getConversationsApis } from '../../utils/apis';
import { getSimpleConversation } from '../../mocks';
import { noKibanaPrivileges, securitySolutionOnlyAllSpace2 } from '../../../utils/auth/roles';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@serverless Bulk Actions - Serverless', () => {
    let createdConversation: any;
    const kibanaSpace1 = 'space1';

    beforeEach(async () => {
      await deleteAllConversations({ supertest, log });
      await deleteAllConversations({ supertest, log, kibanaSpace: kibanaSpace1 });

      // Create a new enabled conversation with the "super user" credentials
      const apisSuperuser = getConversationsApis({ supertest });
      createdConversation = await apisSuperuser.create({
        conversation: getSimpleConversation(),
        kibanaSpace: kibanaSpace1,
      });
    });

    describe('Bulk Update', () => {
      describe('Happy path for predefined users', () => {
        const roles = [
          'viewer',
          'editor',
          ROLES.t1_analyst,
          ROLES.t2_analyst,
          ROLES.t3_analyst,
          ROLES.rule_author,
          ROLES.soc_manager,
          ROLES.detections_admin,
          ROLES.platform_engineer,
        ];

        roles.forEach((role) => {
          it(`should update a conversation in a non-default space with the role "${role}"`, async () => {
            const testAgent = await utils.createSuperTest(role);

            const apis = getConversationsApis({ supertest: testAgent });

            const { id, updatedAt, ...restCreatedConversation } = createdConversation;
            const conversationToUpdate = { id, title: 'Updated Conversation' };
            const bulkActions: PartialPerformBulkActionRequestBody = {
              update: [conversationToUpdate],
            };
            const result = await apis.bulk({ bulkActions, kibanaSpace: kibanaSpace1 });

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
      });

      describe('RBAC', () => {
        it('should not be able to update a conversation without `assistant` kibana privileges', async () => {
          const superTest = await utils.createSuperTestWithCustomRole(noKibanaPrivileges);

          const apisNoPrivileges = getConversationsApis({ supertest: superTest });

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
          const superTest = await utils.createSuperTestWithCustomRole(
            securitySolutionOnlyAllSpace2
          );

          const apisOnlySpace2 = getConversationsApis({ supertest: superTest });

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
