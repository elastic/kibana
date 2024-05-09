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
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  // Skipping in MKI due to roles testing not yet being available
  describe('@serverless @skipInServerlessMKI exception item comments - serverless specific behavior', () => {
    // FLAKY: https://github.com/elastic/kibana/issues/181507
    describe.skip('Rule Exceptions', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('Add comment on a new exception, add another comment has unicode from a different user', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        const { os_types, ...ruleException } = getCreateExceptionListItemMinimalSchemaMock();

        // Add comment by another user
        await supertestWithoutAuth
          .post(EXCEPTION_LIST_ITEM_URL)
          .auth(ROLES.t3_analyst, 'changeme')
          .set('kbn-xsrf', 'true')
          .send({
            ...ruleException,
            comments: [{ comment: 'Comment by user@t3_analyst' }],
          })
          .expect(200);
        const { body: items } = await supertest
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Validate the first user comment
        expect(items.total).toEqual(1);
        const [item] = items.data;
        const t3AnalystComments = item.comments;
        expect(t3AnalystComments.length).toEqual(1);

        expect(t3AnalystComments[0]).toEqual(
          expect.objectContaining({
            created_by: 't3_analyst',
            comment: 'Comment by user@t3_analyst',
          })
        );

        const expectedId = item.id;

        // Update exception comment by different user
        const { item_id: _, ...updateItemWithoutItemId } =
          getUpdateMinimalExceptionListItemSchemaMock();

        const updatePayload: UpdateExceptionListItemSchema = {
          ...updateItemWithoutItemId,
          comments: [
            ...(updateItemWithoutItemId.comments || []),
            { comment: 'Comment by elastic_serverless' },
          ],
          id: expectedId,
        };
        await supertest
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatePayload)
          .expect(200);

        const { body: itemsAfterUpdate } = await supertest
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const [itemAfterUpdate] = itemsAfterUpdate.data;
        const comments = itemAfterUpdate.comments;

        expect(comments.length).toEqual(2);

        expect(comments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              created_by: 't3_analyst',
              comment: 'Comment by user@t3_analyst',
            }),
            expect.objectContaining({
              created_by: 'elastic_serverless',
              comment: 'Comment by elastic_serverless',
            }),
          ])
        );
      });
    });
    describe('Endpoint Exceptions', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('Add comment on a new exception, add another comment has unicode from a different user', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // Add comment by the t3 analyst
        await supertestWithoutAuth
          .post(EXCEPTION_LIST_ITEM_URL)
          .auth(ROLES.t3_analyst, 'changeme')
          .set('kbn-xsrf', 'true')
          .send({
            ...getCreateExceptionListItemMinimalSchemaMock(),
            comments: [{ comment: 'Comment by user@t3_analyst' }],
          })
          .expect(200);

        const { body: items } = await supertest
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // Validate the first user comment
        expect(items.total).toEqual(1);
        const [item] = items.data;
        const t3AnalystComments = item.comments;
        expect(t3AnalystComments.length).toEqual(1);

        expect(t3AnalystComments[0]).toEqual(
          expect.objectContaining({
            created_by: 't3_analyst',
            comment: 'Comment by user@t3_analyst',
          })
        );

        const expectedId = item.id;

        // Update exception comment by different user
        const { item_id: _, ...updateItemWithoutItemId } =
          getUpdateMinimalExceptionListItemSchemaMock();

        const updatePayload: UpdateExceptionListItemSchema = {
          ...updateItemWithoutItemId,
          comments: [
            ...(updateItemWithoutItemId.comments || []),
            { comment: 'Comment by elastic_serverless' },
          ],
          id: expectedId,
        };
        await supertest
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatePayload)
          .expect(200);

        const { body: itemsAfterUpdate } = await supertest
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
        const [itemAfterUpdate] = itemsAfterUpdate.data;
        const comments = itemAfterUpdate.comments;

        expect(comments.length).toEqual(2);

        expect(comments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              created_by: 't3_analyst',
              comment: 'Comment by user@t3_analyst',
            }),
            expect.objectContaining({
              created_by: 'elastic_serverless',
              comment: 'Comment by elastic_serverless',
            }),
          ])
        );
      });
    });
  });
};
