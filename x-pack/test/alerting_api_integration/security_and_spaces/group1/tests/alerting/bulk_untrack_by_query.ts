/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { ALERT_STATUS, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { getUrlPrefix, ObjectRemover, getTestRuleData, getEventLog } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { UserAtSpaceScenarios } from '../../../scenarios';

const alertAsDataIndex = '.internal.alerts-observability.test.alerts.alerts-default-000001';

// eslint-disable-next-line import/no-default-export
export default function bulkUntrackByQueryTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');
  const es = getService('es');

  describe('bulk untrack by query', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await es.deleteByQuery({
        index: alertAsDataIndex,
        query: {
          match_all: {},
        },
        conflicts: 'proceed',
      });
      await objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      describe(scenario.id, () => {
        it('should bulk mark alerts as untracked by query', async () => {
          const { body: createdRule1 } = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                name: 'rule1',
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
          objectRemover.add(scenario.space.id, createdRule1.id, 'rule', 'alerting');

          const { body: createdRule2 } = await supertest
            .post(`${getUrlPrefix(scenario.space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                name: 'rule2',
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
          objectRemover.add(scenario.space.id, createdRule2.id, 'rule', 'alerting');

          await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: scenario.space.id,
              type: 'alert',
              id: createdRule1.id,
              provider: 'alerting',
              actions: new Map([['active-instance', { equal: 2 }]]),
            });
          });

          await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: scenario.space.id,
              type: 'alert',
              id: createdRule2.id,
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

          const response = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(scenario.space.id)}/internal/alerting/alerts/_bulk_untrack_by_query`
            )
            .set('kbn-xsrf', 'foo')
            .auth(scenario.user.username, scenario.user.password)
            .send({
              query: [
                {
                  bool: {
                    must: {
                      term: {
                        'kibana.alert.rule.name': 'rule1',
                      },
                    },
                  },
                },
              ],
              rule_type_ids: ['test.always-firing-alert-as-data'],
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
                const untrackedAlert = [];

                const {
                  hits: { hits },
                } = await es.search({
                  index: alertAsDataIndex,
                  body: { query: { match_all: {} } },
                });

                hits.forEach((alert: any) => {
                  if (
                    alert._source[ALERT_RULE_NAME] === 'rule1' &&
                    alert._source[ALERT_STATUS] === 'untracked'
                  ) {
                    untrackedAlert.push(alert);
                  }
                });

                expect(untrackedAlert.length).eql(2);
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
