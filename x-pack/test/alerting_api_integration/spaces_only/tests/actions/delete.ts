/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function deleteActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('delete', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle delete action request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          actionTypeId: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);

      await supertest
        .delete(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(204, '');
    });

    it(`shouldn't delete action from another space`, async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
          actionTypeId: 'test.index-record',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');

      await supertest
        .delete(`${getUrlPrefix(Spaces.other.id)}/api/actions/action/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdAction.id}] not found`,
        });
    });

    it(`should handle delete request appropriately when action doesn't exist`, async () => {
      await supertest
        .delete(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/2`)
        .set('kbn-xsrf', 'foo')
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [action/2] not found',
        });
    });

    it(`shouldn't delete action from preconfigured list`, async () => {
      await supertest
        .delete(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/my-slack1`)
        .set('kbn-xsrf', 'foo')
        .expect(400, {
          statusCode: 400,
          error: 'Bad Request',
          message: `Preconfigured action my-slack1 is not allowed to delete.`,
        });
    });
  });
}
