/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('create', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle create action request appropriately', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .auth(user.username, user.password)
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
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                id: response.body.id,
                description: 'My action',
                actionTypeId: 'test.index-record',
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
              });
              expect(typeof response.body.id).to.be('string');
              objectRemover.add(space.id, response.body.id, 'action');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle create action request appropriately when action type isn't registered`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              description: 'My action',
              actionTypeId: 'test.unregistered-action-type',
              config: {},
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Action type "test.unregistered-action-type" is not registered.',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle create action request appropriately when payload is empty and invalid', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({});

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  'child "description" fails because ["description" is required]. child "actionTypeId" fails because ["actionTypeId" is required]',
                validation: {
                  source: 'payload',
                  keys: ['description', 'actionTypeId'],
                },
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle create action request appropriately when config isn't valid`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              description: 'my description',
              actionTypeId: 'test.index-record',
              config: {
                unencrypted: 'my unencrypted text',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  'error validating action type secrets: [encrypted]: expected value of type [string] but got [undefined]',
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
