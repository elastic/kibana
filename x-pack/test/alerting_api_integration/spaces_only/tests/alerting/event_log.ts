/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover, getEventLog } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { IValidatedEvent } from '../../../../../plugins/event_log/server';

const NANOS_IN_MILLIS = 1000 * 1000;

// eslint-disable-next-line import/no-default-export
export default function eventLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  // FLAKY: https://github.com/elastic/kibana/issues/81668
  describe.skip('eventLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should generate expected events for normal operation', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'MY action',
          actionTypeId: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      // pattern of when the alert should fire
      const pattern = {
        instance: [false, true, true],
      };

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.patternFiring',
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
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      // get the events we're expecting
      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: alertId,
          provider: 'alerting',
          actions: [
            'execute',
            'execute-action',
            'new-instance',
            'active-instance',
            'resolved-instance',
          ],
        });
      });

      // make sure the counts of the # of events per type are as expected
      const executeEvents = getEventsByAction(events, 'execute');
      const executeActionEvents = getEventsByAction(events, 'execute-action');
      const newInstanceEvents = getEventsByAction(events, 'new-instance');
      const resolvedInstanceEvents = getEventsByAction(events, 'resolved-instance');

      expect(executeEvents.length >= 4).to.be(true);
      expect(executeActionEvents.length).to.be(2);
      expect(newInstanceEvents.length).to.be(1);
      expect(resolvedInstanceEvents.length).to.be(1);

      // make sure the events are in the right temporal order
      const executeTimes = getTimestamps(executeEvents);
      const executeActionTimes = getTimestamps(executeActionEvents);
      const newInstanceTimes = getTimestamps(newInstanceEvents);
      const resolvedInstanceTimes = getTimestamps(resolvedInstanceEvents);

      expect(executeTimes[0] < newInstanceTimes[0]).to.be(true);
      expect(executeTimes[1] <= newInstanceTimes[0]).to.be(true);
      expect(executeTimes[2] > newInstanceTimes[0]).to.be(true);
      expect(executeTimes[1] <= executeActionTimes[0]).to.be(true);
      expect(executeTimes[2] > executeActionTimes[0]).to.be(true);
      expect(resolvedInstanceTimes[0] > newInstanceTimes[0]).to.be(true);

      // validate each event
      let executeCount = 0;
      const executeStatuses = ['ok', 'active', 'active'];
      for (const event of events) {
        switch (event?.event?.action) {
          case 'execute':
            validateEvent(event, {
              spaceId: Spaces.space1.id,
              savedObjects: [{ type: 'alert', id: alertId, rel: 'primary' }],
              outcome: 'success',
              message: `alert executed: test.patternFiring:${alertId}: 'abc'`,
              status: executeStatuses[executeCount++],
            });
            break;
          case 'execute-action':
            validateEvent(event, {
              spaceId: Spaces.space1.id,
              savedObjects: [
                { type: 'alert', id: alertId, rel: 'primary' },
                { type: 'action', id: createdAction.id },
              ],
              message: `alert: test.patternFiring:${alertId}: 'abc' instanceId: 'instance' scheduled actionGroup: 'default' action: test.noop:${createdAction.id}`,
              instanceId: 'instance',
              actionGroupId: 'default',
            });
            break;
          case 'new-instance':
            validateInstanceEvent(event, `created new instance: 'instance'`);
            break;
          case 'resolved-instance':
            validateInstanceEvent(event, `resolved instance: 'instance'`);
            break;
          case 'active-instance':
            validateInstanceEvent(event, `active instance: 'instance' in actionGroup: 'default'`);
            break;
          // this will get triggered as we add new event actions
          default:
            throw new Error(`unexpected event action "${event?.event?.action}"`);
        }
      }

      function validateInstanceEvent(event: IValidatedEvent, subMessage: string) {
        validateEvent(event, {
          spaceId: Spaces.space1.id,
          savedObjects: [{ type: 'alert', id: alertId, rel: 'primary' }],
          message: `test.patternFiring:${alertId}: 'abc' ${subMessage}`,
          instanceId: 'instance',
          actionGroupId: 'default',
        });
      }
    });

    it('should generate events for execution errors', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.throw',
            schedule: { interval: '1s' },
            throttle: null,
          })
        );

      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: alertId,
          provider: 'alerting',
          actions: ['execute'],
        });
      });

      const event = events[0];
      expect(event).to.be.ok();

      validateEvent(event, {
        spaceId: Spaces.space1.id,
        savedObjects: [{ type: 'alert', id: alertId, rel: 'primary' }],
        outcome: 'failure',
        message: `alert execution failure: test.throw:${alertId}: 'abc'`,
        errorMessage: 'this alert is intended to fail',
        status: 'error',
        reason: 'execute',
      });
    });
  });
}

interface SavedObject {
  type: string;
  id: string;
  rel?: string;
}

interface ValidateEventLogParams {
  spaceId: string;
  savedObjects: SavedObject[];
  outcome?: string;
  message: string;
  errorMessage?: string;
  status?: string;
  actionGroupId?: string;
  instanceId?: string;
  reason?: string;
}

export function validateEvent(event: IValidatedEvent, params: ValidateEventLogParams): void {
  const { spaceId, savedObjects, outcome, message, errorMessage } = params;
  const { status, actionGroupId, instanceId, reason } = params;

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
    expect(eventEnd).to.be.ok();

    const durationDiff = Math.abs(
      Math.round(duration! / NANOS_IN_MILLIS) - (eventEnd - eventStart)
    );

    // account for rounding errors
    expect(durationDiff < 1).to.equal(true);
    expect(eventStart <= eventEnd).to.equal(true);
    expect(eventEnd <= dateNow).to.equal(true);
  }

  expect(event?.event?.outcome).to.equal(outcome);

  for (const savedObject of savedObjects) {
    expect(
      isSavedObjectInEvent(event, spaceId, savedObject.type, savedObject.id, savedObject.rel)
    ).to.be(true);
  }

  expect(event?.message).to.eql(message);

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
  namespace: string,
  type: string,
  id: string,
  rel?: string
): boolean {
  const savedObjects = event?.kibana?.saved_objects ?? [];

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
