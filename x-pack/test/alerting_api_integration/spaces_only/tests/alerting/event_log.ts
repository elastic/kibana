/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { Spaces } from '../../scenarios';
import {
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getEventLog,
  ESTestIndexTool,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { IValidatedEvent } from '../../../../../plugins/event_log/server';

const NANOS_IN_MILLIS = 1000 * 1000;

// eslint-disable-next-line import/no-default-export
export default function eventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('eventLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
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
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
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
              case 'execute':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
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
                });
                break;
              case 'execute-action':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
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
                validateInstanceEvent(
                  event,
                  `created new alert: 'instance'`,
                  false,
                  currentExecutionId
                );
                break;
              case 'recovered-instance':
                validateInstanceEvent(
                  event,
                  `alert 'instance' has recovered`,
                  true,
                  currentExecutionId
                );
                break;
              case 'active-instance':
                validateInstanceEvent(
                  event,
                  `active alert: 'instance' in actionGroup: 'default'`,
                  false,
                  currentExecutionId
                );
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
                });
                break;
            }
          }

          function validateInstanceEvent(
            event: IValidatedEvent,
            subMessage: string,
            shouldHaveEventEnd: boolean,
            executionId?: string
          ) {
            validateEvent(event, {
              spaceId: space.id,
              savedObjects: [
                { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
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
            });
          }
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
          for (const event of events) {
            switch (event?.event?.action) {
              case 'execute-start':
                currentExecutionId = event?.kibana?.alert?.rule?.execution?.uuid;
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
                });
                expect(event?.kibana?.alert?.rule?.execution?.metrics?.number_of_searches).to.be(
                  numSearches
                );
                const esSearchDuration =
                  event?.kibana?.alert?.rule?.execution?.metrics?.es_search_duration_ms;
                const totalSearchDuration =
                  event?.kibana?.alert?.rule?.execution?.metrics?.total_search_duration_ms;

                expect(esSearchDuration).not.to.be(undefined);
                expect(totalSearchDuration).not.to.be(undefined);

                // Expect these searches to take time
                expect(esSearchDuration! > 0).to.be(true);
                expect(totalSearchDuration! > 0).to.be(true);

                // Total search duration should be greater since it includes any network latency
                expect(totalSearchDuration! - esSearchDuration! > 0).to.be(true);
                break;
              // this will get triggered as we add new event actions
              default:
                throw new Error(`unexpected event action "${event?.event?.action}"`);
            }
          }
        });

        it('should generate expected events for normal operation with subgroups', async () => {
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
          const [firstSubgroup, secondSubgroup] = [uuid.v4(), uuid.v4()];
          const pattern = {
            instance: [false, firstSubgroup, secondSubgroup],
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
                ['active-instance', { gte: 2 }],
                ['recovered-instance', { equal: 1 }],
              ]),
            });
          });

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
          let currentExecutionId;
          const executeStatuses = ['ok', 'active', 'active'];
          for (const event of events) {
            switch (event?.event?.action) {
              case 'execute-start':
                currentExecutionId = event?.kibana?.alert?.rule?.execution?.uuid;
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
                  ],
                  message: `rule execution start: "${alertId}"`,
                  shouldHaveTask: true,
                  executionId: currentExecutionId,
                  ruleTypeId: response.body.rule_type_id,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                  },
                  consumer: 'alertsFixture',
                });
                break;
              case 'execute':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
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
                });
                break;
              case 'execute-action':
                expect(
                  [firstSubgroup, secondSubgroup].includes(
                    event?.kibana?.alerting?.action_subgroup!
                  )
                ).to.be(true);
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
                    { type: 'action', id: createdAction.id, type_id: 'test.noop' },
                  ],
                  message: `alert: test.patternFiring:${alertId}: 'abc' instanceId: 'instance' scheduled actionGroup(subgroup): 'default(${event?.kibana?.alerting?.action_subgroup})' action: test.noop:${createdAction.id}`,
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
                validateInstanceEvent(
                  event,
                  `created new alert: 'instance'`,
                  false,
                  currentExecutionId
                );
                break;
              case 'recovered-instance':
                validateInstanceEvent(
                  event,
                  `alert 'instance' has recovered`,
                  true,
                  currentExecutionId
                );
                break;
              case 'active-instance':
                expect(
                  [firstSubgroup, secondSubgroup].includes(
                    event?.kibana?.alerting?.action_subgroup!
                  )
                ).to.be(true);
                validateInstanceEvent(
                  event,
                  `active alert: 'instance' in actionGroup(subgroup): 'default(${event?.kibana?.alerting?.action_subgroup})'`,
                  false,
                  currentExecutionId
                );
                break;
              // this will get triggered as we add new event actions
              default:
                throw new Error(`unexpected event action "${event?.event?.action}"`);
            }
          }

          function validateInstanceEvent(
            event: IValidatedEvent,
            subMessage: string,
            shouldHaveEventEnd: boolean,
            executionId?: string
          ) {
            validateEvent(event, {
              spaceId: space.id,
              savedObjects: [
                { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
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
            });
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
            },
            consumer: 'alertsFixture',
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
    consumer,
    ruleTypeId,
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

  if (reason) {
    expect(event?.event?.reason).to.be(reason);
  }

  if (executionId) {
    expect(event?.kibana?.alert?.rule?.execution?.uuid).to.be(executionId);
  }

  if (consumer) {
    expect(event?.kibana?.alert?.rule?.consumer).to.be(consumer);
  }

  expect(event?.kibana?.alert?.rule?.rule_type_id).to.be(ruleTypeId);
  expect(event?.kibana?.space_ids?.[0]).to.equal(spaceId);

  const duration = event?.event?.duration;
  const timestamp = Date.parse(event?.['@timestamp'] || 'undefined');
  const eventStart = Date.parse(event?.event?.start || 'undefined');
  const eventEnd = Date.parse(event?.event?.end || 'undefined');
  const dateNow = Date.now();

  if (duration !== undefined) {
    expect(typeof duration).to.be('number');
    expect(eventStart).to.be.ok();

    if (shouldHaveEventEnd !== false) {
      expect(eventEnd).to.be.ok();

      const durationDiff = Math.abs(
        Math.round(duration! / NANOS_IN_MILLIS) - (eventEnd - eventStart)
      );

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
