/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from 'expect';

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import {
  getCreateExceptionListDetectionSchemaMock,
  getCreateExceptionListMinimalSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { getUpdateMinimalExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_exception_list_item_schema.mock';
import { UpdateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';
import {
  createUserAndRole,
  deleteUserAndRole,
} from '../../../../../../../common/services/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('@serverless @ess @brokenInServerless role_based_add_edit_comments', () => {
    const socManager = ROLES.soc_manager;
    const detectionAdmin = ROLES.detections_admin;

    describe('Rule Exceptions', () => {
      beforeEach(async () => {
        await createUserAndRole(getService, detectionAdmin);
        await createUserAndRole(getService, socManager);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, detectionAdmin);
        await deleteUserAndRole(getService, socManager);
        await deleteAllExceptions(supertest, log);
      });

      it('Add comment on a new exception, add another comment has unicode from a different user', async () => {
        await supertestWithoutAuth
          .post(EXCEPTION_LIST_URL)
          .auth(detectionAdmin, 'changeme')
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        const { os_types, ...ruleException } = getCreateExceptionListItemMinimalSchemaMock();

        // Add comment by the Detection Admin
        await supertestWithoutAuth
          .post(EXCEPTION_LIST_ITEM_URL)
          .auth(detectionAdmin, 'changeme')
          .set('kbn-xsrf', 'true')
          .send({
            ...ruleException,
            comments: [{ comment: 'Comment by user@detections_admin' }],
          })
          .expect(200);

        const { body: items } = await supertestWithoutAuth
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .auth(detectionAdmin, 'changeme')
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Validate the first user comment
        expect(items.total).toEqual(1);
        const [item] = items.data;
        const detectionAdminComments = item.comments;
        expect(detectionAdminComments.length).toEqual(1);

        expect(detectionAdminComments[0]).toEqual(
          expect.objectContaining({
            created_by: 'detections_admin',
            comment: 'Comment by user@detections_admin',
          })
        );

        const expectedId = item.id;

        // Update exception comment by different user Soc-manager
        const { item_id: _, ...updateItemWithoutItemId } =
          getUpdateMinimalExceptionListItemSchemaMock();

        const updatePayload: UpdateExceptionListItemSchema = {
          ...updateItemWithoutItemId,
          comments: [
            ...(updateItemWithoutItemId.comments || []),
            { comment: 'Comment by user@soc_manager' },
          ],
          id: expectedId,
        };
        await supertestWithoutAuth
          .put(EXCEPTION_LIST_ITEM_URL)
          .auth(socManager, 'changeme')
          .set('kbn-xsrf', 'true')
          .send(updatePayload)
          .expect(200);

        const { body: itemsAfterUpdate } = await supertest
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .auth(socManager, 'changeme')
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        const [itemAfterUpdate] = itemsAfterUpdate.data;
        const detectionAdminAndSocManagerComments = itemAfterUpdate.comments;

        expect(detectionAdminAndSocManagerComments.length).toEqual(2);

        expect(detectionAdminAndSocManagerComments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              created_by: 'detections_admin',
              comment: 'Comment by user@detections_admin',
            }),
            expect.objectContaining({
              created_by: 'soc_manager',
              comment: 'Comment by user@soc_manager',
            }),
          ])
        );
      });
    });
    describe('Endpoint Exceptions', () => {
      beforeEach(async () => {
        await createUserAndRole(getService, detectionAdmin);
        await createUserAndRole(getService, socManager);
      });

      afterEach(async () => {
        await deleteUserAndRole(getService, detectionAdmin);
        await deleteUserAndRole(getService, socManager);
        await deleteAllExceptions(supertest, log);
      });

      it('Add comment on a new exception, add another comment has unicode from a different user', async () => {
        await supertestWithoutAuth
          .post(EXCEPTION_LIST_URL)
          .auth(detectionAdmin, 'changeme')
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // Add comment by the Detection Admin
        await supertestWithoutAuth
          .post(EXCEPTION_LIST_ITEM_URL)
          .auth(detectionAdmin, 'changeme')
          .set('kbn-xsrf', 'true')
          .send({
            ...getCreateExceptionListItemMinimalSchemaMock(),
            comments: [{ comment: 'Comment by user@detections_admin' }],
          })
          .expect(200);

        const { body: items } = await supertestWithoutAuth
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .auth(detectionAdmin, 'changeme')
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Validate the first user comment
        expect(items.total).toEqual(1);
        const [item] = items.data;
        const detectionAdminComments = item.comments;
        expect(detectionAdminComments.length).toEqual(1);

        expect(detectionAdminComments[0]).toEqual(
          expect.objectContaining({
            created_by: 'detections_admin',
            comment: 'Comment by user@detections_admin',
          })
        );

        const expectedId = item.id;

        // Update exception comment by different user Soc-manager
        const { item_id: _, ...updateItemWithoutItemId } =
          getUpdateMinimalExceptionListItemSchemaMock();

        const updatePayload: UpdateExceptionListItemSchema = {
          ...updateItemWithoutItemId,
          comments: [
            ...(updateItemWithoutItemId.comments || []),
            { comment: 'Comment by user@soc_manager' },
          ],
          id: expectedId,
        };
        await supertestWithoutAuth
          .put(EXCEPTION_LIST_ITEM_URL)
          .auth(socManager, 'changeme')
          .set('kbn-xsrf', 'true')
          .send(updatePayload)
          .expect(200);

        const { body: itemsAfterUpdate } = await supertest
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .auth(socManager, 'changeme')
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        const [itemAfterUpdate] = itemsAfterUpdate.data;
        const detectionAdminAndSocManagerComments = itemAfterUpdate.comments;

        expect(detectionAdminAndSocManagerComments.length).toEqual(2);

        expect(detectionAdminAndSocManagerComments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              created_by: 'detections_admin',
              comment: 'Comment by user@detections_admin',
            }),
            expect.objectContaining({
              created_by: 'soc_manager',
              comment: 'Comment by user@soc_manager',
            }),
          ])
        );
      });
    });
  });
};
