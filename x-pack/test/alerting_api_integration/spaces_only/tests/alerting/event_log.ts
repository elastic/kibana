/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover, getEventLog } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { IValidatedEvent } from '../../../../../plugins/event_log/server';

const NANOS_IN_MILLIS = 1000 * 1000;

// eslint-disable-next-line import/no-default-export
export default function eventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('eventLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

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
              getTestAlertData({
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
          const executeActionEvents = getEventsByAction(events, 'execute-action');
          const newInstanceEvents = getEventsByAction(events, 'new-instance');
          const recoveredInstanceEvents = getEventsByAction(events, 'recovered-instance');

          // make sure the events are in the right temporal order
          const executeTimes = getTimestamps(executeEvents);
          const executeStartTimes = getTimestamps(executeStartEvents);
          const executeActionTimes = getTimestamps(executeActionEvents);
          const newInstanceTimes = getTimestamps(newInstanceEvents);
          const recoveredInstanceTimes = getTimestamps(recoveredInstanceEvents);

          expect(executeTimes[0] < newInstanceTimes[0]).to.be(true);
          expect(executeTimes[1] <= newInstanceTimes[0]).to.be(true);
          expect(executeTimes[2] > newInstanceTimes[0]).to.be(true);
          expect(executeTimes[1] <= executeActionTimes[0]).to.be(true);
          expect(executeTimes[2] > executeActionTimes[0]).to.be(true);
          expect(executeStartTimes.length === executeTimes.length).to.be(true);
          executeStartTimes.forEach((est, index) =>
            expect(est === executeTimes[index]).to.be(true)
          );
          expect(recoveredInstanceTimes[0] > newInstanceTimes[0]).to.be(true);

          // validate each event
          let executeCount = 0;
          const executeStatuses = ['ok', 'active', 'active'];
          for (const event of events) {
            switch (event?.event?.action) {
              case 'execute-start':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
                  ],
                  message: `alert execution start: "${alertId}"`,
                  shouldHaveTask: true,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                  },
                });
                break;
              case 'execute':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
                  ],
                  outcome: 'success',
                  message: `alert executed: test.patternFiring:${alertId}: 'abc'`,
                  status: executeStatuses[executeCount++],
                  shouldHaveTask: true,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
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
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
                });
                break;
              case 'new-instance':
                validateInstanceEvent(event, `created new instance: 'instance'`, false);
                break;
              case 'recovered-instance':
                validateInstanceEvent(event, `instance 'instance' has recovered`, true);
                break;
              case 'active-instance':
                validateInstanceEvent(
                  event,
                  `active instance: 'instance' in actionGroup: 'default'`,
                  false
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
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'action', id: createdAction.id, rel: 'primary', type_id: 'test.noop' },
                  ],
                  message: `action executed: test.noop:${createdAction.id}: MY action`,
                  outcome: 'success',
                  shouldHaveTask: true,
                  rule: undefined,
                });
                break;
            }
          }

          function validateInstanceEvent(
            event: IValidatedEvent,
            subMessage: string,
            shouldHaveEventEnd: boolean
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
              rule: {
                id: alertId,
                category: response.body.rule_type_id,
                license: 'basic',
                ruleset: 'alertsFixture',
                name: response.body.name,
              },
            });
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
              getTestAlertData({
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
          const executeActionEvents = getEventsByAction(events, 'execute-action');
          const newInstanceEvents = getEventsByAction(events, 'new-instance');
          const recoveredInstanceEvents = getEventsByAction(events, 'recovered-instance');

          // make sure the events are in the right temporal order
          const executeTimes = getTimestamps(executeEvents);
          const executeStartTimes = getTimestamps(executeStartEvents);
          const executeActionTimes = getTimestamps(executeActionEvents);
          const newInstanceTimes = getTimestamps(newInstanceEvents);
          const recoveredInstanceTimes = getTimestamps(recoveredInstanceEvents);

          expect(executeTimes[0] < newInstanceTimes[0]).to.be(true);
          expect(executeTimes[1] <= newInstanceTimes[0]).to.be(true);
          expect(executeTimes[2] > newInstanceTimes[0]).to.be(true);
          expect(executeTimes[1] <= executeActionTimes[0]).to.be(true);
          expect(executeTimes[2] > executeActionTimes[0]).to.be(true);
          expect(executeStartTimes.length === executeTimes.length).to.be(true);
          executeStartTimes.forEach((est, index) =>
            expect(est === executeTimes[index]).to.be(true)
          );
          expect(recoveredInstanceTimes[0] > newInstanceTimes[0]).to.be(true);

          // validate each event
          let executeCount = 0;
          const executeStatuses = ['ok', 'active', 'active'];
          for (const event of events) {
            switch (event?.event?.action) {
              case 'execute-start':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
                  ],
                  message: `alert execution start: "${alertId}"`,
                  shouldHaveTask: true,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                  },
                });
                break;
              case 'execute':
                validateEvent(event, {
                  spaceId: space.id,
                  savedObjects: [
                    { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
                  ],
                  outcome: 'success',
                  message: `alert executed: test.patternFiring:${alertId}: 'abc'`,
                  status: executeStatuses[executeCount++],
                  shouldHaveTask: true,
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
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
                  rule: {
                    id: alertId,
                    category: response.body.rule_type_id,
                    license: 'basic',
                    ruleset: 'alertsFixture',
                    name: response.body.name,
                  },
                });
                break;
              case 'new-instance':
                validateInstanceEvent(event, `created new instance: 'instance'`, false);
                break;
              case 'recovered-instance':
                validateInstanceEvent(event, `instance 'instance' has recovered`, true);
                break;
              case 'active-instance':
                expect(
                  [firstSubgroup, secondSubgroup].includes(
                    event?.kibana?.alerting?.action_subgroup!
                  )
                ).to.be(true);
                validateInstanceEvent(
                  event,
                  `active instance: 'instance' in actionGroup(subgroup): 'default(${event?.kibana?.alerting?.action_subgroup})'`,
                  false
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
            shouldHaveEventEnd: boolean
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
              rule: {
                id: alertId,
                category: response.body.rule_type_id,
                license: 'basic',
                ruleset: 'alertsFixture',
                name: response.body.name,
              },
            });
          }
        });

        it('should generate events for execution errors', async () => {
          const response = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
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

          const startEvent = events[0];
          const executeEvent = events[1];

          expect(startEvent).to.be.ok();
          expect(executeEvent).to.be.ok();

          validateEvent(startEvent, {
            spaceId: space.id,
            savedObjects: [
              { type: 'alert', id: alertId, rel: 'primary', type_id: 'test.patternFiring' },
            ],
            message: `alert execution start: "${alertId}"`,
            shouldHaveTask: true,
            rule: {
              id: alertId,
              category: response.body.rule_type_id,
              license: 'basic',
              ruleset: 'alertsFixture',
            },
          });

          validateEvent(executeEvent, {
            spaceId: space.id,
            savedObjects: [{ type: 'alert', id: alertId, rel: 'primary', type_id: 'test.throw' }],
            outcome: 'failure',
            message: `alert execution failure: test.throw:${alertId}: 'abc'`,
            errorMessage: 'this alert is intended to fail',
            status: 'error',
            reason: 'execute',
            shouldHaveTask: true,
            rule: {
              id: alertId,
              category: response.body.rule_type_id,
              license: 'basic',
              ruleset: 'alertsFixture',
            },
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
  const { spaceId, savedObjects, outcome, message, errorMessage, rule, shouldHaveTask } = params;
  const { status, actionGroupId, instanceId, reason, shouldHaveEventEnd } = params;

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

  const duration = event?.event?.duration;
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
