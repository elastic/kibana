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
  toPresetSchedule,
  type TriggerFormValues,
} from './automation_form_values';
import type { Automation } from '../../hooks/use_automations';
import { toAutomationRequestBody, toAutomationUpdateBody } from './to_automation_request';

const buildAutomation = (overrides: Partial<Automation>): Automation => ({
  id: 'automation-1',
  name: 'Triage',
  automationType: 'custom',
  isEnabled: true,
  trigger: { rows: [{ kind: 'alert' }] },
  execution: {},
  completions: [],
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
  describe('toPresetSchedule', () => {
    it('stores an unrestricted hourly preset', () => {
      expect(toPresetSchedule(everyTrigger())).toEqual({
        schedulePreset: 'hourly',
        timezone: 'UTC',
      });
    });

    it('stores an inclusive hourly window', () => {
      expect(
        toPresetSchedule(everyTrigger({ betweenHours: true, startTime: '09:00', endTime: '17:00' }))
      ).toEqual({ schedulePreset: 'hourly', hourWindow: { start: 9, end: 17 }, timezone: 'UTC' });
    });

    it('stores a daily local time', () => {
      expect(toPresetSchedule(everyTrigger({ unit: 'day', time: '07:30' }))).toEqual({
        schedulePreset: 'daily',
        time: '07:30',
        timezone: 'UTC',
      });
    });

    it('stores selected weekdays', () => {
      expect(
        toPresetSchedule(everyTrigger({ unit: 'week', time: '09:00', daysOfWeek: [5, 1] }))
      ).toEqual({
        schedulePreset: 'weekly',
        time: '09:00',
        daysOfWeek: [5, 1],
        timezone: 'UTC',
      });
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
            ruleNames: ['Disk full'],
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
            {
              kind: 'alert',
              ruleNamePattern: 'cpu',
              ruleNames: ['Disk full'],
              alertStatus: 'inactive',
              tags: ['infra'],
            },
          ],
        },
        execution: { promptTemplate: 'Find the cause', reasoningMode: 'investigate' },
        completions: [],
        runtime: { dailyDispatchLimit: 20 },
      });
    });

    it('sends a weekly schedule with its time and weekdays', () => {
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
              time: '08:00',
              daysOfWeek: [1],
              timezone: 'PST',
            },
          ],
        },
        execution: { reasoningMode: 'investigate' },
      });
    });

    it('sends a daily schedule with a daily limit and a Slack action', () => {
      expect(
        toAutomationRequestBody({
          ...values,
          name: 'Report',
          trigger: everyTrigger({ unit: 'day', time: '09:00', timezone: 'UTC' }),
          slackAction: { target: 'channel', destination: ' #oncall ' },
        })
      ).toMatchObject({
        trigger: {
          rows: [
            {
              kind: 'schedule',
              schedulePreset: 'daily',
              time: '09:00',
              timezone: 'UTC',
            },
          ],
        },
        completions: [{ action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' }],
        runtime: { dailyDispatchLimit: 20 },
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
            { kind: 'schedule', schedulePreset: 'daily', time: '09:00' },
          ],
        },
      });

      expect(toAutomationUpdateBody(alertValues, automation).trigger).toEqual({
        rows: [
          { kind: 'alert', ruleNamePattern: 'cpu', ruleNameMatchMode: 'regex' },
          { kind: 'schedule', schedulePreset: 'daily', time: '09:00' },
        ],
      });
    });

    it('keeps the schedule scope query', () => {
      const automation = buildAutomation({
        trigger: {
          rows: [
            {
              kind: 'schedule',
              schedulePreset: 'daily',
              time: '09:00',
              scopeQuery: 'host:a',
            },
          ],
        },
      });
      const values = {
        ...alertValues,
        trigger: everyTrigger({ unit: 'day', time: '10:00', timezone: 'UTC' }),
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).trigger?.rows).toEqual([
        {
          kind: 'schedule',
          schedulePreset: 'daily',
          time: '10:00',
          timezone: 'UTC',
          scopeQuery: 'host:a',
        },
      ]);
    });

    it('replaces the rows when the trigger kind changes', () => {
      const automation = buildAutomation({
        trigger: {
          rows: [
            { kind: 'schedule', schedulePreset: 'daily', time: '09:00', scopeQuery: 'host:a' },
          ],
        },
      });

      expect(toAutomationUpdateBody(alertValues, automation).trigger).toEqual({
        rows: [{ kind: 'alert', ruleNamePattern: 'cpu' }],
      });
    });

    it('keeps a thread reply target', () => {
      const automation = buildAutomation({
        completions: [{ action: 'post_to_slack', targetMode: 'thread', destination: '#oncall' }],
      });
      const values = {
        ...alertValues,
        slackAction: { target: 'channel', destination: '#oncall' },
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).completions).toMatchObject([
        { targetMode: 'thread' },
      ]);
    });

    it.each(['#oncall', '#new-channel'])(
      'preserves the saved Slack connector when saving channel %s',
      (destination) => {
        const automation = buildAutomation({
          completions: [
            {
              action: 'post_to_slack',
              targetMode: 'channel',
              destination: '#oncall',
              connectorId: 'saved-slack',
            },
          ],
        });
        const values = {
          ...alertValues,
          name: 'Renamed',
          slackAction: { target: 'channel' as const, destination },
        };

        expect(toAutomationUpdateBody(values, automation).completions).toEqual([
          {
            action: 'post_to_slack',
            targetMode: 'channel',
            destination,
            connectorId: 'saved-slack',
          },
        ]);
      }
    );

    it('keeps the trigger untouched when the form did not change it', () => {
      const row = {
        kind: 'schedule' as const,
        schedulePreset: 'weekly' as const,
        time: '09:30',
        daysOfWeek: [1, 2, 3, 4, 5],
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

    it('keeps the saved daily limit for a scheduled automation', () => {
      const automation = buildAutomation({
        trigger: {
          rows: [{ kind: 'schedule', schedulePreset: 'daily', time: '09:00' }],
        },
        runtime: { dailyDispatchLimit: 15 },
      });
      const values = {
        ...toAutomationFormValues(automation),
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
        completions: [{ action: 'post_to_slack', targetMode: 'channel', destination: '#alerts' }],
      });
      const values = {
        ...toAutomationFormValues(automation),
        name: 'Renamed',
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).completions).toEqual(
        automation.completions
      );
    });

    it('saves a reply-in-thread action without a destination', () => {
      const automation = buildAutomation({});
      const values = {
        ...alertValues,
        slackAction: { target: 'thread', destination: '' },
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).completions).toEqual([
        { action: 'post_to_slack', targetMode: 'thread' },
      ]);
      expect(toAutomationRequestBody(values).completions).toEqual([
        { action: 'post_to_slack', targetMode: 'thread' },
      ]);
    });

    it('drops the stored destination when switching to a thread reply', () => {
      const automation = buildAutomation({
        completions: [{ action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' }],
      });
      const values = {
        ...alertValues,
        slackAction: { target: 'thread', destination: '' },
      } as Parameters<typeof toAutomationUpdateBody>[0];

      expect(toAutomationUpdateBody(values, automation).completions).toEqual([
        { action: 'post_to_slack', targetMode: 'thread' },
      ]);
    });

    it('keeps a completion action that is not a Slack post', () => {
      const automation = buildAutomation({ completions: [{ action: 'create_investigation' }] });

      expect(toAutomationUpdateBody(alertValues, automation).completions).toEqual([
        { action: 'create_investigation' },
      ]);
    });

    it('clears a Slack action that was removed in the form', () => {
      const automation = buildAutomation({
        completions: [{ action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' }],
      });

      expect(toAutomationUpdateBody(alertValues, automation).completions).toEqual([]);
    });

    it('replaces only the first completion and keeps the others', () => {
      const automation = buildAutomation({
        completions: [
          { action: 'post_to_slack', targetMode: 'channel', destination: '#oncall' },
          { action: 'create_investigation' },
        ],
      });

      expect(toAutomationUpdateBody(alertValues, automation).completions).toEqual([
        { action: 'create_investigation' },
      ]);
    });
  });
});
