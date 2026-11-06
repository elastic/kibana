/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAlertRecoveredFollowUpMessage } from '../client/build_investigation_message';
import { FOLLOW_UP_PREAMBLE } from '../client/investigation_subjects';
import { classifyCortexRound, extractUserText, shouldOptimizeRound } from './round_kind';

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

  it('recognises a recovery message that Nightshift wrapped as a follow-up', () => {
    const userMessage = `${FOLLOW_UP_PREAMBLE}\n\nAn alert in this investigation has recovered. It cleared at 07:30.\n\n\n\nAdditional context: {"is_follow_up":true}`;

    expect(classifyCortexRound({ userMessage, roundIndex: 1 })).toBe('alert_recovery');
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

describe('extractUserText', () => {
  it('returns a bare message as it is, without surrounding whitespace', () => {
    expect(extractUserText('  check the cache  ')).toBe('check the cache');
  });

  it('drops the follow-up preamble and the trailing context and guidance', () => {
    expect(
      extractUserText(
        `${FOLLOW_UP_PREAMBLE}\n\nlook at the DNS publisher\n\nAdditional Instructions:\nBe brief.\n\nAdditional context: {"a":1}`
      )
    ).toBe('look at the DNS publisher');
  });
});

describe('shouldOptimizeRound', () => {
  const correction = 'You never checked what the DNS publisher depends on.';

  it.each([
    ['initial', 2, 'Why is checkout slow?', false],
    ['initial', 3, 'Why is checkout slow?', true],
    ['follow_up', 0, 'thanks', false],
    ['follow_up', 0, 'ok, that makes sense', false],
    ['follow_up', 0, correction, true],
    ['follow_up', 1, 'thanks', true],
    ['alert_recovery', 0, 'An alert in this investigation has recovered.', true],
  ] as const)('%s with %s sandbox calls and "%s" runs: %s', (roundKind, count, message, runs) => {
    expect(
      shouldOptimizeRound({ roundKind, sandboxToolCallCount: count, userMessage: message })
    ).toBe(runs);
  });

  // Nightshift wraps a follow-up it starts, which alone is far longer than the length gate.
  const wrapped = (text: string) =>
    `${FOLLOW_UP_PREAMBLE}\n\n${text}\n\n\n\nAdditional context: {"is_follow_up":true,"source":"manual"}`;

  it('measures what the user wrote, not the wrapper Nightshift adds around a follow-up', () => {
    expect(
      shouldOptimizeRound({
        roundKind: 'follow_up',
        sandboxToolCallCount: 0,
        userMessage: wrapped('thanks'),
      })
    ).toBe(false);
    expect(
      shouldOptimizeRound({
        roundKind: 'follow_up',
        sandboxToolCallCount: 0,
        userMessage: wrapped(correction),
      })
    ).toBe(true);
  });

  it('does not count surrounding whitespace towards the length of a follow-up', () => {
    expect(
      shouldOptimizeRound({
        roundKind: 'follow_up',
        sandboxToolCallCount: 0,
        userMessage: `   thanks${' '.repeat(60)}`,
      })
    ).toBe(false);
  });
});
