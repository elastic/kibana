/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { SuperuserAtSpace1, UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getAllActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('getAllSystem', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle get all action request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action', 'actions');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/actions/connectors`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to get actions',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);

              // the custom ssl connectors have dynamic ports, so remove them before
              // comparing to what we expect
              const nonCustomSslConnectors = response.body.filter(
                (conn: { id: string }) => !conn.id.startsWith('custom.ssl.')
              );
              expect(nonCustomSslConnectors).to.eql([
                {
                  id: createdAction.id,
                  is_preconfigured: false,
                  is_system_action: false,
                  is_deprecated: false,
                  name: 'My action',
                  connector_type_id: 'test.index-record',
                  is_missing_secrets: false,
                  config: {
                    unencrypted: `This value shouldn't get encrypted`,
                  },
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: '.email',
                  id: 'notification-email',
                  is_deprecated: false,
                  is_system_action: false,
                  is_preconfigured: true,
                  name: 'Notification Email Connector',
                  referenced_by_count: 0,
                },
                {
                  id: 'preconfigured-es-index-action',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.index',
                  name: 'preconfigured_es_index_action',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: '.servicenow',
                  id: 'my-deprecated-servicenow',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: true,
                  name: 'ServiceNow#xyz',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: '.servicenow',
                  id: 'my-deprecated-servicenow-default',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: true,
                  name: 'ServiceNow#xyz',
                  referenced_by_count: 0,
                },
                {
                  id: 'my-slack1',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.slack',
                  name: 'Slack#xyz',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action',
                  id: 'system-connector-test.system-action',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action-connector-adapter',
                  id: 'system-connector-test.system-action-connector-adapter',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action with a connector adapter set',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action-kibana-privileges',
                  id: 'system-connector-test.system-action-kibana-privileges',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action with kibana privileges',
                  referenced_by_count: 0,
                },
                {
                  id: 'custom-system-abc-connector',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: 'system-abc-action-type',
                  name: 'SystemABC',
                  referenced_by_count: 0,
                },
                {
                  id: 'preconfigured.test.index-record',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: 'test.index-record',
                  name: 'Test:_Preconfigured_Index_Record',
                  referenced_by_count: 0,
                },
                {
                  id: 'my-test-email',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.email',
                  name: 'TestEmail#xyz',
                  referenced_by_count: 0,
                },
              ]);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle get all request appropriately with proper referenced_by_count', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action', 'actions');

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                actions: [
                  {
                    group: 'default',
                    id: createdAction.id,
                    params: {},
                  },
                  {
                    group: 'default',
                    id: 'my-slack1',
                    params: {
                      message: 'test',
                    },
                  },
                ],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, RULE_SAVED_OBJECT_TYPE, 'alerts');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/actions/connectors`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to get actions',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);

              // the custom ssl connectors have dynamic ports, so remove them before
              // comparing to what we expect
              const nonCustomSslConnectors = response.body.filter(
                (conn: { id: string }) => !conn.id.startsWith('custom.ssl.')
              );
              expect(nonCustomSslConnectors).to.eql([
                {
                  id: createdAction.id,
                  is_preconfigured: false,
                  is_system_action: false,
                  is_deprecated: false,
                  name: 'My action',
                  connector_type_id: 'test.index-record',
                  is_missing_secrets: false,
                  config: {
                    unencrypted: `This value shouldn't get encrypted`,
                  },
                  referenced_by_count: 1,
                },
                {
                  connector_type_id: '.email',
                  id: 'notification-email',
                  is_deprecated: false,
                  is_preconfigured: true,
                  is_system_action: false,
                  name: 'Notification Email Connector',
                  referenced_by_count: 0,
                },
                {
                  id: 'preconfigured-es-index-action',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.index',
                  name: 'preconfigured_es_index_action',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: '.servicenow',
                  id: 'my-deprecated-servicenow',
                  is_deprecated: true,
                  is_preconfigured: true,
                  is_system_action: false,
                  name: 'ServiceNow#xyz',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: '.servicenow',
                  id: 'my-deprecated-servicenow-default',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: true,
                  name: 'ServiceNow#xyz',
                  referenced_by_count: 0,
                },
                {
                  id: 'my-slack1',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.slack',
                  name: 'Slack#xyz',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action',
                  id: 'system-connector-test.system-action',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action-connector-adapter',
                  id: 'system-connector-test.system-action-connector-adapter',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action with a connector adapter set',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action-kibana-privileges',
                  id: 'system-connector-test.system-action-kibana-privileges',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action with kibana privileges',
                  referenced_by_count: 0,
                },
                {
                  id: 'custom-system-abc-connector',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: 'system-abc-action-type',
                  name: 'SystemABC',
                  referenced_by_count: 0,
                },
                {
                  id: 'preconfigured.test.index-record',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: 'test.index-record',
                  name: 'Test:_Preconfigured_Index_Record',
                  referenced_by_count: 0,
                },
                {
                  id: 'my-test-email',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.email',
                  name: 'TestEmail#xyz',
                  referenced_by_count: 0,
                },
              ]);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't get actions from another space`, async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action', 'actions');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix('other')}/internal/actions/connectors`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unauthorized to get actions',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);

              // the custom ssl connectors have dynamic ports, so remove them before
              // comparing to what we expect
              const nonCustomSslConnectors = response.body.filter(
                (conn: { id: string }) => !conn.id.startsWith('custom.ssl.')
              );
              expect(nonCustomSslConnectors).to.eql([
                {
                  connector_type_id: '.email',
                  id: 'notification-email',
                  is_deprecated: false,
                  is_preconfigured: true,
                  is_system_action: false,
                  name: 'Notification Email Connector',
                  referenced_by_count: 0,
                },
                {
                  id: 'preconfigured-es-index-action',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.index',
                  name: 'preconfigured_es_index_action',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: '.servicenow',
                  id: 'my-deprecated-servicenow',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: true,
                  name: 'ServiceNow#xyz',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: '.servicenow',
                  id: 'my-deprecated-servicenow-default',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: true,
                  name: 'ServiceNow#xyz',
                  referenced_by_count: 0,
                },
                {
                  id: 'my-slack1',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.slack',
                  name: 'Slack#xyz',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action',
                  id: 'system-connector-test.system-action',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action-connector-adapter',
                  id: 'system-connector-test.system-action-connector-adapter',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action with a connector adapter set',
                  referenced_by_count: 0,
                },
                {
                  connector_type_id: 'test.system-action-kibana-privileges',
                  id: 'system-connector-test.system-action-kibana-privileges',
                  is_deprecated: false,
                  is_preconfigured: false,
                  is_system_action: true,
                  name: 'Test system action with kibana privileges',
                  referenced_by_count: 0,
                },
                {
                  id: 'custom-system-abc-connector',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: 'system-abc-action-type',
                  name: 'SystemABC',
                  referenced_by_count: 0,
                },
                {
                  id: 'preconfigured.test.index-record',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: 'test.index-record',
                  name: 'Test:_Preconfigured_Index_Record',
                  referenced_by_count: 0,
                },
                {
                  id: 'my-test-email',
                  is_preconfigured: true,
                  is_system_action: false,
                  is_deprecated: false,
                  connector_type_id: '.email',
                  name: 'TestEmail#xyz',
                  referenced_by_count: 0,
                },
              ]);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('References', () => {
      const systemAction = {
        id: 'system-connector-test.system-action',
        params: {},
      };

      it('calculates the references correctly', async () => {
        const { user, space } = SuperuserAtSpace1;

        const { body: createdAction } = await supertest
          .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({
            name: 'My action',
            connector_type_id: 'test.index-record',
            config: {
              unencrypted: `This value shouldn't get encrypted`,
            },
            secrets: {
              encrypted: 'This value should be encrypted',
            },
          })
          .expect(200);

        objectRemover.add(space.id, createdAction.id, 'action', 'actions');

        const ruleRes = await supertest
          .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              actions: [
                systemAction,
                {
                  id: createdAction.id,
                  group: 'default',
                  params: {},
                },
              ],
            })
          )
          .expect(200);

        objectRemover.add(space.id, ruleRes.body.id, 'rule', 'alerting');

        const response = await supertestWithoutAuth
          .get(`${getUrlPrefix(space.id)}/internal/actions/connectors`)
          .auth(user.username, user.password)
          .expect(200);

        const connectors = response.body as Array<{ id: string; referenced_by_count: number }>;

        const createdConnector = connectors.find((connector) => connector.id === createdAction.id);
        const systemConnector = connectors.find((connector) => connector.id === systemAction.id);

        expect(createdConnector?.referenced_by_count).to.be(1);
        expect(systemConnector?.referenced_by_count).to.be(0);
      });
    });
  });
}
