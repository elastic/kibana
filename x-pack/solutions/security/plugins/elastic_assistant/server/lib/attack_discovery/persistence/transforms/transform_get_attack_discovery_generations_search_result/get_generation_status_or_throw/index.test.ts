/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGenerationStatusOrThrow } from '.';
import {
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED,
} from '../../../../../../../common/constants';

describe('getGenerationStatusOrThrow', () => {
  const executionUuid = 'test-uuid';
  const baseActions = [ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED];

  it('returns "started" when only a started event is present', () => {
    const result = getGenerationStatusOrThrow({
      executionUuid,
      eventActions: [...baseActions],
    });

    expect(result).toBe('started');
  });

  it('returns "dismissed" when a dismissed event is present', () => {
    const result = getGenerationStatusOrThrow({
      executionUuid,
      eventActions: [...baseActions, ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED],
    });

    expect(result).toBe('dismissed');
  });

  it('returns "failed" when a failed event is present', () => {
    const result = getGenerationStatusOrThrow({
      executionUuid,
      eventActions: [...baseActions, ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED],
    });

    expect(result).toBe('failed');
  });

  it('returns "succeeded" when a succeeded event is present', () => {
    const result = getGenerationStatusOrThrow({
      executionUuid,
      eventActions: [...baseActions, ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED],
    });

    expect(result).toBe('succeeded');
  });

  it('returns "canceled" when a canceled event is present', () => {
    const result = getGenerationStatusOrThrow({
      executionUuid,
      eventActions: [...baseActions, ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED],
    });

    expect(result).toBe('canceled');
  });

  it('throws when a started event is missing', () => {
    expect(() =>
      getGenerationStatusOrThrow({
        executionUuid,
        eventActions: [],
      })
    ).toThrow(
      `Generation ${executionUuid} is missing ${ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED} event.action`
    );
  });
});
