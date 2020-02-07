/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Spaces } from '../../scenarios';
import { checkAAD, getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function updateActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should handle update action request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
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
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action');

      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/action/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(200, {
          id: createdAction.id,
          actionTypeId: 'test.index-record',
          name: 'My action updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        });

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'action',
        id: createdAction.id,
      });
    });

    it(`shouldn't update action from another space`, async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
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
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action');

      await supertest
        .put(`${getUrlPrefix(Spaces.other.id)}/api/action/${createdAction.id}`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action updated',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
          secrets: {
            encrypted: 'This value should be encrypted',
          },
        })
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdAction.id}] not found`,
        });
    });
  });
}
