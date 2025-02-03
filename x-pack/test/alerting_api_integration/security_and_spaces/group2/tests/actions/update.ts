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
export default function updateConnectorTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('update', () => {
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
        it('should handle update connector request appropriately', async () => {
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
            .put(`${getUrlPrefix(space.id)}/api/actions/connector/${createdConnector.id}`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My Connector updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to update actions',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                id: createdConnector.id,
                is_preconfigured: false,
                is_system_action: false,
                is_deprecated: false,
                connector_type_id: 'test.index-record',
                is_missing_secrets: false,
                name: 'My Connector updated',
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
              });
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'action',
                id: createdConnector.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't update connector from another space`, async () => {
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
            .put(`${getUrlPrefix('other')}/api/actions/connector/${createdConnector.id}`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My Connector updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to update actions',
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

        it('should handle update connector request appropriately when passing a null config', async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/actions/connector/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'My Connector updated',
              config: null,
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.config]: expected value of type [object] but got [null]',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle update connector request appropriately when connector doesn't exist`, async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/actions/connector/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'My Connector updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to update actions',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
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

        it('should handle update connector request appropriately when payload is empty and invalid', async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/actions/connector/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({});

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.name]: expected value of type [string] but got [undefined]',
                // message: '[request body.config]: expected value of type [object] but got [null]',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle update connector request appropriately when secrets are not valid', async () => {
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
            .put(`${getUrlPrefix(space.id)}/api/actions/connector/${createdConnector.id}`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'My Connector updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 42,
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to update actions',
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
                  'error validating action type secrets: [encrypted]: expected value of type [string] but got [number]',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't update a preconfigured connector`, async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/actions/connector/custom-system-abc-connector`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My Connector updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to update actions',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: `Preconfigured action custom-system-abc-connector can not be updated.`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle update connector request appropriately when empty strings are submitted`, async () => {
          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/actions/connector/1`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              name: 'My Connector updated',
              config: {
                unencrypted: ' ',
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: `[request body.config.unencrypted]: value '' is not valid`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't update a system action`, async () => {
          const response = await supertestWithoutAuth
            .put(
              `${getUrlPrefix(space.id)}/api/actions/connector/system-connector-test.system-action`
            )
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to update actions',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: 'System action system-connector-test.system-action can not be updated.',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle save hooks appropriately', async () => {
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
          objectRemover.add(space.id, createdConnector.id, 'connector', 'actions');

          // clear out docs from create
          await esTestIndexTool.destroy();
          await esTestIndexTool.setup();

          const response = await supertestWithoutAuth
            .put(`${getUrlPrefix(space.id)}/api/actions/connector/${createdConnector.id}`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'Hooked action',
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
                    isUpdate: true,
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
