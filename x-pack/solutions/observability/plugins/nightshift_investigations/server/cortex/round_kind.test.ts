/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertRecoveredFollowUpMessage } from '../client/build_investigation_message';
import { classifyCortexRound } from './round_kind';

describe('classifyCortexRound', () => {
  it('recognises the message Nightshift builds for a recovered alert', () => {
    const userMessage = buildAlertRecoveredFollowUpMessage({
      alertUuid: 'uuid',
      alertId: 'instance',
      ruleId: 'rule',
      ruleName: 'Orders lag',
      ruleTypeId: 'type',
    });

    expect(classifyCortexRound({ userMessage, roundIndex: 1 })).toBe('alert_recovery');
    expect(classifyCortexRound({ userMessage })).toBe('alert_recovery');
  });

  it('treats a later round that is not a recovery as a follow-up', () => {
    expect(classifyCortexRound({ userMessage: 'You missed the cache.', roundIndex: 1 })).toBe(
      'follow_up'
    );
  });

  it.each([[0], [undefined]])('treats the first round (index %s) as initial', (roundIndex) => {
    expect(classifyCortexRound({ userMessage: 'Why is checkout slow?', roundIndex })).toBe(
      'initial'
    );
  });
});
