/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import {
  MONITOR_CURRENT_EVENT_TYPE,
  MONITOR_ERROR_EVENT_TYPE,
  MONITOR_UPDATE_EVENT_TYPE,
  PL_REBALANCE_EVENT_TYPE,
  PL_SHARDING_SNAPSHOT_EVENT_TYPE,
  PL_SHARDING_STATE_EVENT_TYPE,
} from './constants';
import { registerSyntheticsEventTypes } from './events';

describe('registerSyntheticsEventTypes', () => {
  it('registers monitor and private location sharding event types', () => {
    const { analytics } = coreMock.createSetup();

    registerSyntheticsEventTypes(analytics);

    const registered = analytics.registerEventType.mock.calls.map(([opts]) => opts.eventType);
    expect(registered).toEqual([
      MONITOR_UPDATE_EVENT_TYPE,
      MONITOR_CURRENT_EVENT_TYPE,
      MONITOR_ERROR_EVENT_TYPE,
      PL_REBALANCE_EVENT_TYPE,
      PL_SHARDING_SNAPSHOT_EVENT_TYPE,
      PL_SHARDING_STATE_EVENT_TYPE,
    ]);
  });
});
