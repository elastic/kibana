/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import {
  getUrlPrefix,
  ObjectRemover,
  getTestAlertData,
  getConsumerUnauthorizedErrorMessage,
  getProducerUnauthorizedErrorMessage,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { UserAtSpaceScenarios } from '../../scenarios';

// eslint-disable-next-line import/no-default-export
export default function createGetAlertInstanceSummaryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('getAlertInstanceSummary', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle getAlertInstanceSummary alert request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}/_instance_summary`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage('get', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              const { id, statusStartDate, statusEndDate } = response.body;
              expect(id).to.equal(createdAlert.id);
              expect(Date.parse(statusStartDate)).to.be.lessThan(Date.parse(statusEndDate));

              const stableBody = omit(response.body, [
                'id',
                'statusStartDate',
                'statusEndDate',
                'lastRun',
              ]);
              expect(stableBody).to.eql({
                name: 'abc',
                tags: ['foo'],
                alertTypeId: 'test.noop',
                consumer: 'alertsFixture',
                status: 'OK',
                muteAll: false,
                throttle: '1m',
                enabled: true,
                errorMessages: [],
                instances: {},
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle getAlertInstanceSummary alert request appropriately when unauthorized', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                alertTypeId: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alerts/alert/${createdAlert.id}/_instance_summary`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getConsumerUnauthorizedErrorMessage(
                  'get',
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
                  'get',
                  'test.unrestricted-noop',
                  'alertsRestrictedFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.key('id', 'instances', 'errorMessages');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't getAlertInstanceSummary for an alert from another space`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix('other')}/api/alerts/alert/${createdAlert.id}/_instance_summary`)
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(404);
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'global_read at space1':
            case 'superuser at space1':
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: `Saved object [alert/${createdAlert.id}] not found`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle getAlertInstanceSummary request appropriately when alert doesn't exist`, async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alerts/alert/1/_instance_summary`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Saved object [alert/1] not found',
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
