/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Automation } from '../hooks/use_automations';
import {
  createAutomationDraft,
  createTriggerDraft,
  hasDailyLimit,
  isTriggerValid,
  isValidCron,
  isValidDailyLimit,
  toCreateAutomationBody,
  toEveryCron,
  type TriggerDraft,
} from './automation_draft';

const buildAutomation = (overrides: Partial<Automation>): Automation => ({
  id: 'automation-1',
  name: 'Automation',
  automationType: 'custom',
  isEnabled: true,
  trigger: { rows: [{ kind: 'alert' }] },
  execution: {},
  completion: {},
  runtime: {},
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  author: { username: 'elastic' },
  ...overrides,
});

const everyTrigger = (overrides: Partial<Extract<TriggerDraft, { kind: 'every' }>> = {}) => ({
  ...(createTriggerDraft('every') as Extract<TriggerDraft, { kind: 'every' }>),
  ...overrides,
});

describe('automation draft', () => {
  describe('createAutomationDraft', () => {
    it('starts an empty paused draft', () => {
      expect(createAutomationDraft()).toEqual({
        name: '',
        tags: [],
        description: '',
        trigger: undefined,
        dailyDispatchLimit: '20',
        instructions: '',
        mode: 'ask',
        slackAction: undefined,
        isEnabled: false,
      });
    });

    it('copies an existing automation', () => {
      const automation = buildAutomation({
        name: 'Triage',
        tags: ['oncall'],
        description: 'Triage alerts',
        trigger: {
          rows: [{ kind: 'alert', ruleNamePattern: 'cpu', alertStatus: 'active', tags: ['infra'] }],
        },
        execution: { promptTemplate: 'Find the cause', reasoningMode: 'investigate' },
        completion: { action: 'post_to_slack', targetMode: 'self', destination: '@me' },
        runtime: { dailyDispatchLimit: 5 },
      });

      expect(createAutomationDraft(automation)).toEqual({
        name: 'Triage',
        tags: ['oncall'],
        description: 'Triage alerts',
        trigger: {
          kind: 'alert',
          ruleNamePattern: 'cpu',
          ruleTags: ['infra'],
          alertStatus: 'active',
        },
        dailyDispatchLimit: '5',
        instructions: 'Find the cause',
        mode: 'investigate',
        slackAction: { target: 'self', destination: '@me' },
        isEnabled: false,
      });
    });

    it('maps schedule rows to a custom cron trigger', () => {
      const automation = buildAutomation({
        trigger: { rows: [{ kind: 'schedule', cronExpression: '0 7 * * 1', timezone: 'CET' }] },
      });

      expect(createAutomationDraft(automation).trigger).toEqual({
        kind: 'cron',
        cronExpression: '0 7 * * 1',
        timezone: 'CET',
      });
    });
  });

  describe('toEveryCron', () => {
    it('runs every hour', () => {
      expect(toEveryCron(everyTrigger())).toBe('0 * * * *');
    });

    it('limits hourly runs to a window', () => {
      expect(
        toEveryCron(everyTrigger({ betweenHours: true, startTime: '09:00', endTime: '17:00' }))
      ).toBe('0 9-17 * * *');
    });

    it('runs every day at a time', () => {
      expect(toEveryCron(everyTrigger({ unit: 'day', time: '07:30' }))).toBe('30 7 * * *');
    });

    it('runs on selected weekdays', () => {
      expect(toEveryCron(everyTrigger({ unit: 'week', time: '09:00', daysOfWeek: [5, 1] }))).toBe(
        '0 9 * * 1,5'
      );
    });
  });

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
    expect(hasDailyLimit(createTriggerDraft('alert'))).toBe(true);
    expect(hasDailyLimit(createTriggerDraft('every'))).toBe(true);
    expect(hasDailyLimit(createTriggerDraft('cron'))).toBe(false);
  });

  it('validates triggers', () => {
    expect(isTriggerValid(undefined)).toBe(false);
    expect(isTriggerValid(createTriggerDraft('alert'))).toBe(true);
    expect(isTriggerValid(everyTrigger({ unit: 'week', daysOfWeek: [] }))).toBe(false);
    expect(isTriggerValid({ kind: 'cron', cronExpression: 'bad', timezone: 'UTC' })).toBe(false);
  });

  describe('toCreateAutomationBody', () => {
    const draft = createAutomationDraft();

    it('sends a trimmed alert automation', () => {
      expect(
        toCreateAutomationBody({
          ...draft,
          name: '  Triage  ',
          description: '  ',
          tags: ['oncall'],
          instructions: ' Find the cause ',
          isEnabled: true,
          trigger: {
            kind: 'alert',
            ruleNamePattern: ' cpu ',
            ruleTags: ['infra'],
            alertStatus: 'inactive',
          },
        })
      ).toEqual({
        name: 'Triage',
        tags: ['oncall'],
        isEnabled: true,
        trigger: {
          rows: [
            { kind: 'alert', ruleNamePattern: 'cpu', alertStatus: 'inactive', tags: ['infra'] },
          ],
        },
        execution: { promptTemplate: 'Find the cause', reasoningMode: 'observe' },
        completion: {},
        runtime: { dailyDispatchLimit: 20 },
      });
    });

    it('sends an interval schedule with its cron and preset', () => {
      expect(
        toCreateAutomationBody({
          ...draft,
          name: 'Report',
          mode: 'investigate',
          trigger: everyTrigger({ unit: 'week', time: '08:00', daysOfWeek: [1], timezone: 'PST' }),
        })
      ).toMatchObject({
        trigger: {
          rows: [
            {
              kind: 'schedule',
              schedulePreset: 'weekly',
              cronExpression: '0 8 * * 1',
              timezone: 'PST',
            },
          ],
        },
        execution: { reasoningMode: 'investigate' },
      });
    });

    it('sends a custom cron without a daily limit and with a Slack action', () => {
      expect(
        toCreateAutomationBody({
          ...draft,
          name: 'Report',
          trigger: { kind: 'cron', cronExpression: ' 0 9 * * * ', timezone: 'UTC' },
          slackAction: { target: 'channel', destination: ' #oncall ' },
        })
      ).toMatchObject({
        trigger: {
          rows: [
            {
              kind: 'schedule',
              schedulePreset: 'custom',
              cronExpression: '0 9 * * *',
              timezone: 'UTC',
            },
          ],
        },
        completion: { action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' },
        runtime: {},
      });
    });
  });
});
