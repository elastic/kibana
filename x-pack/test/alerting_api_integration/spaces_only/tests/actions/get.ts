/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    it('should handle get action request appropriately', async () => {
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
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/${createdAction.id}`)
        .expect(200, {
          id: createdAction.id,
          isPreconfigured: false,
          actionTypeId: 'test.index-record',
          name: 'My action',
          config: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        });
    });

    it(`action should't be acessible from another space`, async () => {
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
        .get(`${getUrlPrefix(Spaces.other.id)}/api/actions/action/${createdAction.id}`)
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdAction.id}] not found`,
        });
    });

    it('should handle get action request from preconfigured list', async () => {
      await supertest
        .get(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action/my-slack1`)
        .expect(200, {
          id: 'my-slack1',
          isPreconfigured: true,
          actionTypeId: '.slack',
          name: 'Slack#xyz',
        });
    });
  });
}
