/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { get } from 'lodash';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import {
  IValidatedEvent,
  nanosToMillis,
  IValidatedEventInternalDocInfo,
} from '@kbn/event-log-plugin/server';
import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { ES_TEST_INDEX_NAME, ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';

import { Spaces } from '../../../scenarios';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getEventLog,
  resetRulesSettings,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { TEST_CACHE_EXPIRATION_TIME } from '../create_test_data';

const InstanceActions = new Set<string | undefined>([
  'new-instance',
  'active-instance',
  'recovered-instance',
  'untracked-instance',
]);

// eslint-disable-next-line import/no-default-export
export default function eventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('eventLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await resetRulesSettings(supertest, Spaces.default.id);
      await resetRulesSettings(supertest, Spaces.space1.id);
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    after(async () => {
      await resetRulesSettings(supertest, Spaces.default.id);
      await resetRulesSettings(supertest, Spaces.space1.id);
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    for (const space of [Spaces.default, Spaces.space1]) {
      describe(`in space ${space.id}`, () => {
        it('should generate expected events for normal operation', async () => {
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

          // pattern of when the alert should fire
          const pattern = {
            instance: [false, true, true],
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '2s' },
                throttle: '1s',
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 4 }],
                ['execute', { gte: 4 }],
                ['execute-action', { equal: 2 }],
                ['new-instance', { equal: 1 }],
                ['active-instance', { gte: 1 }],
                ['recovered-instance', { equal: 1 }],
              ]),
            });
          });

          // get the filtered events only with action 'new-instance'
          const filteredEvents = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([['new-instance', { equal: 1 }]]),
              filter: 'event.action:(new-instance)',
            });
          });

          expect(getEventsByAction(filteredEvents, 'execute').length).equal(0);
          expect(getEventsByAction(filteredEvents, 'execute-action').length).equal(0);
          expect(getEventsByAction(events, 'new-instance').length).equal(1);

          const executeEvents = getEventsByAction(events, 'execute');
          const executeStartEvents = getEventsByAction(events, 'execute-start');
          const newInstanceEvents = getEventsByAction(events, 'new-instance');
          const recoveredInstanceEvents = getEventsByAction(events, 'recovered-instance');

          // make sure the events are in the right temporal order
          const executeTimes = getTimestamps(executeEvents);
          const executeStartTimes = getTimestamps(executeStartEvents);
          const newInstanceTimes = getTimestamps(newInstanceEvents);
          const recoveredInstanceTimes = getTimestamps(recoveredInstanceEvents);

          expect(executeTimes[0] < newInstanceTimes[0]).to.be(true);
          expect(executeTimes[1] >= newInstanceTimes[0]).to.be(true);
          expect(executeTimes[2] > newInstanceTimes[0]).to.be(true);
          expect(executeStartTimes.length === executeTimes.length).to.be(true);
          expect(recoveredInstanceTimes[0] > newInstanceTimes[0]).to.be(true);

          // validate each event
          let executeCount = 0;
          let numActiveAlerts = 0;
          let numNewAlerts = 0;
          let numRecoveredAlerts = 0;
          let currentExecutionId;
          const executionIds = [];
          const executeStatuses = ['ok', 'active', 'active'];
          for (const event of events) {
            switch (event?.event?.action) {
              case 'execute-start':
                currentExecutionId = event?.kibana?.alert?.rule?.execution?.uuid;
                executionIds.push(currentExecutionId);
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    {
                      type: RULE_SAVED_OBJECT_TYPE,
                      id: alertId,
                      rel: 'primary',
                      type_id: 'test.patternFiring',
                    },
                  ],
                  message: `rule execution start: "${alertId}"`,
                  shouldHaveTask: true,
                  ruleTypeId: response.body.rule_type_id,
                  executionId: currentExecutionId,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                  },
                  consumer: 'alertsFixture',
                });
                break;
              case 'execute-action':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    {
                      type: RULE_SAVED_OBJECT_TYPE,
                      id: alertId,
                      rel: 'primary',
                      type_id: 'test.patternFiring',
                    },
                    { type: 'action', id: createdAction.id, type_id: 'test.noop' },
                  ],
                  message: `alert: test.patternFiring:${alertId}: 'abc' instanceId: 'instance' scheduled actionGroup: 'default' action: test.noop:${createdAction.id}`,
                  instanceId: 'instance',
                  actionGroupId: 'default',
                  executionId: currentExecutionId,
                  ruleTypeId: response.body.rule_type_id,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
                  consumer: 'alertsFixture',
                });
                break;
              case 'new-instance':
                numNewAlerts++;
                validateInstanceEvent(
                  event,
                  `created new alert: 'instance'`,
                  false,
                  false,
                  currentExecutionId
                );
                break;
              case 'recovered-instance':
                numRecoveredAlerts++;
                validateInstanceEvent(
                  event,
                  `alert 'instance' has recovered`,
                  true,
                  false,
                  currentExecutionId
                );
                break;
              case 'active-instance':
                numActiveAlerts++;
                validateInstanceEvent(
                  event,
                  `active alert: 'instance' in actionGroup: 'default'`,
                  false,
                  false,
                  currentExecutionId
                );
                break;
              case 'execute':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    {
                      type: RULE_SAVED_OBJECT_TYPE,
                      id: alertId,
                      rel: 'primary',
                      type_id: 'test.patternFiring',
                    },
                  ],
                  outcome: 'success',
                  message: `rule executed: test.patternFiring:${alertId}: 'abc'`,
                  status: executeStatuses[executeCount++],
                  shouldHaveTask: true,
                  executionId: currentExecutionId,
                  ruleTypeId: response.body.rule_type_id,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
                  consumer: 'alertsFixture',
                  numActiveAlerts,
                  numNewAlerts,
                  numRecoveredAlerts,
                });
                numActiveAlerts = 0;
                numNewAlerts = 0;
                numRecoveredAlerts = 0;
                break;
              // this will get triggered as we add new event actions
              default:
                throw new Error(`unexpected event action "${event?.event?.action}"`);
            }
          }

          const actionEvents = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'action',
              id: createdAction.id,
              provider: 'actions',
              actions: new Map([['execute', { gte: 1 }]]),
            });
          });

          function validateInstanceEvent(
            event: IValidatedEventInternalDocInfo,
            subMessage: string,
            shouldHaveEventEnd: boolean,
            flapping: boolean,
            executionId?: string
          ) {
            validateEvent(event, {
              spaceId: space.id,
              savedObjects: [
                {
                  type: RULE_SAVED_OBJECT_TYPE,
                  id: alertId,
                  rel: 'primary',
                  type_id: 'test.patternFiring',
                },
              ],
              message: `test.patternFiring:${alertId}: 'abc' ${subMessage}`,
              instanceId: 'instance',
              actionGroupId: 'default',
              shouldHaveEventEnd,
              executionId,
              ruleTypeId: response.body.rule_type_id,
              rule: {
                id: alertId,
                category: response.body.rule_type_id,
                license: 'basic',
                ruleset: 'alertsFixture',
                name: response.body.name,
              },
              consumer: 'alertsFixture',
              flapping,
            });
          }

          for (const event of actionEvents) {
            switch (event?.event?.action) {
              case 'execute':
                expect(event?.kibana?.alert?.rule?.execution?.uuid).not.to.be(undefined);
                expect(
                  executionIds.indexOf(event?.kibana?.alert?.rule?.execution?.uuid)
                ).to.be.greaterThan(-1);
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'action', id: createdAction.id, rel: 'primary', type_id: 'test.noop' },
                  ],
                  message: `action executed: test.noop:${createdAction.id}: MY action`,
                  outcome: 'success',
                  shouldHaveTask: true,
                  ruleTypeId: response.body.rule_type_id,
                  rule: undefined,
                  consumer: 'alertsFixture',
                  source: 'alert',
                });
                break;
            }
          }
        });

        it('should generate expected events for summary actions', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'Test conn',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'connector', 'actions');

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.always-firing-alert-as-data',
                schedule: { interval: '10m' },
                throttle: undefined,
                notify_when: undefined,
                params: {
                  index: ES_TEST_INDEX_NAME,
                  reference: 'test',
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {
                      index: ES_TEST_INDEX_NAME,
                      reference: 'test',
                      message: '',
                    },
                    frequency: {
                      summary: true,
                      throttle: null,
                      notify_when: 'onActiveAlert',
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { equal: 1 }],
                ['execute', { equal: 1 }],
                ['active-instance', { equal: 2 }],
                ['execute-action', { equal: 1 }],
              ]),
            });
          });

          const executeActions = events.filter(
            (event) => event?.event?.action === 'execute-action'
          );

          expect(executeActions.length).to.be(1);

          const summary = executeActions[0]?.kibana?.alerting?.summary;
          expect(summary?.new?.count).to.be(2);
          expect(summary?.ongoing?.count).to.be(0);
          expect(summary?.recovered?.count).to.be(0);
        });

        it('should generate expected events for rules with multiple searches', async () => {
          const numSearches = 4;
          const delaySeconds = 2;

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.multipleSearches',
                schedule: { interval: '1s' },
                throttle: null,
                params: {
                  numSearches,
                  delay: `${delaySeconds}s`,
                },
                actions: [],
              })
            );

          expect(response.status).to.eql(200);
          const ruleId = response.body.id;
          objectRemover.add(space.id, ruleId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: ruleId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute', { gte: 4 }],
              ]),
            });
          });

          // validate each event
          let currentExecutionId;
          let numActiveAlerts = 0;
          let numNewAlerts = 0;
          let numRecoveredAlerts = 0;
          for (const event of events) {
            switch (event?.event?.action) {
              case 'execute-start':
                currentExecutionId = event?.kibana?.alert?.rule?.execution?.uuid;
                break;
              case 'new-instance':
                numNewAlerts++;
                break;
              case 'recovered-instance':
                numRecoveredAlerts++;
                break;
              case 'active-instance':
                numActiveAlerts++;
                break;
              case 'execute':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: ruleId, rel: 'primary', type_id: 'test.multipleSearches' },
                  ],
                  outcome: 'success',
                  message: `rule executed: test.multipleSearches:${ruleId}: 'abc'`,
                  status: 'ok',
                  shouldHaveTask: true,
                  executionId: currentExecutionId,
                  numTriggeredActions: 0,
                  ruleTypeId: response.body.rule_type_id,
                  rule: {
                    id: ruleId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
                  consumer: 'alertsFixture',
                  numActiveAlerts,
                  numNewAlerts,
                  numRecoveredAlerts,
                });
                numActiveAlerts = 0;
                numNewAlerts = 0;
                numRecoveredAlerts = 0;
                expect(event?.kibana?.alert?.rule?.execution?.metrics?.number_of_searches).to.be(
                  numSearches
                );
                const esSearchDuration = Number(
                  event?.kibana?.alert?.rule?.execution?.metrics?.es_search_duration_ms
                );
                const totalSearchDuration = Number(
                  event?.kibana?.alert?.rule?.execution?.metrics?.total_search_duration_ms
                );

                expect(esSearchDuration).not.to.be(undefined);
                expect(totalSearchDuration).not.to.be(undefined);

                // Expect these searches to take time
                expect(esSearchDuration! > 0).to.be(true);
                expect(totalSearchDuration! > 0).to.be(true);

                // Total search duration should be greater since it includes any network latency
                expect(totalSearchDuration! - esSearchDuration! > 0).to.be(true);

                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.claim_to_start_duration_ms
                ).to.be.greaterThan(0);
                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.total_run_duration_ms
                ).to.be.greaterThan(0);
                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.prepare_rule_duration_ms
                ).to.be.greaterThan(0);
                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.rule_type_run_duration_ms
                ).to.be.greaterThan(0);
                expect(
                  // @ts-expect-error upgrade typescript v5.1.6
                  event?.kibana?.alert?.rule?.execution?.metrics?.process_alerts_duration_ms! >= 0
                ).to.be(true);
                expect(
                  // @ts-expect-error upgrade typescript v5.1.6
                  event?.kibana?.alert?.rule?.execution?.metrics?.trigger_actions_duration_ms! >= 0
                ).to.be(true);
                expect(
                  event?.kibana?.alert?.rule?.execution?.metrics?.process_rule_duration_ms
                ).to.be.greaterThan(0);
                break;
              // this will get triggered as we add new event actions
              default:
                throw new Error(`unexpected event action "${event?.event?.action}"`);
            }
          }
        });

        it('should generate events for execution errors', async () => {
          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.throw',
                schedule: { interval: '1s' },
                throttle: null,
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                ['execute-start', { gte: 1 }],
                ['execute', { gte: 1 }],
              ]),
            });
          });

          const executeEvents = getEventsByAction(events, 'execute');
          const executeStartEvents = getEventsByAction(events, 'execute-start');

          const startEvent = executeStartEvents[0];
          const executeEvent = executeEvents[0];

          expect(startEvent).to.be.ok();
          expect(executeEvent).to.be.ok();

          validateEvent(startEvent, {
            spaceId: space.id,
            savedObjects: [
              { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
            ],
            message: `rule execution start: "${alertId}"`,
            shouldHaveTask: true,
            ruleTypeId: response.body.rule_type_id,
            rule: {
              id: alertId,
              category: response.body.rule_type_id,
              license: 'basic',
              ruleset: 'alertsFixture',
            },
            consumer: 'alertsFixture',
          });

          validateEvent(executeEvent, {
            spaceId: space.id,
            savedObjects: [{ type: 'alert', id: alertId, rel: 'primary', type_id: 'test.throw' }],
            outcome: 'failure',
            message: `rule execution failure: test.throw:${alertId}: 'abc'`,
            errorMessage: 'this alert is intended to fail',
            status: 'error',
            reason: 'execute',
            shouldHaveTask: true,
            ruleTypeId: response.body.rule_type_id,
            rule: {
              id: alertId,
              category: response.body.rule_type_id,
              license: 'basic',
              ruleset: 'alertsFixture',
              name: 'abc',
            },
            consumer: 'alertsFixture',
            numActiveAlerts: 0,
            numNewAlerts: 0,
            numRecoveredAlerts: 0,
          });
        });

        it('should generate expected events for flapping alerts that settle on active', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false].concat(
            ...new Array(8).fill(true),
            false
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                throttle: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                  },
                ],
                notify_when: RuleNotifyWhen.CHANGE,
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 6 }],
                ['execute', { gte: 6 }],
                ['execute-action', { equal: 6 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { gte: 6 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          const result = [false, false, false, false, false].concat(
            new Array(9).fill(true),
            false,
            false,
            false
          );
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts that settle on active where the action notifyWhen is set to "on status change"', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false].concat(
            ...new Array(8).fill(true),
            false
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                throttle: null,
                notify_when: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 6 }],
                ['execute', { gte: 6 }],
                ['execute-action', { equal: 6 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { gte: 6 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          const result = [false, false, false, false, false].concat(
            new Array(9).fill(true),
            false,
            false,
            false
          );
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts settle on recovered', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false, true].concat(
            new Array(11).fill(false)
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                throttle: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                  },
                ],
                notify_when: RuleNotifyWhen.CHANGE,
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 6 }],
                ['execute', { gte: 6 }],
                ['execute-action', { equal: 6 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { gte: 3 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          expect(flapping).to.eql(
            [false, false, false, false, false].concat(new Array(8).fill(true))
          );
        });

        it('should generate expected events for flapping alerts settle on recovered where the action notifyWhen is set to "on status change"', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false, true].concat(
            new Array(11).fill(false)
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                throttle: null,
                notify_when: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 6 }],
                ['execute', { gte: 6 }],
                ['execute-action', { equal: 6 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { gte: 3 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          expect(flapping).to.eql(
            [false, false, false, false, false].concat(new Array(8).fill(true))
          );
        });

        it('should generate expected events for flapping alerts over a period of time longer than the look back', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 5,
              status_change_threshold: 5,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false].concat(
            ...new Array(8).fill(true),
            false
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                throttle: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                  },
                ],
                notify_when: RuleNotifyWhen.CHANGE,
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 8 }],
                ['execute', { gte: 8 }],
                ['execute-action', { equal: 8 }],
                ['new-instance', { equal: 4 }],
                ['active-instance', { gte: 4 }],
                ['recovered-instance', { equal: 4 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          const result = [false, false, false, false, false, false, false].concat(
            new Array(6).fill(true),
            false,
            false,
            false,
            false
          );
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts that settle on active where notifyWhen is NOT set to "on status change"', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false].concat(
            ...new Array(8).fill(true),
            false
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '2s' },
                notify_when: RuleNotifyWhen.THROTTLE,
                throttle: '1s',
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 15 }],
                ['execute', { gte: 15 }],
                ['execute-action', { equal: 15 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { gte: 6 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          const result = [false, false, false, false, false].concat(
            new Array(9).fill(true),
            false,
            false,
            false
          );
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts that settle on active where the action notifyWhen is NOT set to "on status change"', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false].concat(
            ...new Array(8).fill(true),
            false
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '2s' },
                throttle: null,
                notify_when: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                    frequency: {
                      summary: false,
                      notify_when: RuleNotifyWhen.ACTIVE,
                    },
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                    frequency: {
                      summary: false,
                      notify_when: RuleNotifyWhen.ACTIVE,
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 15 }],
                ['execute', { gte: 15 }],
                ['execute-action', { equal: 15 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { gte: 6 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          const result = [false, false, false, false, false].concat(
            new Array(9).fill(true),
            false,
            false,
            false
          );
          expect(flapping).to.eql(result);
        });

        it('should generate expected events for flapping alerts that settle on recovered where notifyWhen is NOT set to "on status change"', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false, true].concat(
            new Array(11).fill(false)
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '2s' },
                throttle: '1s',
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 8 }],
                ['execute', { gte: 8 }],
                ['execute-action', { equal: 8 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { gte: 3 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          expect(flapping).to.eql(
            [false, false, false, false, false].concat(new Array(8).fill(true))
          );
        });

        it('should generate expected events for flapping alerts that settle on recovered where the action notifyWhen is NOT set to "on status change"', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const instance = [true, false, false, true, false, true, false, true, false, true].concat(
            new Array(11).fill(false)
          );
          const pattern = {
            instance,
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '2s' },
                throttle: null,
                notify_when: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                    frequency: {
                      summary: false,
                      notify_when: RuleNotifyWhen.ACTIVE,
                    },
                  },
                  {
                    id: createdAction.id,
                    group: 'recovered',
                    params: {},
                    frequency: {
                      summary: false,
                      notify_when: RuleNotifyWhen.ACTIVE,
                    },
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 8 }],
                ['execute', { gte: 8 }],
                ['execute-action', { equal: 8 }],
                ['new-instance', { equal: 3 }],
                ['active-instance', { gte: 3 }],
                ['recovered-instance', { equal: 3 }],
              ]),
            });
          });

          const flapping = events
            .filter(
              (event) =>
                event?.event?.action === 'active-instance' ||
                event?.event?.action === 'recovered-instance'
            )
            .map((event) => event?.kibana?.alert?.flapping);
          expect(flapping).to.eql(
            [false, false, false, false, false].concat(new Array(8).fill(true))
          );
        });

        it('should generate expected uuids for events for flapping alerts that go active while flapping and eventually recover', async () => {
          await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth('superuser', 'superuser')
            .send({
              enabled: true,
              look_back_window: 6,
              status_change_threshold: 4,
            })
            .expect(200);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

          // flap and then recover, then active again
          const instance = [true, false, true, false, true].concat(
            ...new Array(6).fill(false),
            true
          );
          const pattern = { instance };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                throttle: null,
                params: { pattern },
                actions: [],
                notify_when: RuleNotifyWhen.CHANGE,
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                ['execute', { gte: 10 }],
                ['new-instance', { gte: 4 }],
                ['active-instance', { gte: 3 }],
                ['recovered-instance', { gte: 3 }],
              ]),
            });
          });

          let currentUuid: string | undefined;
          const seenUuids = new Set<string>();
          for (const event of events) {
            const action = event?.event?.action;
            const uuid = event?.kibana?.alert?.uuid;

            if (!InstanceActions.has(action)) continue;

            expect(uuid).to.be.ok();

            if (action === 'new-instance') {
              expect(currentUuid).to.be(undefined);
              expect(seenUuids.has(uuid!)).to.be(false);
              currentUuid = uuid;
              seenUuids.add(uuid!);
            } else if (action === 'active-instance') {
              expect(uuid).to.be(currentUuid);
            } else if (action === 'recovered-instance') {
              expect(uuid).to.be(currentUuid);
              currentUuid = undefined;
            }
          }
        });

        it('should generate expected events affected by active maintenance windows', async () => {
          // Create 2 active maintenance windows
          const { body: window1 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              title: 'test-maintenance-window-1',
              duration: 60 * 60 * 1000, // 1 hr
              r_rule: {
                dtstart: moment.utc().toISOString(),
                tzid: 'UTC',
                freq: 0, // yearly
                count: 1,
              },
            })
            .expect(200);
          objectRemover.add(space.id, window1.id, 'rules/maintenance_window', 'alerting', true);

          const { body: window2 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              title: 'test-maintenance-window-2',
              duration: 60 * 60 * 1000, // 1 hr
              r_rule: {
                dtstart: moment.utc().toISOString(),
                tzid: 'UTC',
                freq: 0, // yearly
                count: 1,
              },
            })
            .expect(200);
          objectRemover.add(space.id, window2.id, 'rules/maintenance_window', 'alerting', true);

          // Create 1 inactive maintenance window
          const { body: window3 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              title: 'test-maintenance-window-3',
              duration: 60 * 60 * 1000, // 1 hr
              r_rule: {
                dtstart: moment.utc().add(1, 'day').toISOString(),
                tzid: 'UTC',
                freq: 0, // yearly
                count: 1,
              },
            })
            .expect(200);
          objectRemover.add(space.id, window3.id, 'rules/maintenance_window', 'alerting', true);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

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

          // pattern of when the alert should fire
          const pattern = {
            instance: [false, true, true],
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '2s' },
                throttle: '1s',
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 4 }],
                ['execute', { gte: 4 }],
                ['new-instance', { equal: 1 }],
                ['active-instance', { gte: 1 }],
                ['recovered-instance', { equal: 1 }],
              ]),
            });
          });

          const executeEvents = events.filter((event) => event?.event?.action === 'execute');

          // the first execute event should not have any maintenance window ids because there were no alerts during the
          // first execution
          for (let i = 0; i < executeEvents.length; i++) {
            if (i === 0) {
              expect(executeEvents[i]?.kibana?.alert?.maintenance_window_ids).to.be(undefined);
            } else {
              const alertMaintenanceWindowIds =
                executeEvents[i]?.kibana?.alert?.maintenance_window_ids?.sort();
              expect(alertMaintenanceWindowIds).eql([window1.id, window2.id].sort());
            }
          }

          const actionsToCheck = ['new-instance', 'active-instance', 'recovered-instance'];
          events.forEach((event) => {
            if (actionsToCheck.includes(event?.event?.action || '')) {
              const alertMaintenanceWindowIds =
                event?.kibana?.alert?.maintenance_window_ids?.sort();
              expect(alertMaintenanceWindowIds).eql([window1.id, window2.id].sort());
            }
          });
        });

        it('should not fire summary actions during maintenance window', async () => {
          const { body: window } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              title: 'test-maintenance-window-1',
              duration: 60 * 60 * 1000, // 1 hr
              r_rule: {
                dtstart: moment.utc().toISOString(),
                tzid: 'UTC',
                freq: 0, // yearly
                count: 1,
              },
            })
            .expect(200);
          objectRemover.add(space.id, window.id, 'rules/maintenance_window', 'alerting', true);

          // wait so cache expires
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'Test conn',
              connector_type_id: 'test.noop',
              config: {},
              secrets: {},
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'connector', 'actions');

          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
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
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {
                      index: ES_TEST_INDEX_NAME,
                      reference: 'test',
                      message: '',
                    },
                    frequency: {
                      summary: true,
                      throttle: null,
                      notify_when: 'onActiveAlert',
                    },
                  },
                ],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          // get the events we're expecting
          await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: createdRule.id,
              provider: 'alerting',
              actions: new Map([
                ['execute-start', { equal: 1 }],
                ['execute', { equal: 1 }],
                ['active-instance', { equal: 2 }],
              ]),
            });
          });

          // Try to get actions, should fail
          let hasActions = false;
          try {
            await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: createdRule.id,
              provider: 'alerting',
              actions: new Map([['execute-action', { equal: 1 }]]),
            });
            hasActions = true;
          } catch (e) {
            hasActions = false;
          }

          expect(hasActions).eql(false);
        });

        it('should generate expected events with a alertDelay', async () => {
          // wait so cache expires so maintenance window from previous test will be cleared
          await setTimeoutAsync(TEST_CACHE_EXPIRATION_TIME);

          const ACTIVE_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.active';
          const NEW_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.new';
          const RECOVERED_PATH = 'kibana.alert.rule.execution.metrics.alert_counts.recovered';
          const ACTION_PATH = 'kibana.alert.rule.execution.metrics.number_of_triggered_actions';
          const DELAYED_PATH = 'kibana.alert.rule.execution.metrics.number_of_delayed_alerts';

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

          // pattern of when the alert should fire
          const pattern = {
            instance: [true, true, true, true, false, true],
          };

          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                throttle: null,
                notify_when: null,
                params: {
                  pattern,
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                    frequency: {
                      summary: false,
                      throttle: null,
                      notify_when: RuleNotifyWhen.CHANGE,
                    },
                  },
                ],
                alert_delay: {
                  active: 3,
                },
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // get the events we're expecting
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([
                // make sure the counts of the # of events per type are as expected
                ['execute-start', { gte: 6 }],
                ['execute', { gte: 6 }],
                ['new-instance', { equal: 1 }],
                ['active-instance', { equal: 2 }],
                ['recovered-instance', { equal: 1 }],
              ]),
            });
          });

          const executeEvents = events.filter((event) => event?.event?.action === 'execute');

          // first two executions do not create the active alert
          executeEvents.slice(0, 1).forEach((event) => {
            expect(get(event, ACTIVE_PATH)).to.be(0);
            expect(get(event, NEW_PATH)).to.be(0);
            expect(get(event, RECOVERED_PATH)).to.be(0);
            expect(get(event, ACTION_PATH)).to.be(0);
            expect(get(event, DELAYED_PATH)).to.be(1);
          });

          // third executions creates the delayed active alert and triggers actions
          expect(get(executeEvents[2], ACTIVE_PATH)).to.be(1);
          expect(get(executeEvents[2], NEW_PATH)).to.be(1);
          expect(get(executeEvents[2], RECOVERED_PATH)).to.be(0);
          expect(get(executeEvents[2], ACTION_PATH)).to.be(1);
          expect(get(executeEvents[2], DELAYED_PATH)).to.be(0);

          // fourth execution
          expect(get(executeEvents[3], ACTIVE_PATH)).to.be(1);
          expect(get(executeEvents[3], NEW_PATH)).to.be(0);
          expect(get(executeEvents[3], RECOVERED_PATH)).to.be(0);
          expect(get(executeEvents[3], ACTION_PATH)).to.be(0);
          expect(get(executeEvents[3], DELAYED_PATH)).to.be(0);

          // fifth recovered execution
          expect(get(executeEvents[4], ACTIVE_PATH)).to.be(0);
          expect(get(executeEvents[4], NEW_PATH)).to.be(0);
          expect(get(executeEvents[4], RECOVERED_PATH)).to.be(1);
          expect(get(executeEvents[4], ACTION_PATH)).to.be(0);
          expect(get(executeEvents[4], DELAYED_PATH)).to.be(0);

          // sixth execution does not create the active alert
          expect(get(executeEvents[5], ACTIVE_PATH)).to.be(0);
          expect(get(executeEvents[5], NEW_PATH)).to.be(0);
          expect(get(executeEvents[5], RECOVERED_PATH)).to.be(0);
          expect(get(executeEvents[5], ACTION_PATH)).to.be(0);
          expect(get(executeEvents[5], DELAYED_PATH)).to.be(1);
        });

        it('should update event log document fields', async () => {
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

          // Create a rule that will generate events
          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                rule_type_id: 'test.patternFiring',
                schedule: { interval: '1s' },
                throttle: null,
                params: {
                  pattern: {
                    instance: [true, false],
                  },
                },
                actions: [
                  {
                    id: createdAction.id,
                    group: 'default',
                    params: {},
                  },
                ],
              })
            );

          expect(response.status).to.eql(200);
          const alertId = response.body.id;
          objectRemover.add(space.id, alertId, 'rule', 'alerting');

          // Get the events and find one to update
          const events = await retry.try(async () => {
            return await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([['execute', { gte: 1 }]]),
            });
          });

          expect(events.length).to.be.greaterThan(0);
          const eventToUpdate = events[0];

          // Prepare the update
          const fieldsToUpdate = {
            event: { kind: 'test_update' },
          };

          // Call the update API
          const updateResponse = await supertest
            .post(`${getUrlPrefix(space.id)}/_test/event_log/update_documents`)
            .set('kbn-xsrf', 'foo')
            .send({
              _id: eventToUpdate?._id,
              _index: eventToUpdate?._index,
              _seq_no: eventToUpdate?._seq_no,
              _primary_term: eventToUpdate?._primary_term,
              fieldsToUpdate,
            })
            .expect(200);

          expect(updateResponse.body.ok).to.be(true);

          // Verify the update by getting the event again
          await retry.try(async () => {
            const newResponse = await getEventLog({
              getService,
              spaceId: space.id,
              type: 'alert',
              id: alertId,
              provider: 'alerting',
              actions: new Map([['execute', { gte: 1 }]]),
            });

            const updatedEvent = newResponse.find((event) => event?._id === eventToUpdate?._id);
            expect(updatedEvent).to.be.ok();
            expect(updatedEvent?.event?.kind).to.be('test_update');

            return response;
          });
        });
      });
    }
  });
}

