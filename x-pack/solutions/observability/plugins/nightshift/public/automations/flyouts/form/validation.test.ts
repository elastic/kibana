/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAutomationFormValues,
  createTriggerFormValues,
  type TriggerFormValues,
} from './automation_form_values';
import {
  canSaveAutomation,
  getInstructionsError,
  getSaveBlocker,
  isTriggerValid,
  isValidDailyLimit,
} from './validation';

const everyTrigger = (overrides: Partial<Extract<TriggerFormValues, { kind: 'every' }>> = {}) => ({
  ...(createTriggerFormValues('every') as Extract<TriggerFormValues, { kind: 'every' }>),
  ...overrides,
});

describe('automation validation', () => {
  it.each([
    ['1', true],
    ['50', true],
    ['', false],
    ['unlimited', true],
    ['0', false],
    ['51', false],
    ['1.5', false],
  ])('validates daily limit %s', (value, expected) => {
    expect(isValidDailyLimit(value)).toBe(expected);
  });

  it('validates triggers', () => {
    expect(isTriggerValid(undefined)).toBe(false);
    expect(isTriggerValid(createTriggerFormValues('alert'))).toBe(true);
    expect(isTriggerValid(everyTrigger({ unit: 'week', daysOfWeek: [] }))).toBe(false);
  });

  it('requires the hourly window to start before it ends', () => {
    const window = (startTime: string, endTime: string) =>
      everyTrigger({ unit: 'hour', betweenHours: true, startTime, endTime });
    expect(isTriggerValid(window('09:00', '17:00'))).toBe(true);
    expect(isTriggerValid(window('17:00', '09:00'))).toBe(false);
    expect(isTriggerValid(window('09:00', '09:00'))).toBe(false);
  });

  describe('getSaveBlocker', () => {
    const values = createAutomationFormValues();

    it('keeps scheduled saves enabled while reporting missing instructions for submit validation', () => {
      const trigger = createTriggerFormValues('every');
      const scheduled = { ...values, trigger };
      expect(canSaveAutomation(scheduled)).toBe(true);
      expect(getSaveBlocker(scheduled)).toBeUndefined();
      expect(getInstructionsError('', trigger)).toBe(
        'Add instructions describing what this scheduled automation should investigate.'
      );
      expect(canSaveAutomation({ ...scheduled, instructions: 'Review checkout health.' })).toBe(
        true
      );
      expect(canSaveAutomation({ ...scheduled, instructions: 'x'.repeat(10001) })).toBe(false);
    });

    it.each(['alert', 'slack_message', 'every'] as const)(
      'enforces the exact instructions limit for %s',
      (kind) => {
        const trigger =
          kind === 'slack_message'
            ? { ...createTriggerFormValues(kind), channels: ['C1'] }
            : createTriggerFormValues(kind);
        expect(canSaveAutomation({ ...values, trigger, instructions: 'x'.repeat(5000) })).toBe(
          true
        );
        expect(canSaveAutomation({ ...values, trigger, instructions: 'x'.repeat(5001) })).toBe(
          false
        );
        if (kind !== 'every')
          expect(canSaveAutomation({ ...values, trigger, instructions: '' })).toBe(true);
      }
    );

    it('blocks a Slack action without a destination', () => {
      const withTrigger = { ...values, trigger: createTriggerFormValues('alert') };
      expect(
        getSaveBlocker({ ...withTrigger, slackAction: { target: 'channel', destination: ' ' } })
      ).toBe('Choose a Slack channel to post to before saving');
      expect(
        getSaveBlocker({ ...withTrigger, slackAction: { target: 'self', destination: '' } })
      ).toBe('Choose who to message in Slack before saving');
    });

    it('blocks a Slack trigger without a channel', () => {
      const slackTrigger = createTriggerFormValues('slack_message');
      expect(getSaveBlocker({ ...values, trigger: slackTrigger })).toBe(
        'Select at least one channel.'
      );
      expect(
        getSaveBlocker({
          ...values,
          trigger: { ...slackTrigger, channels: ['#oncall'] } as typeof slackTrigger,
        })
      ).toBeUndefined();
    });

    it('asks for a trigger before saving', () => {
      expect(getSaveBlocker(values)).toBe('Select a trigger to save');
    });
  });

  describe('canSaveAutomation', () => {
    const values = createAutomationFormValues();

    it('requires a valid trigger and daily limit', () => {
      expect(canSaveAutomation(values)).toBe(false);
      expect(canSaveAutomation({ ...values, trigger: createTriggerFormValues('alert') })).toBe(
        true
      );
      expect(
        canSaveAutomation({
          ...values,
          trigger: createTriggerFormValues('alert'),
          dailyDispatchLimit: '0',
        })
      ).toBe(false);
    });
  });
});
