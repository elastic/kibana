/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  AlertUtils,
  checkAAD,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
  getConsumerUnauthorizedErrorMessage,
  getProducerUnauthorizedErrorMessage,
} from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function createMuteAlertInstanceTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('unmute_instance', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      const alertUtils = new AlertUtils({ user, space, supertestWithoutAuth });

      describe(scenario.id, () => {
        it('should handle unmute alert instance request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'MY action',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                enabled: false,
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}/alert/1/_mute`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');

          const response = await alertUtils.getUnmuteInstanceRequest(createdAlert.id, '1');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'unmuteAlert',
                  'test.noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to execute actions`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.muted_alert_ids).to.eql([]);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle unmute alert instance request appropriately when consumer is the same as producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                enabled: false,
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}/alert/1/_mute`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');

          const response = await alertUtils.getUnmuteInstanceRequest(createdAlert.id, '1');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'unmuteAlert',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.muted_alert_ids).to.eql([]);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle unmute alert instance request appropriately when consumer is not the producer', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                enabled: false,
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}/alert/1/_mute`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');

          const response = await alertUtils.getUnmuteInstanceRequest(createdAlert.id, '1');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'unmuteAlert',
                  'test.unrestricted-noop',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getProducerUnauthorizedErrorMessage(
                  'unmuteAlert',
                  'test.unrestricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.muted_alert_ids).to.eql([]);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
                id: createdAlert.id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle unmute alert instance request appropriately when consumer is "alerts"', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                enabled: false,
                rule_type_id: 'test.restricted-noop',
                consumer: 'alerts',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}/alert/1/_mute`)
            .set('kbn-xsrf', 'foo')
            .expect(204, '');

          const response = await alertUtils.getUnmuteInstanceRequest(createdAlert.id, '1');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'unmuteAlert',
                  'test.restricted-noop',
                  'alerts'
                ),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getProducerUnauthorizedErrorMessage(
                  'unmuteAlert',
                  'test.restricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(204);
              expect(response.body).to.eql('');
              const { body: updatedAlert } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .expect(200);
              expect(updatedAlert.muted_alert_ids).to.eql([]);
              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: 'alert',
                id: createdAlert.id,
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
