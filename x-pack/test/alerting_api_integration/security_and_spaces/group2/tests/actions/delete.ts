/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';

import { UserAtSpaceScenarios, SuperuserAtSpace1 } from '../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function deleteConnectorTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('delete', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    after(async () => {
      await esTestIndexTool.destroy();
      await objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle delete connector request appropriately', async () => {
          const { body: createdConnector } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My Connector',
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/actions/connector/${createdConnector.id}`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to delete actions',
              });
              objectRemover.add(space.id, createdConnector.id, 'connector', 'actions');
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't delete connector from another space`, async () => {
          const { body: createdConnector } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My Connector',
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(space.id, createdConnector.id, 'connector', 'actions');

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix('other')}/api/actions/connector/${createdConnector.id}`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to delete actions',
              });
              break;
            case 'superuser at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: `Saved object [action/${createdConnector.id}] not found`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle delete request appropriately when connector doesn't exist`, async () => {
          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/actions/connector/2`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to delete actions',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(404);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't delete preconfigured connector`, async () => {
          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/actions/connector/my-slack1`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to delete actions',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Preconfigured action my-slack1 is not allowed to delete.',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't delete system action`, async () => {
          const response = await supertestWithoutAuth
            .delete(
              `${getUrlPrefix(space.id)}/api/actions/connector/system-connector-test.system-action`
            )
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to delete actions',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  'System action system-connector-test.system-action is not allowed to delete.',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle delete hooks appropriately', async () => {
          const source = uuidv4();
          const encryptedValue = 'This value should be encrypted';
          const { body: createdConnector } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'Hooked action',
              connector_type_id: 'test.connector-with-hooks',
              config: {
                index: ES_TEST_INDEX_NAME,
                source,
              },
              secrets: {
                encrypted: encryptedValue,
              },
            })
            .expect(200);

          // clear out docs from create
          await esTestIndexTool.destroy();
          await esTestIndexTool.setup();

          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix(space.id)}/api/actions/connector/${createdConnector.id}`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo');

          const searchResult = await esTestIndexTool.search(source);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(searchResult.body.hits.hits.length).to.eql(0);
              objectRemover.add(space.id, createdConnector.id, 'connector', 'actions');
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);

              const refs: string[] = [];
              for (const hit of searchResult.body.hits.hits) {
                const doc = hit._source as any;

                const reference = doc.reference;
                delete doc.reference;
                refs.push(reference);

                const expected = {
                  state: {
                    connectorId: createdConnector.id,
                    config: { index: ES_TEST_INDEX_NAME, source },
                  },
                  source,
                };
                expect(doc).to.eql(expected);
              }

              refs.sort();
              expect(refs).to.eql(['post-delete']);
              break;
            default:
              objectRemover.add(space.id, createdConnector.id, 'connector', 'actions');
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should delete a connector with an unsupported type', async () => {
      const { space, user } = SuperuserAtSpace1;
      await kibanaServer.importExport.load(
        'x-pack/test/alerting_api_integration/security_and_spaces/group2/tests/actions/fixtures/unsupported_connector_type.json',
        { space: space.id }
      );

      const res = await supertestWithoutAuth
        .get(`${getUrlPrefix(space.id)}/api/actions/connectors`)
        .auth(user.username, user.password);

      const invalidConnector = res.body.find(
        (connector: { connector_type_id: string; id: string }) =>
          connector.connector_type_id === '.invalid-type'
      );

      const response = await supertestWithoutAuth
        .delete(`${getUrlPrefix(space.id)}/api/actions/connector/${invalidConnector.id}`)
        .auth(user.username, user.password)
        .set('kbn-xsrf', 'foo');

      expect(response.statusCode).to.eql(204);
      expect(response.body).to.eql('');
    });
  });
}
