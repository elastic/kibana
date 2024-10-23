/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { chunk, omit } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import {
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import { Space } from '../../../../common/types';
import {
  Space1AllAtSpace1,
  StackAlertsOnly,
  SuperuserAtSpace1,
  UserAtSpaceScenarios,
} from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createFindTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('find internal API', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

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
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              search: 'test.noop',
              search_fields: 'alertTypeId',
            });

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
              const activeSnoozes = match.active_snoozes;
              const hasActiveSnoozes = !!(activeSnoozes || []).filter((obj: any) => obj).length;
              expect(match).to.eql({
                id: createdAlert.id,
                name: 'abc',
                tags: ['foo'],
                rule_type_id: 'test.noop',
                running: match.running ?? false,
                consumer: 'alertsFixture',
                schedule: { interval: '1m' },
                enabled: true,
                actions: [],
                params: {},
                created_by: 'elastic',
                api_key_created_by_user: false,
                revision: 0,
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
                ...(match.next_run ? { next_run: match.next_run } : {}),
                ...(match.last_run ? { last_run: match.last_run } : {}),
                monitoring: match.monitoring,
                snooze_schedule: match.snooze_schedule,
                ...(hasActiveSnoozes && { active_snoozes: activeSnoozes }),
                is_snoozed_until: null,
              });
              expect(Date.parse(match.created_at)).to.be.greaterThan(0);
              expect(Date.parse(match.updated_at)).to.be.greaterThan(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should filter out types that the user is not authorized to `get` retaining pagination', async () => {
          const allAlerts = [];
          allAlerts.push(await createNoOpAlert(space));
          allAlerts.push(await createNoOpAlert(space));
          allAlerts.push(await createRestrictedNoOpAlert(space));
          allAlerts.push(await createUnrestrictedNoOpAlert(space));
          allAlerts.push(await createUnrestrictedNoOpAlert(space));
          allAlerts.push(await createRestrictedNoOpAlert(space));
          allAlerts.push(await createNoOpAlert(space));
          allAlerts.push(await createNoOpAlert(space));

          const perPage = 4;

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              per_page: perPage,
              sort_field: 'createdAt',
            });

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

              const [firstPage, secondPage] = chunk(
                allAlerts.map((alert) => alert.id),
                perPage
              );
              expect(response.body.data.map((alert: any) => alert.id)).to.eql(firstPage);

              const secondResponse = await supertestWithoutAuth
                .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
                .set('kbn-xsrf', 'foo')
                .auth(user.username, user.password)
                .send({
                  per_page: perPage,
                  sort_field: 'createdAt',
                  page: '2',
                });

              expect(secondResponse.statusCode).to.eql(200);
              expect(secondResponse.body.data.map((alert: any) => alert.id)).to.eql(secondPage);

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
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              filter: 'alert.attributes.actions:{ actionTypeId: "test.noop" }',
            });

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
              const activeSnoozes = match.active_snoozes;
              const hasActiveSnoozes = !!(activeSnoozes || []).filter((obj: any) => obj).length;
              expect(match).to.eql({
                id: createdAlert.id,
                name: 'abc',
                tags: ['foo'],
                rule_type_id: 'test.noop',
                running: match.running ?? false,
                consumer: 'alertsFixture',
                schedule: { interval: '1m' },
                enabled: false,
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    connector_type_id: 'test.noop',
                    params: {},
                    uuid: match.actions[0].uuid,
                  },
                ],
                params: {},
                created_by: 'elastic',
                api_key_created_by_user: null,
                revision: 0,
                throttle: '1m',
                updated_by: 'elastic',
                api_key_owner: null,
                mute_all: false,
                muted_alert_ids: [],
                notify_when: 'onThrottleInterval',
                created_at: match.created_at,
                updated_at: match.updated_at,
                execution_status: match.execution_status,
                ...(match.next_run ? { next_run: match.next_run } : {}),
                ...(match.last_run ? { last_run: match.last_run } : {}),
                monitoring: match.monitoring,
                snooze_schedule: match.snooze_schedule,
                ...(hasActiveSnoozes && { active_snoozes: activeSnoozes }),
                is_snoozed_until: null,
              });
              expect(Date.parse(match.created_at)).to.be.greaterThan(0);
              expect(Date.parse(match.updated_at)).to.be.greaterThan(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle find alert request with fields appropriately', async () => {
          const myTag = uuidv4();
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
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              filter: 'alert.attributes.alertTypeId:test.restricted-noop',
              fields: ['tags'],
              sort_field: 'createdAt',
            });

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
                snooze_schedule: [],
                is_snoozed_until: null,
              });
              expect(omit(matchSecond, 'updatedAt')).to.eql({
                id: createdSecondAlert.id,
                actions: [],
                tags: [myTag],
                snooze_schedule: [],
                is_snoozed_until: null,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle find alert request with executionStatus field appropriately', async () => {
          const myTag = uuidv4();
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
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              filter: 'alert.attributes.alertTypeId:test.restricted-noop',
              fields: ['tags', 'executionStatus'],
              sort_field: 'createdAt',
            });

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
                snooze_schedule: [],
                is_snoozed_until: null,
              });
              expect(omit(matchSecond, 'updatedAt')).to.eql({
                id: createdSecondAlert.id,
                actions: [],
                tags: [myTag],
                execution_status: matchSecond.execution_status,
                snooze_schedule: [],
                is_snoozed_until: null,
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
            .post(`${getUrlPrefix('other')}/internal/alerting/rules/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              search: 'test.noop',
              search_fields: 'alertTypeId',
            });

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

        it('should filter by rule type IDs correctly', async () => {
          await createNoOpAlert(space);
          await createRestrictedNoOpAlert(space);
          await createUnrestrictedNoOpAlert(space);

          const perPage = 10;
          const ruleTypeIds = ['test.restricted-noop', 'test.noop'];

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              per_page: perPage,
              sort_field: 'createdAt',
              rule_type_ids: ruleTypeIds,
            });

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
              expect(response.body.total).to.be.equal(1);

              expect(
                response.body.data.every(
                  (rule: { rule_type_id: string }) => rule.rule_type_id === 'test.noop'
                )
              ).to.be.eql(true);
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.total).to.be.equal(2);

              expect(
                response.body.data.every((rule: { rule_type_id: string }) =>
                  ruleTypeIds.includes(rule.rule_type_id)
                )
              ).to.be.eql(true);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('filtering', () => {
      it('should return the correct rules when trying to exploit RBAC through the ruleTypeIds parameter', async () => {
        const { user, space } = Space1AllAtSpace1;

        const { body: createdAlert1 } = await supertest
          .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.restricted-noop',
              consumer: 'alertsRestrictedFixture',
            })
          )
          .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
          .expect(200);

        const { body: createdAlert2 } = await supertest
          .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.noop',
              consumer: 'alertsFixture',
            })
          )
          .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
          .expect(200);

        objectRemover.add(SuperuserAtSpace1.space.id, createdAlert1.id, 'rule', 'alerting');
        objectRemover.add(SuperuserAtSpace1.space.id, createdAlert2.id, 'rule', 'alerting');

        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({
            rule_type_ids: ['test.noop', 'test.restricted-noop'],
          });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].rule_type_id).to.eql('test.noop');
      });

      it('should return the correct rules when trying to exploit RBAC through the consumers parameter', async () => {
        const { user, space } = Space1AllAtSpace1;

        const { body: createdAlert1 } = await supertest
          .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.restricted-noop',
              consumer: 'alertsRestrictedFixture',
            })
          )
          .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
          .expect(200);

        const { body: createdAlert2 } = await supertest
          .post(`${getUrlPrefix(SuperuserAtSpace1.space.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              rule_type_id: 'test.noop',
              consumer: 'alertsFixture',
            })
          )
          .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
          .expect(200);

        objectRemover.add(SuperuserAtSpace1.space.id, createdAlert1.id, 'rule', 'alerting');
        objectRemover.add(SuperuserAtSpace1.space.id, createdAlert2.id, 'rule', 'alerting');

        const response = await supertestWithoutAuth
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_find`)
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password)
          .send({
            consumers: ['alertsFixture', 'alertsRestrictedFixture'],
          });

        expect(response.status).to.eql(200);
        expect(response.body.total).to.equal(1);
        expect(response.body.data[0].consumer).to.eql('alertsFixture');
      });
    });

    describe('stack alerts', () => {
      const ruleTypes = [
        [
          ES_QUERY_ID,
          {
            searchType: 'esQuery',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: [1000],
            thresholdComparator: '>',
            size: 100,
            esQuery: '{\n    "query":{\n      "match_all" : {}\n    }\n  }',
            aggType: 'count',
            groupBy: 'all',
            termSize: 5,
            excludeHitsFromPreviousRun: false,
            sourceFields: [],
            index: ['.kibana'],
            timeField: 'created_at',
          },
        ],
        [
          OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          {
            criteria: [
              {
                comparator: '>',
                metrics: [
                  {
                    name: 'A',
                    aggType: 'count',
                  },
                ],
                threshold: [100],
                timeSize: 1,
                timeUnit: 'm',
              },
            ],
            alertOnNoData: false,
            alertOnGroupDisappear: false,
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: 'kibana-event-log-data-view',
            },
          },
        ],
        [
          ML_ANOMALY_DETECTION_RULE_TYPE_ID,
          {
            severity: 75,
            resultType: 'bucket',
            includeInterim: false,
            jobSelection: {
              jobIds: ['low_request_rate'],
            },
          },
        ],
      ];

      const createRule = async (rule = {}) => {
        const { body: createdAlert } = await supertest
          .post(`${getUrlPrefix('space1')}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(getTestRuleData({ ...rule }))
          .expect(200);

        objectRemover.add('space1', createdAlert.id, 'rule', 'alerting');
      };

      for (const [ruleTypeId, params] of ruleTypes) {
        it(`should get rules of ${ruleTypeId} rule type ID and stackAlerts consumer`, async () => {
          /**
           * We create two rules. The first one is a test.noop
           * rule with stackAlerts as consumer. The second rule
           * is has different rule type ID but with the same consumer as the first rule (stackAlerts).
           * This way we can verify that the find API call returns only the rules the user is authorized to.
           * Specifically only the second rule because the StackAlertsOnly user does not have
           * access to the test.noop rule type.
           */
          await createRule({ consumer: 'stackAlerts' });
          await createRule({ rule_type_id: ruleTypeId, params, consumer: 'stackAlerts' });

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix('space1')}/api/alerting/rules/_find`)
            .auth(StackAlertsOnly.username, StackAlertsOnly.password);

          expect(response.statusCode).to.eql(200);
          expect(response.body.total).to.equal(1);
          expect(response.body.data[0].rule_type_id).to.equal(ruleTypeId);
          expect(response.body.data[0].consumer).to.equal('stackAlerts');
        });
      }

      for (const [ruleTypeId, params] of ruleTypes) {
        it(`should NOT get rules of ${ruleTypeId} rule type ID and NOT stackAlerts consumer`, async () => {
          /**
           * We create two rules with logs as consumer. The user is authorized to
           * access rules only with the stackAlerts consumers.
           */
          await createRule({ consumer: 'logs' });
          await createRule({ rule_type_id: ruleTypeId, params, consumer: 'logs' });

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix('space1')}/api/alerting/rules/_find`)
            .auth(StackAlertsOnly.username, StackAlertsOnly.password);

          expect(response.statusCode).to.eql(200);
          expect(response.body.total).to.equal(0);
        });
      }
    });

    async function createNoOpAlert(space: Space, overrides = {}) {
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

    function createRestrictedNoOpAlert(space: Space) {
      return createNoOpAlert(space, {
        rule_type_id: 'test.restricted-noop',
        consumer: 'alertsRestrictedFixture',
      });
    }

    function createUnrestrictedNoOpAlert(space: Space) {
      return createNoOpAlert(space, {
        rule_type_id: 'test.unrestricted-noop',
        consumer: 'alertsFixture',
      });
    }
  });
}
