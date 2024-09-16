/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server';
import type { Agent as SuperTestAgent } from 'supertest';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getUrlPrefix, getTestRuleData, ObjectRemover, getEventLog } from '../../../../common/lib';
import { Spaces } from '../../../scenarios';

export const createRule = async ({
  actionId,
  pattern,
  supertest,
  objectRemover,
  overwrites,
}: {
  actionId: string;
  pattern?: { instance: boolean[] };
  supertest: SuperTestAgent;
  objectRemover: ObjectRemover;
  overwrites?: any;
}) => {
  const { body: createdRule } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .send(
      getTestRuleData({
        name: 'test-rule',
        rule_type_id: 'test.patternFiring',
        schedule: { interval: '24h' },
        throttle: null,
        notify_when: 'onActiveAlert',
        params: {
          pattern,
        },
        actions: [
          {
            id: actionId,
            group: 'default',
            params: {},
          },
          {
            id: actionId,
            group: 'recovered',
            params: {},
          },
        ],
        ...overwrites,
      })
    )
    .expect(200);

  objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');
  return createdRule;
};

export const createAction = async ({
  supertest,
  objectRemover,
}: {
  supertest: SuperTestAgent;
  objectRemover: ObjectRemover;
}) => {
  const { body: createdAction } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name: 'MY action',
      connector_type_id: 'test.noop',
      config: {},
      secrets: {},
    })
    .expect(200);

  objectRemover.add(Spaces.space1.id, createdAction.id, 'action', 'actions');
  return createdAction;
};

export const createMaintenanceWindow = async ({
  overwrites,
  supertest,
  objectRemover,
}: {
  overwrites?: any;
  supertest: SuperTestAgent;
  objectRemover: ObjectRemover;
}) => {
  const { body: window } = await supertest
    .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/maintenance_window`)
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
      ...overwrites,
    })
    .expect(200);

  objectRemover.add(Spaces.space1.id, window.id, 'rules/maintenance_window', 'alerting', true);

  // wait so cache expires
  await setTimeoutAsync(10000);
  return window;
};

export const getActiveMaintenanceWindows = async ({ supertest }: { supertest: SuperTestAgent }) => {
  const { body: activeMaintenanceWindows } = await supertest
    .get(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/maintenance_window/_active`)
    .set('kbn-xsrf', 'foo')
    .expect(200);

  return activeMaintenanceWindows;
};

export const finishMaintenanceWindow = async ({
  id,
  supertest,
}: {
  id: string;
  supertest: SuperTestAgent;
}) => {
  return supertest
    .post(
      `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rules/maintenance_window/${id}/_finish`
    )
    .set('kbn-xsrf', 'foo')
    .expect(200);
};

export const getRuleEvents = async ({
  id,
  action,
  newInstance,
  activeInstance,
  recoveredInstance,
  retry,
  getService,
}: {
  id: string;
  action?: number;
  newInstance?: number;
  activeInstance?: number;
  recoveredInstance?: number;
  retry: RetryService;
  getService: FtrProviderContext['getService'];
}) => {
  const actions: Array<[string, { equal: number }]> = [];
  if (action) {
    actions.push(['execute-action', { equal: action }]);
  }
  if (newInstance) {
    actions.push(['new-instance', { equal: newInstance }]);
  }
  if (activeInstance) {
    actions.push(['active-instance', { equal: activeInstance }]);
  }
  if (recoveredInstance) {
    actions.push(['recovered-instance', { equal: recoveredInstance }]);
  }
  return retry.try(async () => {
    return await getEventLog({
      getService,
      spaceId: Spaces.space1.id,
      type: 'alert',
      id,
      provider: 'alerting',
      actions: new Map(actions),
    });
  });
};

export const expectNoActionsFired = async ({
  id,
  supertest,
  retry,
}: {
  id: string;
  supertest: SuperTestAgent;
  retry: RetryService;
}) => {
  const events = await retry.try(async () => {
    const { body: result } = await supertest
      .get(`${getUrlPrefix(Spaces.space1.id)}/_test/event_log/alert/${id}/_find?per_page=5000`)
      .expect(200);

    if (!result.total) {
      throw new Error('no events found yet');
    }
    return result.data as IValidatedEvent[];
  });

  const actionEvents = events.filter((event) => {
    return event?.event?.action === 'execute-action';
  });

  expect(actionEvents.length).eql(0);
};

export const runSoon = async ({
  id,
  supertest,
  retry,
}: {
  id: string;
  supertest: SuperTestAgent;
  retry: RetryService;
}) => {
  return retry.try(async () => {
    await supertest
      .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${id}/_run_soon`)
      .set('kbn-xsrf', 'foo')
      .expect(204);
  });
};
