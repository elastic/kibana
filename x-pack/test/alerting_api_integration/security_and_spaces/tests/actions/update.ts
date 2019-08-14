/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function updateActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('update', () => {
    const actionsToDelete: Array<{ spaceId: string; id: string }> = [];

    after(async () => {
      const promises = actionsToDelete.map(({ spaceId, id }) => {
        return supertest
          .delete(`${getUrlPrefix(spaceId)}/api/action/${id}`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      });
      await Promise.all(promises);
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('update document as user', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
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
          actionsToDelete.push({ spaceId: space.id, id: createdAction.id });

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/action/${createdAction.id}`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get action',
              });
              break;
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to update action',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                id: createdAction.id,
                actionTypeId: 'test.index-record',
                description: 'My action updated',
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should not be able to pass null config', async () => {
          await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/action/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
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

        it('non existing document', async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/action/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              description: 'My action updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get action',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Saved object [action/1] not found',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should return 400 when payload is empty and invalid', async () => {
          await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/action/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({})
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message: 'child "description" fails because ["description" is required]',
              validation: { source: 'payload', keys: ['description'] },
            });
        });

        it('secrest are not valid', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
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
          actionsToDelete.push({ spaceId: space.id, id: createdAction.id });

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/action/${createdAction.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              description: 'My action updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 42,
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get action',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  'error validating action type secrets: [encrypted]: expected value of type [string] but got [number]',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
