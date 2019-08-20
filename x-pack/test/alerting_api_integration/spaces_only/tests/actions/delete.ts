/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function deleteActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('delete', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should handle delete action request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action`)
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

          await supertest
            .delete(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');
        });

        it(`should handle delete request appropriately when action doesn't exist`, async () => {
          await supertest
            .delete(`${getUrlPrefix(scenario.id)}/api/action/2`)
            .set('kbn-xsrf', 'foo')
            .expect(404, {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [action/2] not found',
            });
        });
      });
    }
  });
}
