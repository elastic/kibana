/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { ALERT_STATUS, ALERT_UUID } from '@kbn/rule-data-utils';
import { getUrlPrefix, ObjectRemover, getTestRuleData, getEventLog } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { UserAtSpaceScenarios } from '../../../scenarios';

const alertAsDataIndex = '.internal.alerts-observability.test.alerts.alerts-default-000001';

// eslint-disable-next-line import/no-default-export
export default function bulkUntrackTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const es = getService('es');

  const runSoon = async (id: string) => {
    return retry.try(async () => {
      await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rule/${id}/_run_soon`)
        .set('kbn-xsrf', 'foo')
        .expect(204);
    });
  };

  describe('bulk untrack', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await es.deleteByQuery({
        index: alertAsDataIndex,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
      });
      objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      describe(scenario.id, () => {
        it('should bulk mark alerts as untracked', async () => {
          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.always-firing-alert-as-data',
                schedule: { interval: '24h' },
                throttle: undefined,
                notify_when: undefined,
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference: 'test',
                },
              })
            )
            .expect(200);
          objectRemover.add(scenario.space.id, createdRule.id, 'rule', 'alerting');

          await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: scenario.space.id,
              type: 'alert',
              id: createdRule.id,
              provider: 'alerting',
              actions: new Map([['active-instance', { equal: 2 }]]),
            });
          });

          await retry.try(async () => {
            const {
              hits: { hits: activeAlerts },
            } = await es.search({
              index: alertAsDataIndex,
              body: { query: { match_all: {} } },
            });

            activeAlerts.forEach((activeAlert: any) => {
              expect(activeAlert._source[ALERT_STATUS]).eql('active');
            });
          });

          const {
            hits: { hits: activeAlerts },
          } = await es.search({
            index: alertAsDataIndex,
            body: { query: { match_all: {} } },
          });

          const ids = activeAlerts.map((activeAlert: any) => activeAlert._source[ALERT_UUID]);

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(scenario.space.id)}/internal/alerting/alerts/_bulk_untrack`)
            .set('kbn-xsrf', 'foo')
            .auth(scenario.user.username, scenario.user.password)
            .send({
              indices: [alertAsDataIndex],
              alert_uuids: ids,
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(403);
              break;
            case 'superuser at space1':
              expect(response.statusCode).to.eql(204);
              await retry.try(async () => {
                const {
                  hits: { hits: untrackedAlerts },
                } = await es.search({
                  index: alertAsDataIndex,
                  body: { query: { match_all: {} } },
                });

                untrackedAlerts.forEach((untrackedAlert: any) => {
                  expect(untrackedAlert._source[ALERT_STATUS]).eql('untracked');
                });
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should create new alerts if run rules again after alerts are untracked', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.always-firing-alert-as-data',
            schedule: { interval: '24h' },
            throttle: undefined,
            notify_when: undefined,
            params: {
              index: ES_TEST_INDEX_NAME,
              reference: 'test',
            },
          })
        )
        .expect(200);

      objectRemover.add('space1', createdRule.id, 'rule', 'alerting');

      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'space1',
          type: 'alert',
          id: createdRule.id,
          provider: 'alerting',
          actions: new Map([['active-instance', { equal: 2 }]]),
        });
      });

      const {
        hits: { hits: activeAlerts },
      } = await es.search({
        index: alertAsDataIndex,
        body: { query: { match_all: {} } },
      });

      const ids = activeAlerts.map((activeAlert: any) => activeAlert._source[ALERT_UUID]);

      await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/alerts/_bulk_untrack`)
        .set('kbn-xsrf', 'foo')
        .send({
          indices: [alertAsDataIndex],
          alert_uuids: ids,
        });

      await runSoon(createdRule.id);

      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'space1',
          type: 'alert',
          id: createdRule.id,
          provider: 'alerting',
          actions: new Map([['active-instance', { equal: 4 }]]),
        });
      });

      await retry.try(async () => {
        const {
          hits: { hits: alerts },
        } = await es.search({
          index: alertAsDataIndex,
          body: { query: { match_all: {} } },
        });

        const activeAlertsRemaining = [];
        const untrackedAlertsRemaining = [];

        alerts.forEach((alert: any) => {
          if (alert._source[ALERT_STATUS] === 'active') {
            activeAlertsRemaining.push(alert);
          } else {
            untrackedAlertsRemaining.push(alert);
          }
        });

        expect(activeAlertsRemaining.length).eql(2);
        expect(untrackedAlertsRemaining.length).eql(2);
      });
    });
  });
}
