/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest, Test } from 'supertest';
import { chunk, omit } from 'lodash';
import uuid from 'uuid';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

const findTestUtils = (
  describeType: 'internal' | 'public',
  objectRemover: ObjectRemover,
  supertest: SuperTest<Test>,
  supertestWithoutAuth: any
) => {
  describe(describeType, () => {
    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle find alert request appropriately', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rules/_find?search=test.noop&search_fields=alertTypeId`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.page).to.equal(1);
              expect(response.body.per_page).to.be.greaterThan(0);
              expect(response.body.total).to.be.greaterThan(0);
              const match = response.body.data.find((obj: any) => obj.id === createdAlert.id);
              expect(match).to.eql({
                id: createdAlert.id,
                name: 'abc',
                tags: ['foo'],
                rule_type_id: 'test.noop',
                consumer: 'alertsFixture',
                schedule: { interval: '1m' },
                enabled: true,
                actions: [],
                params: {},
                created_by: 'elastic',
                scheduled_task_id: match.scheduled_task_id,
                created_at: match.created_at,
                updated_at: match.updated_at,
                throttle: '1m',
                notify_when: 'onThrottleInterval',
                updated_by: 'elastic',
                api_key_owner: 'elastic',
                mute_all: false,
                muted_alert_ids: [],
                execution_status: match.execution_status,
                ...(describeType === 'internal'
                  ? { monitoring: match.monitoring, snooze_end_time: match.snooze_end_time }
                  : {}),
              });
              expect(Date.parse(match.created_at)).to.be.greaterThan(0);
              expect(Date.parse(match.updated_at)).to.be.greaterThan(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should filter out types that the user is not authorized to `get` retaining pagination', async () => {
          async function createNoOpAlert(overrides = {}) {
            const alert = getTestRuleData(overrides);
            const { body: createdAlert } = await supertest
              .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(alert)
              .expect(200);
            objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');
            return {
              id: createdAlert.id,
              rule_type_id: alert.rule_type_id,
            };
          }
          function createRestrictedNoOpAlert() {
            return createNoOpAlert({
              rule_type_id: 'test.restricted-noop',
              consumer: 'alertsRestrictedFixture',
            });
          }
          function createUnrestrictedNoOpAlert() {
            return createNoOpAlert({
              rule_type_id: 'test.unrestricted-noop',
              consumer: 'alertsFixture',
            });
          }
          const allAlerts = [];
          allAlerts.push(await createNoOpAlert());
          allAlerts.push(await createNoOpAlert());
          allAlerts.push(await createRestrictedNoOpAlert());
          allAlerts.push(await createUnrestrictedNoOpAlert());
          allAlerts.push(await createUnrestrictedNoOpAlert());
          allAlerts.push(await createRestrictedNoOpAlert());
          allAlerts.push(await createNoOpAlert());
          allAlerts.push(await createNoOpAlert());

          const perPage = 4;

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rules/_find?per_page=${perPage}&sort_field=createdAt`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.page).to.equal(1);
              expect(response.body.per_page).to.be.equal(perPage);
              expect(response.body.total).to.be.equal(6);
              {
                const [firstPage] = chunk(
                  allAlerts
                    .filter((alert) => alert.rule_type_id !== 'test.restricted-noop')
                    .map((alert) => alert.id),
                  perPage
                );
                expect(response.body.data.map((alert: any) => alert.id)).to.eql(firstPage);
              }
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.page).to.equal(1);
              expect(response.body.per_page).to.be.equal(perPage);
              expect(response.body.total).to.be.equal(8);

              {
                const [firstPage, secondPage] = chunk(
                  allAlerts.map((alert) => alert.id),
                  perPage
                );
                expect(response.body.data.map((alert: any) => alert.id)).to.eql(firstPage);

                const secondResponse = await supertestWithoutAuth
                  .get(
                    `${getUrlPrefix(space.id)}/${
                      describeType === 'public' ? 'api' : 'internal'
                    }/alerting/rules/_find?per_page=${perPage}&sort_field=createdAt&page=2`
                  )
                  .auth(user.username, user.password);

                expect(secondResponse.body.data.map((alert: any) => alert.id)).to.eql(secondPage);
              }

              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle find alert request with filter appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
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

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rules/_find?filter=alert.attributes.actions:{ actionTypeId: test.noop }`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.page).to.equal(1);
              expect(response.body.per_page).to.be.greaterThan(0);
              expect(response.body.total).to.be.greaterThan(0);
              const match = response.body.data.find((obj: any) => obj.id === createdAlert.id);
              expect(match).to.eql({
                id: createdAlert.id,
                name: 'abc',
                tags: ['foo'],
                rule_type_id: 'test.noop',
                consumer: 'alertsFixture',
                schedule: { interval: '1m' },
                enabled: false,
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    connector_type_id: 'test.noop',
                    params: {},
                  },
                ],
                params: {},
                created_by: 'elastic',
                throttle: '1m',
                updated_by: 'elastic',
                api_key_owner: null,
                mute_all: false,
                muted_alert_ids: [],
                notify_when: 'onThrottleInterval',
                created_at: match.created_at,
                updated_at: match.updated_at,
                execution_status: match.execution_status,
                ...(describeType === 'internal'
                  ? { monitoring: match.monitoring, snooze_end_time: match.snooze_end_time }
                  : {}),
              });
              expect(Date.parse(match.created_at)).to.be.greaterThan(0);
              expect(Date.parse(match.updated_at)).to.be.greaterThan(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle find alert request with fields appropriately', async () => {
          const myTag = uuid.v4();
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                tags: [myTag],
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          // create another type with same tag
          const { body: createdSecondAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                tags: [myTag],
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdSecondAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rules/_find?filter=alert.attributes.alertTypeId:test.restricted-noop&fields=["tags"]&sort_field=createdAt`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.data).to.eql([]);
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.page).to.equal(1);
              expect(response.body.per_page).to.be.greaterThan(0);
              expect(response.body.total).to.be.greaterThan(0);
              const [matchFirst, matchSecond] = response.body.data;
              expect(omit(matchFirst, 'updatedAt')).to.eql({
                id: createdAlert.id,
                actions: [],
                tags: [myTag],
              });
              expect(omit(matchSecond, 'updatedAt')).to.eql({
                id: createdSecondAlert.id,
                actions: [],
                tags: [myTag],
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle find alert request with executionStatus field appropriately', async () => {
          const myTag = uuid.v4();
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                tags: [myTag],
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          // create another type with same tag
          const { body: createdSecondAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                tags: [myTag],
                rule_type_id: 'test.restricted-noop',
                consumer: 'alertsRestrictedFixture',
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdSecondAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rules/_find?filter=alert.attributes.alertTypeId:test.restricted-noop&fields=["tags","executionStatus"]&sort_field=createdAt`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
                statusCode: 403,
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.data).to.eql([]);
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.page).to.equal(1);
              expect(response.body.per_page).to.be.greaterThan(0);
              expect(response.body.total).to.be.greaterThan(0);
              const [matchFirst, matchSecond] = response.body.data;
              expect(omit(matchFirst, 'updatedAt')).to.eql({
                id: createdAlert.id,
                actions: [],
                tags: [myTag],
                execution_status: matchFirst.execution_status,
              });
              expect(omit(matchSecond, 'updatedAt')).to.eql({
                id: createdSecondAlert.id,
                actions: [],
                tags: [myTag],
                execution_status: matchSecond.execution_status,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't find alert from another space`, async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getTestRuleData())
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix('other')}/${
                describeType === 'public' ? 'api' : 'internal'
              }/alerting/rules/_find?search=test.noop&search_fields=alertTypeId`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                page: 1,
                per_page: 10,
                total: 0,
                data: [],
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
};

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('find', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    findTestUtils('public', objectRemover, supertest, supertestWithoutAuth);
    findTestUtils('internal', objectRemover, supertest, supertestWithoutAuth);
  });
}
