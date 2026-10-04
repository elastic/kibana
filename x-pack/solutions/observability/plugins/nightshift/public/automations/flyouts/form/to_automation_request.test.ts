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
import { toAutomationRequestBody, toEveryCron } from './to_automation_request';

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
        execution: { promptTemplate: 'Find the cause', reasoningMode: 'observe' },
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
      expect(
        toAutomationRequestBody({
          ...values,
          name: 'Slack',
          trigger: { kind: 'slack_invite', channels: [], users: [], messageFilter: 'ignored' },
        }).trigger
      ).toEqual({ rows: [{ kind: 'slack', event: 'invite' }] });
    });
  });
});