interface SavedObject {
  type: string;
  id: string;
  rel?: string;
  type_id: string;
}

interface ValidateEventLogParams {
  spaceId: string;
  savedObjects: SavedObject[];
  outcome?: string;
  message: string;
  shouldHaveEventEnd?: boolean;
  shouldHaveTask?: boolean;
  errorMessage?: string;
  status?: string;
  actionGroupId?: string;
  instanceId?: string;
  reason?: string;
  executionId?: string;
  numTriggeredActions?: number;
  numActiveAlerts?: number;
  numRecoveredAlerts?: number;
  numNewAlerts?: number;
  consumer?: string;
  ruleTypeId: string;
  rule?: {
    id: string;
    name?: string;
    version?: string;
    category?: string;
    reference?: string;
    author?: string[];
    license?: string;
    ruleset?: string;
    namespace?: string;
  };
  flapping?: boolean;
  source?: string;
}

export function validateEvent(event: IValidatedEvent, params: ValidateEventLogParams): void {
  const {
    spaceId,
    savedObjects,
    outcome,
    message,
    errorMessage,
    rule,
    shouldHaveTask,
    executionId,
    numTriggeredActions = 1,
    numActiveAlerts,
    numNewAlerts,
    numRecoveredAlerts,
    consumer,
    ruleTypeId,
    flapping,
    source,
  } = params;
  const { status, actionGroupId, instanceId, reason, shouldHaveEventEnd } = params;

  if (event?.event?.action === 'execute' && status === 'active') {
    expect(event?.kibana?.alert?.rule?.execution?.metrics?.number_of_triggered_actions).to.be(
      numTriggeredActions
    );
  }

  if (status) {
    expect(event?.kibana?.alerting?.status).to.be(status);
  }

  if (actionGroupId) {
    expect(event?.kibana?.alerting?.action_group_id).to.be(actionGroupId);
  }

  if (instanceId) {
    expect(event?.kibana?.alerting?.instance_id).to.be(instanceId);
  }

  if (InstanceActions.has(event?.event?.action)) {
    expect(typeof event?.kibana?.alert?.uuid).to.be('string');
  } else {
    expect(event?.kibana?.alert?.uuid).to.be(undefined);
  }

  if (reason) {
    expect(event?.event?.reason).to.be(reason);
  }

  if (executionId) {
    expect(event?.kibana?.alert?.rule?.execution?.uuid).to.be(executionId);
  }

  if (consumer) {
    expect(event?.kibana?.alert?.rule?.consumer).to.be(consumer);
  }

  if (numActiveAlerts) {
    expect(event?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.active).to.be(
      numActiveAlerts
    );
  }

  if (numRecoveredAlerts) {
    expect(event?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.recovered).to.be(
      numRecoveredAlerts
    );
  }

  if (numNewAlerts) {
    expect(event?.kibana?.alert?.rule?.execution?.metrics?.alert_counts?.new).to.be(numNewAlerts);
  }

  if (flapping !== undefined) {
    expect(event?.kibana?.alert?.flapping).to.be(flapping);
  }

  if (source) {
    expect(event?.kibana?.action?.execution?.source).to.be(source);
  }

  expect(event?.kibana?.alert?.rule?.rule_type_id).to.be(ruleTypeId);
  expect(event?.kibana?.space_ids?.[0]).to.equal(spaceId);

  const duration = event?.event?.duration;
  const timestamp = Date.parse(event?.['@timestamp'] || 'undefined');
  const eventStart = Date.parse(event?.event?.start || 'undefined');
  const eventEnd = Date.parse(event?.event?.end || 'undefined');
  const dateNow = Date.now();

  if (duration !== undefined) {
    expect(typeof duration).to.be('string');
    expect(eventStart).to.be.ok();

    if (shouldHaveEventEnd !== false) {
      expect(eventEnd).to.be.ok();

      const durationDiff = Math.abs(nanosToMillis(duration!) - (eventEnd - eventStart));

      // account for rounding errors
      expect(durationDiff < 1).to.equal(true);
      expect(eventStart <= eventEnd).to.equal(true);
      expect(eventEnd <= dateNow).to.equal(true);
      expect(eventEnd <= timestamp).to.equal(true);
    }

    if (shouldHaveEventEnd === false) {
      expect(eventEnd).not.to.be.ok();
    }
  }

  expect(event?.event?.outcome).to.equal(outcome);

  for (const savedObject of savedObjects) {
    expect(
      isSavedObjectInEvent(event, spaceId, savedObject.type, savedObject.id, savedObject.rel)
    ).to.be(true);

    // event?.kibana?.alerting?.outcome is only populated for alerts
    if (savedObject.type === 'alert') {
      expect(event?.kibana?.alerting?.outcome).to.equal(outcome);
    }
  }

  expect(event?.message).to.eql(message);

  expect(event?.rule).to.eql(rule);

  if (shouldHaveTask) {
    const task = event?.kibana?.task;
    expect(task).to.be.ok();
    expect(typeof Date.parse(typeof task?.scheduled)).to.be('number');
    expect(typeof task?.schedule_delay).to.be('number');
    expect(task?.schedule_delay).to.be.greaterThan(-1);
  } else {
    expect(event?.kibana?.task).to.be(undefined);
  }

  if (errorMessage) {
    expect(event?.error?.message).to.eql(errorMessage);
  }
}

function getEventsByAction(events: IValidatedEvent[], action: string) {
  return events.filter((event) => event?.event?.action === action);
}

function getTimestamps(events: IValidatedEvent[]) {
  return events.map((event) => event?.['@timestamp'] ?? 'missing timestamp');
}

function isSavedObjectInEvent(
  event: IValidatedEvent,
  spaceId: string,
  type: string,
  id: string,
  rel?: string
): boolean {
  const savedObjects = event?.kibana?.saved_objects ?? [];
  const namespace = spaceId === 'default' ? undefined : spaceId;

  for (const savedObject of savedObjects) {
    if (
      savedObject.namespace === namespace &&
      savedObject.type === type &&
      savedObject.id === id &&
      savedObject.rel === rel
    ) {
      return true;
    }
  }

  return false;
}
