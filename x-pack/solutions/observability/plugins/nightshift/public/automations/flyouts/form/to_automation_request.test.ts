/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAutomationFormValues,
  toAutomationFormValues,
  createTriggerFormValues,
  type TriggerFormValues,
} from './automation_form_values';
import type { Automation } from '../../hooks/use_automations';
import {
  toAutomationRequestBody,
  toAutomationUpdateBody,
  toEveryCron,
} from './to_automation_request';

const buildAutomation = (overrides: Partial<Automation>): Automation => ({
  id: 'automation-1',
  name: 'Triage',
  automationType: 'custom',
  isEnabled: true,
  trigger: { rows: [{ kind: 'alert' }] },
  execution: {},
  completion: {},
  runtime: {},
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  author: 'elastic',
  ...overrides,
});

const everyTrigger = (overrides: Partial<Extract<TriggerFormValues, { kind: 'every' }>> = {}) => ({
  ...(createTriggerFormValues('every') as Extract<TriggerFormValues, { kind: 'every' }>),
  ...overrides,
});

describe('automation request', () => {
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

  describe('toAutomationRequestBody', () => {
    const values = createAutomationFormValues();

    it('sends a trimmed alert automation', () => {
      expect(
        toAutomationRequestBody({
          ...values,
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
        execution: { promptTemplate: 'Find the cause', reasoningMode: 'investigate' },
        completion: {},
        runtime: { dailyDispatchLimit: 20 },
      });
    });

    it('sends an interval schedule with its cron and preset', () => {
      expect(
        toAutomationRequestBody({
          ...values,
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
        toAutomationRequestBody({
          ...values,
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

    it('sends a Slack trigger with its event, channels, people, and message filter', () => {
      expect(
        toAutomationRequestBody({
          ...values,
          name: 'Slack',
          trigger: {
            kind: 'slack_message',
            channels: ['#oncall'],
            users: ['emily'],
            messageFilter: ' outage ',
          },
        }).trigger
      ).toEqual({
        rows: [
          {
            kind: 'slack',
            event: 'message',
            channels: ['#oncall'],
            users: ['emily'],
            messageFilter: 'outage',
          },
        ],
      });
    });
  });

  describe('toAutomationUpdateBody', () => {
    const alertValues = {
      ...createAutomationFormValues(),
      name: 'Triage',
      trigger: { ...createTriggerFormValues('alert'), ruleNamePattern: 'cpu' },
    } as Parameters<typeof toAutomationUpdateBody>[0];

    it('keeps trigger fields and rows the form does not model', () => {
      const automation = buildAutomation({
        trigger: {
          rows: [
            { kind: 'alert', ruleNamePattern: 'old', ruleNameMatchMode: 'regex' },
            { kind: 'schedule', cronExpression: '0 9 * * *' },
          ],
        },
      });

      expect(toAutomationUpdateBody(alertValues, automation).trigger).toEqual({
        rows: [
          { kind: 'alert', ruleNamePattern: 'cpu', ruleNameMatchMode: 'regex' },
          { kind: 'schedule', cronExpression: '0 9 * * *' },
        ],
      });
    });

    it('keeps the schedule scope query', () => {
      const automation = buildAutomation({
        trigger: {
          rows: [
            {
              kind: 'schedule',
              schedulePreset: 'custom',
              cronExpression: '0 9 * * *',
              scopeQuery: 'host:a',
            },
          ],
        },
      });
      const values = {
        ...alertValues,
        trigger: { kind: 'cron', cronExpression: '0 10 * * *', timezone: 'UTC' },
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).trigger?.rows).toEqual([
        {
          kind: 'schedule',
          schedulePreset: 'custom',
          cronExpression: '0 10 * * *',
          timezone: 'UTC',
          scopeQuery: 'host:a',
        },
      ]);
    });

    it('replaces the rows when the trigger kind changes', () => {
      const automation = buildAutomation({
        trigger: {
          rows: [{ kind: 'schedule', cronExpression: '0 9 * * *', scopeQuery: 'host:a' }],
        },
      });

      expect(toAutomationUpdateBody(alertValues, automation).trigger).toEqual({
        rows: [{ kind: 'alert', ruleNamePattern: 'cpu' }],
      });
    });

    it('keeps a thread reply target', () => {
      const automation = buildAutomation({
        completion: { action: 'post_to_slack', targetMode: 'thread', destination: '#oncall' },
      });
      const values = {
        ...alertValues,
        slackAction: { target: 'channel', destination: '#oncall' },
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).completion).toMatchObject({
        targetMode: 'thread',
      });
    });

    it.each(['#oncall', '#new-channel'])(
      'preserves the saved Slack connector when saving channel %s',
      (destination) => {
        const automation = buildAutomation({
          completion: {
            action: 'post_to_slack',
            targetMode: 'channel',
            destination: '#oncall',
            connectorId: 'saved-slack',
          },
        });
        const values = {
          ...alertValues,
          name: 'Renamed',
          slackAction: { target: 'channel' as const, destination },
        };

        expect(toAutomationUpdateBody(values, automation).completion).toEqual({
          action: 'post_to_slack',
          targetMode: 'channel',
          destination,
          connectorId: 'saved-slack',
        });
      }
    );

    it('keeps the trigger untouched when the form did not change it', () => {
      const row = {
        kind: 'schedule' as const,
        schedulePreset: 'weekly' as const,
        cronExpression: '30 9 * * 1-5',
        timezone: 'UTC',
      };
      const automation = buildAutomation({ trigger: { rows: [row] } });
      const values = {
        ...createAutomationFormValues(),
        name: 'Triage',
        trigger: toAutomationFormValues(automation).trigger,
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).trigger).toEqual({ rows: [row] });
    });

    it('keeps the saved daily limit for a custom cron automation', () => {
      const automation = buildAutomation({
        trigger: {
          rows: [{ kind: 'schedule', schedulePreset: 'custom', cronExpression: '0 9 * * *' }],
        },
        runtime: { dailyDispatchLimit: 15 },
      });
      const values = {
        ...createAutomationFormValues(),
        name: 'Renamed',
        trigger: toAutomationFormValues(automation).trigger,
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).runtime).toEqual({
        dailyDispatchLimit: 15,
      });
    });

    it('keeps the stored completion of a Slack-triggered automation on unrelated edits', () => {
      const automation = buildAutomation({
        trigger: { rows: [{ kind: 'slack', event: 'message', channels: ['#oncall'] }] },
        completion: { action: 'post_to_slack', targetMode: 'channel', destination: '#alerts' },
      });
      const values = {
        ...toAutomationFormValues(automation),
        name: 'Renamed',
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).completion).toEqual(automation.completion);
    });

    it('saves a reply-in-thread action without a destination', () => {
      const automation = buildAutomation({});
      const values = {
        ...alertValues,
        slackAction: { target: 'thread', destination: '' },
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).completion).toEqual({
        action: 'post_to_slack',
        targetMode: 'thread',
        destination: null,
      });
      expect(toAutomationRequestBody(values).completion).toEqual({
        action: 'post_to_slack',
        targetMode: 'thread',
      });
    });

    it('keeps a completion action that is not a Slack post', () => {
      const automation = buildAutomation({ completion: { action: 'create_investigation' } });

      expect(toAutomationUpdateBody(alertValues, automation).completion).toEqual({
        action: 'create_investigation',
      });
    });

    it('clears a Slack action that was removed in the form', () => {
      const automation = buildAutomation({
        completion: { action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' },
      });

      expect(toAutomationUpdateBody(alertValues, automation).completion).toEqual({
        action: null,
        targetMode: null,
        destination: null,
      });
    });
  });
});
