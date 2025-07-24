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
import { getUpdateMinimalExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_exception_list_item_schema.mock';
import { UpdateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import TestAgent from 'supertest/lib/agent';
import { deleteAllExceptions } from '../../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  let admin: TestAgent;
  let platformEngineer: TestAgent;

  describe('@serverless exception item comments - serverless specific behavior', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
      platformEngineer = await utils.createSuperTest('platform_engineer');
      await deleteAllExceptions(admin, log);
    });

    afterEach(async () => {
      await deleteAllExceptions(admin, log);
    });

    it('Add comment on a new exception, add another comment has unicode from a different user', async () => {
      await platformEngineer
        .post(EXCEPTION_LIST_URL)
        .send(getCreateExceptionListDetectionSchemaMock())
        .expect(200);

      const { os_types, ...ruleException } = getCreateExceptionListItemMinimalSchemaMock();

      // Add item with comment by platformEngineer
      await platformEngineer
        .post(EXCEPTION_LIST_ITEM_URL)
        .send({
          ...ruleException,
          comments: [{ comment: 'Comment by platformEngineer' }],
        })
        .expect(200);
      const { body: items } = await platformEngineer
        .get(
          `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
            getCreateExceptionListMinimalSchemaMock().list_id
          }`
        )
        .send()
        .expect(200);

      const platformEngineerId = items.data[0].comments[0].created_by;

      expect(items.data[0].comments[0]).toEqual(
        expect.objectContaining({
          created_by: platformEngineerId,
          comment: 'Comment by platformEngineer',
        })
      );

      // Add exception comment by different user
      const { item_id: _, ...updateItemWithoutItemId } =
        getUpdateMinimalExceptionListItemSchemaMock();

      const updatePayload: UpdateExceptionListItemSchema = {
        ...updateItemWithoutItemId,
        comments: [{ comment: 'Comment by admin' }],
        id: items.data[0].id,
      };
      await admin.put(EXCEPTION_LIST_ITEM_URL).send(updatePayload).expect(200);
      const { body: itemsAfterUpdate } = await admin
        .get(
          `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
            getCreateExceptionListMinimalSchemaMock().list_id
          }`
        )
        .send()
        .expect(200);

      const [itemAfterUpdate] = itemsAfterUpdate.data;
      const comments = itemAfterUpdate.comments;

      expect(comments.length).toEqual(2);
      expect(comments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            created_by: platformEngineerId,
            comment: 'Comment by platformEngineer',
          }),
          expect.objectContaining({
            created_by: comments[1].created_by,
            comment: 'Comment by admin',
          }),
        ])
      );
    });
  });
};
