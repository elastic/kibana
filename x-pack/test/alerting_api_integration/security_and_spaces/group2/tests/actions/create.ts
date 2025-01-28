/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { checkAAD, getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createConnectorTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('create', () => {
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
        it('should handle create connector request appropriately', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .auth(user.username, user.password)
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
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to create a "test.index-record" action',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'connector', 'actions');
              expect(response.body).to.eql({
                id: response.body.id,
                is_preconfigured: false,
                is_system_action: false,
                is_deprecated: false,
                is_missing_secrets: false,
                name: 'My Connector',
                connector_type_id: 'test.index-record',
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
              });
              expect(typeof response.body.id).to.be('string');
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'action',
                id: response.body.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle create connector request appropriately when connector type isn't registered`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'My Connector',
              connector_type_id: 'test.unregistered-action-type',
              config: {},
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to create a "test.unregistered-action-type" action',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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

        it('should handle create connector request appropriately when payload is empty and invalid', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({});

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.name]: expected value of type [string] but got [undefined]',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle create connector request appropriately when config isn't valid`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'my name',
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: 'my unencrypted text',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to create a "test.index-record" action',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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

        it(`should handle create connector requests for connector types that are not enabled`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'my name',
              connector_type_id: 'test.not-enabled',
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to create a "test.not-enabled" action',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message:
                  'action type "test.not-enabled" is not enabled in the Kibana config xpack.actions.enabledActionTypes',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle create connector request appropriately when empty strings are submitted`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'my name',
              connector_type_id: 'test.index-record',
              config: {
                encrypted: ' ',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: `[request body.config.encrypted]: value '' is not valid`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle create connector request appropriately with a predefined id', async () => {
          const predefinedId = uuidv4();
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector/${predefinedId}`)
            .auth(user.username, user.password)
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
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to create a "test.index-record" action',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'connector', 'actions');
              expect(response.body).to.eql({
                id: predefinedId,
                is_preconfigured: false,
                is_system_action: false,
                is_deprecated: false,
                is_missing_secrets: false,
                name: 'My Connector',
                connector_type_id: 'test.index-record',
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
              });
              expect(typeof response.body.id).to.be('string');
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'action',
                id: response.body.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't create a preconfigured connector with the same id as an existing one`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector/custom-system-abc-connector`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My Connector',
              connector_type_id: 'system-abc-action-type',
              config: {},
              secrets: {},
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to create a "system-abc-action-type" action',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  'This custom-system-abc-connector already exists in a preconfigured action.',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't create a system action`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My system action',
              connector_type_id: 'test.system-action',
              config: {},
              secrets: {},
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to create a "test.system-action" action',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'System action creation is forbidden. Action type: test.system-action.',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle save hooks appropriately', async () => {
          const source = uuidv4();
          const encryptedValue = 'This value should be encrypted';
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .auth(user.username, user.password)
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
            });

          const searchResult = await esTestIndexTool.search(source);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(searchResult.body.hits.hits.length).to.eql(0);
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              objectRemover.add(space.id, response.body.id, 'connector', 'actions');

              const refs: string[] = [];
              for (const hit of searchResult.body.hits.hits) {
                const doc = hit._source as any;

                const reference = doc.reference;
                delete doc.reference;
                refs.push(reference);

                if (reference === 'post-save') {
                  expect(doc.state.wasSuccessful).to.be(true);
                  delete doc.state.wasSuccessful;
                }

                const expected = {
                  state: {
                    connectorId: response.body.id,
                    config: { index: ES_TEST_INDEX_NAME, source },
                    secrets: { encrypted: encryptedValue },
                    isUpdate: false,
                  },
                  source,
                };
                expect(doc).to.eql(expected);
              }

              refs.sort();
              expect(refs).to.eql(['post-save', 'pre-save']);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
