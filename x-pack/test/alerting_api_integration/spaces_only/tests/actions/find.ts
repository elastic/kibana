/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function findActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('find', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle find action request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          description: 'My action',
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
        .get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/api/action/_find?search=test.index-record&search_fields=actionTypeId`
        )
        .expect(200, {
          page: 1,
          perPage: 20,
          total: 1,
          data: [
            {
              id: createdAction.id,
              description: 'My action',
              actionTypeId: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              referencedByCount: 0,
            },
          ],
        });
    });

    it(`shouldn't find action from another space`, async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          description: 'My action',
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
        .get(
          `${getUrlPrefix(
            Spaces.other.id
          )}/api/action/_find?search=test.index-record&search_fields=actionTypeId`
        )
        .expect(200, {
          page: 1,
          perPage: 20,
          total: 0,
          data: [],
        });
    });
  });
}
