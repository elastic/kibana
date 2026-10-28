/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryScheduleAction } from '@kbn/elastic-assistant-common';
import { transformActionsToApi } from '.';

describe('transformActionsToApi', () => {
  it('returns an empty array when actions is undefined', () => {
    expect(transformActionsToApi(undefined)).toEqual([]);
  });

  it('returns an empty array when actions is empty', () => {
    expect(transformActionsToApi([])).toEqual([]);
  });

  it('transforms a general action with frequency', () => {
    const internalActions: AttackDiscoveryScheduleAction[] = [
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
    ];

    expect(transformActionsToApi(internalActions)).toEqual([
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
    ]);
  });

  it('transforms a general action without frequency', () => {
    const internalActions: AttackDiscoveryScheduleAction[] = [
      {
        actionTypeId: '.slack',
        group: 'default',
        id: 'action-2',
        params: { message: 'hello' },
      },
    ];

    expect(transformActionsToApi(internalActions)).toEqual([
      {
        action_type_id: '.slack',
        alerts_filter: undefined,
        frequency: undefined,
        group: 'default',
        id: 'action-2',
        params: { message: 'hello' },
        uuid: undefined,
      },
    ]);
  });

  it('transforms a system action', () => {
    const internalActions: AttackDiscoveryScheduleAction[] = [
      {
        actionTypeId: '.cases',
        id: 'action-3',
        params: { subAction: 'run' },
        uuid: 'uuid-3',
      },
    ];

    expect(transformActionsToApi(internalActions)).toEqual([
      {
        action_type_id: '.cases',
        id: 'action-3',
        params: { subAction: 'run' },
        uuid: 'uuid-3',
      },
    ]);
  });
});
