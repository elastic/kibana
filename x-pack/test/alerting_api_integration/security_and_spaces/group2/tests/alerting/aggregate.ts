/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Space, User } from '../../../../common/types';
import { Space1AllAtSpace1, SuperuserAtSpace1, UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover, getEventLog } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createAggregateTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');

  const getEventLogWithRetry = async (id: string, space: Space) => {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: space.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions: new Map([['execute', { equal: 1 }]]),
      });
    });
  };

  describe('aggregate', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;

      describe(scenario.id, () => {
        it('should aggregate alert status totals', async () => {
          const NumOkAlerts = 4;
          const NumActiveAlerts = 1;
          const NumErrorAlerts = 2;

          const okAlertIds: string[] = [];
          const activeAlertIds: string[] = [];
          const errorAlertIds: string[] = [];

          await Promise.all(
            [...Array(NumOkAlerts)].map(async () => {
              const okAlertId = await createTestAlert(
                {
                  /**
                   * The _aggregate calls is made
                   * to get all stats across all rule types
                   * that the user has access to. Only a subset
                   * of users have access to the test.restricted-noop/alertsRestrictedFixture
                   * pair. The differences in the stats ensure that even though we request
                   * the stats for all rule types only for the ones that the user has access to
                   * are returned.
                   *  */
                  rule_type_id: 'test.restricted-noop',
                  schedule: { interval: '24h' },
                  consumer: 'alertsRestrictedFixture',
                },
                space,
                user
              );

              okAlertIds.push(okAlertId);

              objectRemover.add(space.id, okAlertId, 'rule', 'alerting');
            })
          );

          await Promise.all(okAlertIds.map((id) => getEventLogWithRetry(id, space)));

          await Promise.all(
            [...Array(NumActiveAlerts)].map(async () => {
              const activeAlertId = await createTestAlert(
                {
                  rule_type_id: 'test.patternFiring',
                  schedule: { interval: '24h' },
                  params: {
                    pattern: { instance: new Array(100).fill(true) },
                  },
                },
                space,
                user
              );

              activeAlertIds.push(activeAlertId);
              objectRemover.add(space.id, activeAlertId, 'rule', 'alerting');
            })
          );

          await Promise.all(activeAlertIds.map((id) => getEventLogWithRetry(id, space)));

          await Promise.all(
            [...Array(NumErrorAlerts)].map(async () => {
              const errorAlertId = await createTestAlert(
                {
                  rule_type_id: 'test.throw',
                  schedule: { interval: '24h' },
                },
                space,
                user
              );

              errorAlertIds.push(errorAlertId);
              objectRemover.add(space.id, errorAlertId, 'rule', 'alerting');
            })
          );

          await Promise.all(errorAlertIds.map((id) => getEventLogWithRetry(id, space)));

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              await aggregate({
                space,
                user,
                expectedStatusCode: 403,
                expectedResponse: {
                  error: 'Forbidden',
                  message: 'Unauthorized to find rules for any rule types',
                  statusCode: 403,
                },
              });
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              await aggregate({
                space,
                user,
                expectedStatusCode: 200,
                expectedResponse: {
                  rule_enabled_status: {
                    disabled: 0,
                    enabled: 3,
                  },
                  rule_execution_status: {
                    ok: 0,
                    active: NumActiveAlerts,
                    error: NumErrorAlerts,
                    pending: 0,
                    unknown: 0,
                    warning: 0,
                  },
                  rule_last_run_outcome: {
                    succeeded: 1,
                    warning: 0,
                    failed: 2,
                  },
                  rule_muted_status: {
                    muted: 0,
                    unmuted: 3,
                  },
                  rule_snoozed_status: {
                    snoozed: 0,
                  },
                  rule_tags: ['foo'],
                },
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              await aggregate({
                space,
                user,
                expectedStatusCode: 200,
                expectedResponse: {
                  rule_enabled_status: {
                    disabled: 0,
                    enabled: 7,
                  },
                  rule_execution_status: {
                    ok: NumOkAlerts,
                    active: NumActiveAlerts,
                    error: NumErrorAlerts,
                    pending: 0,
                    unknown: 0,
                    warning: 0,
                  },
                  rule_last_run_outcome: {
                    succeeded: 5,
                    warning: 0,
                    failed: 2,
                  },
                  rule_muted_status: {
                    muted: 0,
                    unmuted: 7,
                  },
                  rule_snoozed_status: {
                    snoozed: 0,
                  },
                  rule_tags: ['foo'],
                },
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    describe('filtering', () => {
      it('should return the correct rule stats when trying to exploit RBAC through the ruleTypeIds parameter', async () => {
        const { user, space } = Space1AllAtSpace1;

        const okAlertId = await createTestAlert(
          {
            rule_type_id: 'test.restricted-noop',
            schedule: { interval: '24h' },
            consumer: 'alertsRestrictedFixture',
          },
          SuperuserAtSpace1.space,
          SuperuserAtSpace1.user
        );

        const activeAlertId = await createTestAlert(
          {
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '24h' },
            params: {
              pattern: { instance: new Array(100).fill(true) },
            },
          },
          SuperuserAtSpace1.space,
          SuperuserAtSpace1.user
        );

        objectRemover.add(SuperuserAtSpace1.space.id, okAlertId, 'rule', 'alerting');
        objectRemover.add(SuperuserAtSpace1.space.id, activeAlertId, 'rule', 'alerting');

        await aggregate({
          space,
          user,
          params: { rule_type_ids: ['test.restricted-noop', 'test.patternFiring'] },
          expectedStatusCode: 200,
          expectedResponse: {
            rule_enabled_status: {
              disabled: 0,
              enabled: 1,
            },
            rule_execution_status: {
              ok: 0,
              active: 1,
              error: 0,
              pending: 0,
              unknown: 0,
              warning: 0,
            },
            rule_last_run_outcome: {
              succeeded: 1,
              warning: 0,
              failed: 0,
            },
            rule_muted_status: {
              muted: 0,
              unmuted: 1,
            },
            rule_snoozed_status: {
              snoozed: 0,
            },
            rule_tags: ['foo'],
          },
        });
      });

      it('should return the correct rule stats when trying to exploit RBAC through the consumer parameter', async () => {
        const { user, space } = Space1AllAtSpace1;

        const okAlertId = await createTestAlert(
          {
            rule_type_id: 'test.restricted-noop',
            schedule: { interval: '24h' },
            consumer: 'alertsRestrictedFixture',
          },
          SuperuserAtSpace1.space,
          SuperuserAtSpace1.user
        );

        const activeAlertId = await createTestAlert(
          {
            rule_type_id: 'test.patternFiring',
            schedule: { interval: '24h' },
            params: {
              pattern: { instance: new Array(100).fill(true) },
            },
          },
          SuperuserAtSpace1.space,
          SuperuserAtSpace1.user
        );

        objectRemover.add(SuperuserAtSpace1.space.id, okAlertId, 'rule', 'alerting');
        objectRemover.add(SuperuserAtSpace1.space.id, activeAlertId, 'rule', 'alerting');

        await aggregate({
          space,
          user,
          params: { consumers: ['alertsRestrictedFixture', 'alertsFixture'] },
          expectedStatusCode: 200,
          expectedResponse: {
            rule_enabled_status: {
              disabled: 0,
              enabled: 1,
            },
            rule_execution_status: {
              ok: 0,
              active: 1,
              error: 0,
              pending: 0,
              unknown: 0,
              warning: 0,
            },
            rule_last_run_outcome: {
              succeeded: 1,
              warning: 0,
              failed: 0,
            },
            rule_muted_status: {
              muted: 0,
              unmuted: 1,
            },
            rule_snoozed_status: {
              snoozed: 0,
            },
            rule_tags: ['foo'],
          },
        });
      });
    });
  });

  async function createTestAlert(testAlertOverrides = {}, space: Space, user: User) {
    const { body: createdAlert } = await supertest
      .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send(getTestRuleData(testAlertOverrides))
      .auth(user.username, user.password)
      .expect(200);

    return createdAlert.id;
  }

  const aggregate = async ({
    space,
    user,
    expectedStatusCode,
    expectedResponse,
    params = {},
  }: {
    space: Space;
    user: User;
    expectedStatusCode: number;
    expectedResponse: Record<string, unknown>;
    params?: Record<string, unknown>;
  }) => {
    await retry.try(async () => {
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/_aggregate`)
        .set('kbn-xsrf', 'foo')
        .auth(user.username, user.password)
        .send(params);

      expect(response.status).to.eql(expectedStatusCode);
      expect(response.body).to.eql(expectedResponse);
    });
  };
}
