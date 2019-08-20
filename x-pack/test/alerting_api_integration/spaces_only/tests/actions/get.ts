/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('get', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should handle get action request appropriately', async () => {
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
          objectRemover.add(scenario.id, createdAction.id, 'action');

          await supertest
            .get(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}`)
            .expect(200, {
              id: createdAction.id,
              actionTypeId: 'test.index-record',
              description: 'My action',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
            });
        });
      });
    }
  });
}
