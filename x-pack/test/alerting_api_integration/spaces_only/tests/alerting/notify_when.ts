/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover, getTestRuleData, getEventLog } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { IValidatedEvent } from '../../../../../plugins/event_log/server';

// eslint-disable-next-line import/no-default-export
export default function createNotifyWhenTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  describe('notifyWhen', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => await objectRemover.removeAll());

    it(`alert with notifyWhen=onActiveAlert should always execute actions `, async () => {
      const { body: defaultAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My Default Action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const { body: recoveredAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My Recovered Action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const pattern = {
        instance: [true, true, true, false, true, true],
      };
      const expectedActionGroupBasedOnPattern = pattern.instance.map((active: boolean) =>
        active ? 'default' : 'recovered'
      );
      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            params: { pattern },
            schedule: { interval: '1s' },
            throttle: null,
            notify_when: 'onActiveAlert',
            actions: [
              {
                id: defaultAction.id,
                group: 'default',
                params: {},
              },
              {
                id: recoveredAction.id,
                group: 'recovered',
                params: {},
              },
            ],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdAlert.id,
          provider: 'alerting',
          actions: new Map([
            ['execute-action', { gte: 6 }], // one more action (for recovery) will be executed after the last pattern fires
            ['new-instance', { equal: 2 }],
          ]),
        });
      });

      const executeActionEvents = getEventsByAction(events, 'execute-action');
      const executeActionEventsActionGroup = executeActionEvents.map(
        (event) => event?.kibana?.alerting?.action_group_id
      );
      expect(executeActionEventsActionGroup).to.eql(expectedActionGroupBasedOnPattern);
    });

    it(`alert with notifyWhen=onActionGroupChange should execute actions when action group changes`, async () => {
      const { body: defaultAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My Default Action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const { body: recoveredAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My Recovered Action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const pattern = {
        instance: [true, true, false, false, true, false],
      };
      const expectedActionGroupBasedOnPattern = ['default', 'recovered', 'default', 'recovered'];

      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            params: { pattern },
            schedule: { interval: '1s' },
            throttle: null,
            notify_when: 'onActionGroupChange',
            actions: [
              {
                id: defaultAction.id,
                group: 'default',
                params: {},
              },
              {
                id: recoveredAction.id,
                group: 'recovered',
                params: {},
              },
            ],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdAlert.id,
          provider: 'alerting',
          actions: new Map([
            ['execute-action', { gte: 4 }],
            ['new-instance', { equal: 2 }],
          ]),
        });
      });

      const executeActionEvents = getEventsByAction(events, 'execute-action');
      const executeActionEventsActionGroup = executeActionEvents.map(
        (event) => event?.kibana?.alerting?.action_group_id
      );
      expect(executeActionEventsActionGroup).to.eql(expectedActionGroupBasedOnPattern);
    });

    it(`alert with notifyWhen=onActionGroupChange should only execute actions when action subgroup changes`, async () => {
      const { body: defaultAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My Default Action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const { body: recoveredAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My Recovered Action',
          connector_type_id: 'test.noop',
          config: {},
          secrets: {},
        })
        .expect(200);

      const pattern = {
        instance: [
          'subgroup1',
          'subgroup1',
          false,
          false,
          'subgroup1',
          'subgroup2',
          'subgroup2',
          false,
        ],
      };
      const expectedActionGroupBasedOnPattern = [
        'default',
        'recovered',
        'default',
        'default',
        'recovered',
      ];

      const { body: createdAlert } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.patternFiring',
            params: { pattern },
            schedule: { interval: '1s' },
            throttle: null,
            notify_when: 'onActionGroupChange',
            actions: [
              {
                id: defaultAction.id,
                group: 'default',
                params: {},
              },
              {
                id: recoveredAction.id,
                group: 'recovered',
                params: {},
              },
            ],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAlert.id, 'rule', 'alerting');

      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: Spaces.space1.id,
          type: 'alert',
          id: createdAlert.id,
          provider: 'alerting',
          actions: new Map([
            ['execute-action', { gte: 5 }],
            ['new-instance', { equal: 2 }],
          ]),
        });
      });

      const executeActionEvents = getEventsByAction(events, 'execute-action');
      const executeActionEventsActionGroup = executeActionEvents.map(
        (event) => event?.kibana?.alerting?.action_group_id
      );
      expect(executeActionEventsActionGroup).to.eql(expectedActionGroupBasedOnPattern);
    });
  });
}

function getEventsByAction(events: IValidatedEvent[], action: string) {
  return events.filter((event) => event?.event?.action === action);
}
