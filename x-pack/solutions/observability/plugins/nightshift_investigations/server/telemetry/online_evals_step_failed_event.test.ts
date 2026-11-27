/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import {
  NIGHTSHIFT_ONLINE_EVALS_STEP_FAILED_EVENT,
  onlineEvalsStepFailedEvent,
} from './online_evals_step_failed_event';

describe('onlineEvalsStepFailedEvent schema', () => {
  // A dev-mode analytics client validates every reported event against its registered schema.
  it.each([
    { step: 'classify_round', code: 'invalid_input' },
    {
      step: 'score',
      code: 'investigation_unavailable',
      investigation_id: 'inv-1',
      round_id: 'round-1',
      workflow_execution_id: 'exec-1',
      space_id: 'ops',
    },
  ])('accepts %o', (event) => {
    const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
    analytics.registerEventType(onlineEvalsStepFailedEvent);

    expect(() =>
      analytics.reportEvent(NIGHTSHIFT_ONLINE_EVALS_STEP_FAILED_EVENT, event)
    ).not.toThrow();
  });
});
