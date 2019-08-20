/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function updateActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('update', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should handle update action request appropriately', async () => {
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
            .put(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action updated',
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
              description: 'My action updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
            });
        });

        it('should handle update action request appropriately when passing a null config', async () => {
          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/action/1`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action updated',
              config: null,
            })
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message: 'child "config" fails because ["config" must be an object]',
              validation: {
                source: 'payload',
                keys: ['config'],
              },
            });
        });

        it(`should handle update action request appropriately when action doesn't exist`, async () => {
          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/action/1`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action updated',
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
              message: 'Saved object [action/1] not found',
            });
        });

        it('should handle update action request appropriately when payload is empty and invalid', async () => {
          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/action/1`)
            .set('kbn-xsrf', 'foo')
            .send({})
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message: 'child "description" fails because ["description" is required]',
              validation: { source: 'payload', keys: ['description'] },
            });
        });

        it('should handle update action request appropriately when secrets are not valid', async () => {
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
            .put(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 42,
              },
            })
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [encrypted]: expected value of type [string] but got [number]',
            });
        });
      });
    }
  });
}
