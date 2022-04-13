/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import {
  getUrlPrefix,
  ObjectRemover,
  getTestRuleData,
  getConsumerUnauthorizedErrorMessage,
  getProducerUnauthorizedErrorMessage,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { UserAtSpaceScenarios } from '../../scenarios';

// eslint-disable-next-line import/no-default-export
export default function createGetAlertSummaryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('getAlertSummary', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle getAlertSummary request appropriately', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/internal/alerting/rule/${createdRule.id}/_alert_summary`
            )
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
              const {
                id,
                status_start_date: statusStartDate,
                status_end_date: statusEndDate,
              } = response.body;
              expect(id).to.equal(createdRule.id);
              expect(Date.parse(statusStartDate)).to.be.lessThan(Date.parse(statusEndDate));

              const stableBody = omit(response.body, [
                'id',
                'status_start_date',
                'status_end_date',
                'last_run',
                'execution_duration',
              ]);
              expect(stableBody).to.eql({
                name: 'abc',
                tags: ['foo'],
                rule_type_id: 'test.noop',
                consumer: 'alertsFixture',
                status: 'OK',
                mute_all: false,
                throttle: '1m',
                enabled: true,
                error_messages: [],
                alerts: {},
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle getAlertSummary request appropriately when unauthorized', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.unrestricted-noop',
                consumer: 'alertsFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/internal/alerting/rule/${createdRule.id}/_alert_summary`
            )
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
              expect(response.body).to.key('id', 'alerts', 'error_messages');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't getAlertSummary for a rule from another space`, async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix('other')}/internal/alerting/rule/${createdRule.id}/_alert_summary`)
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
                message: `Saved object [alert/${createdRule.id}] not found`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`should handle getAlertSummary request appropriately when rule doesn't exist`, async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rule/1/_alert_summary`)
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
