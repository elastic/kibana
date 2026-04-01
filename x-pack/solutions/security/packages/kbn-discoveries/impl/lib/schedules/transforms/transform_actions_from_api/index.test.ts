/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleAction } from '@kbn/discoveries-schemas';
import { transformActionsFromApi } from '.';

describe('transformActionsFromApi', () => {
  it('returns undefined when actions is undefined', () => {
    expect(transformActionsFromApi(undefined)).toBeUndefined();
  });

  it('returns an empty array when actions is empty', () => {
    expect(transformActionsFromApi([])).toEqual([]);
  });

  it('transforms a general action with frequency', () => {
    const apiActions: ScheduleAction[] = [
      {
        action_type_id: '.email',
        alerts_filter: { query: { kql: 'host.name: *' } },
        frequency: {
          notify_when: 'onActiveAlert',
          summary: true,
          throttle: null,
        },
        group: 'default',
        id: 'action-1',
        params: { to: ['test@elastic.co'] },
        uuid: 'uuid-1',
      },
    ];

    expect(transformActionsFromApi(apiActions)).toEqual([
      {
        actionTypeId: '.email',
        alertsFilter: { query: { kql: 'host.name: *' } },
        frequency: {
          notifyWhen: 'onActiveAlert',
          summary: true,
          throttle: null,
        },
        group: 'default',
        id: 'action-1',
        params: { to: ['test@elastic.co'] },
        uuid: 'uuid-1',
      },
    ]);
  });

  it('transforms a general action without frequency', () => {
    const apiActions: ScheduleAction[] = [
      {
        action_type_id: '.slack',
        group: 'default',
        id: 'action-2',
        params: { message: 'hello' },
      },
    ];

    expect(transformActionsFromApi(apiActions)).toEqual([
      {
        actionTypeId: '.slack',
        alertsFilter: undefined,
        frequency: undefined,
        group: 'default',
        id: 'action-2',
        params: { message: 'hello' },
        uuid: undefined,
      },
    ]);
  });

  it('transforms a system action', () => {
    const apiActions: ScheduleAction[] = [
      {
        action_type_id: '.cases',
        id: 'action-3',
        params: { subAction: 'run' },
        uuid: 'uuid-3',
      },
    ];

    expect(transformActionsFromApi(apiActions)).toEqual([
      {
        actionTypeId: '.cases',
        id: 'action-3',
        params: { subAction: 'run' },
        uuid: 'uuid-3',
      },
    ]);
  });

  it('transforms a mix of general and system actions', () => {
    const apiActions: ScheduleAction[] = [
      {
        action_type_id: '.email',
        frequency: {
          notify_when: 'onThrottleInterval',
          summary: false,
          throttle: '1h',
        },
        group: 'default',
        id: 'action-1',
        params: {},
      },
      {
        action_type_id: '.cases',
        id: 'action-2',
        params: {},
      },
    ];

    const result = transformActionsFromApi(apiActions);

    expect(result).toHaveLength(2);
    expect(result?.[0]).toHaveProperty('group', 'default');
    expect(result?.[1]).not.toHaveProperty('group');
  });
});
