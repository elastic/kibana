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
  getSaveBlocker,
  hasDailyLimit,
  isTriggerValid,
  isValidCron,
  isValidDailyLimit,
} from './validation';

const everyTrigger = (overrides: Partial<Extract<TriggerFormValues, { kind: 'every' }>> = {}) => ({
  ...(createTriggerFormValues('every') as Extract<TriggerFormValues, { kind: 'every' }>),
  ...overrides,
});

describe('automation validation', () => {
  it.each([
    ['0 9 * * *', true],
    ['*/15 9-17 * * 1-5', true],
    ['0 9 * *', false],
    ['not a cron', false],
  ])('validates cron %s', (expression, expected) => {
    expect(isValidCron(expression)).toBe(expected);
  });

  it.each([
    ['1', true],
    ['200', true],
    ['', false],
    ['0', false],
    ['201', false],
    ['1.5', false],
  ])('validates daily limit %s', (value, expected) => {
    expect(isValidDailyLimit(value)).toBe(expected);
  });

  it('only applies a daily limit to event and interval triggers', () => {
    expect(hasDailyLimit(undefined)).toBe(false);
    expect(hasDailyLimit(createTriggerFormValues('alert'))).toBe(true);
    expect(hasDailyLimit(createTriggerFormValues('every'))).toBe(true);
    expect(hasDailyLimit(createTriggerFormValues('cron'))).toBe(false);
  });

  it('validates triggers', () => {
    expect(isTriggerValid(undefined)).toBe(false);
    expect(isTriggerValid(createTriggerFormValues('alert'))).toBe(true);
    expect(isTriggerValid(everyTrigger({ unit: 'week', daysOfWeek: [] }))).toBe(false);
    expect(isTriggerValid({ kind: 'cron', cronExpression: 'bad', timezone: 'UTC' })).toBe(false);
  });

  describe('getSaveBlocker', () => {
    const values = createAutomationFormValues();

    it('blocks an invalid custom cron', () => {
      expect(
        getSaveBlocker({
          ...values,
          trigger: { kind: 'cron', cronExpression: 'bad', timezone: 'UTC' },
        })
      ).toBe('Fix the cron expression to save');
    });

    it('blocks a Slack action without a destination', () => {
      expect(
        getSaveBlocker({ ...values, slackAction: { target: 'channel', destination: ' ' } })
      ).toBe('Choose a Slack channel to post to before saving');
      expect(getSaveBlocker({ ...values, slackAction: { target: 'self', destination: '' } })).toBe(
        'Choose who to message in Slack before saving'
      );
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
