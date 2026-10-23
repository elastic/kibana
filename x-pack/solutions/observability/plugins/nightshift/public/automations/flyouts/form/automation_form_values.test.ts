/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PresetSchedule } from '@kbn/nightshift-investigations-plugin/common';
import type { Automation } from '../../hooks/use_automations';
import {
  createAutomationFormValues,
  toAutomationFormValues,
  toPresetSchedule,
} from './automation_form_values';

describe('automation form values', () => {
  describe('createAutomationFormValues', () => {
    it('starts with empty, disabled values', () => {
      expect(createAutomationFormValues()).toEqual({
        name: '',
        tags: [],
        description: '',
        trigger: undefined,
        dailyDispatchLimit: '20',
        instructions: '',
        mode: 'investigate',
        slackAction: undefined,
        isEnabled: false,
      });
    });
  });

  it.each(['invalid', '25:00'])('ignores invalid schedules when loading the form: %s', (time) => {
    const automation: Automation = {
      id: 'automation-1',
      name: 'Unsupported schedule',
      automationType: 'custom',
      isEnabled: false,
      trigger: { rows: [{ kind: 'schedule', schedulePreset: 'daily', time, timezone: 'UTC' }] },
      execution: {},
      completions: [],
      runtime: {},
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      author: 'elastic',
    };

    expect(toAutomationFormValues(automation).trigger).toBeUndefined();
  });

  it.each<PresetSchedule>([
    { schedulePreset: 'hourly', timezone: 'UTC' },
    { schedulePreset: 'hourly', hourWindow: { start: 0, end: 23 }, timezone: 'Asia/Kolkata' },
    { schedulePreset: 'daily', time: '09:30', timezone: 'Europe/Berlin' },
    { schedulePreset: 'weekly', time: '00:00', daysOfWeek: [0, 5, 1], timezone: 'UTC' },
  ])('round trips structured preset fields through the form: %j', (schedule) => {
    const automation: Automation = {
      id: 'automation-1',
      name: 'Scheduled',
      automationType: 'custom',
      isEnabled: true,
      trigger: { rows: [{ kind: 'schedule', ...schedule }] },
      execution: {},
      completions: [],
      runtime: {},
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      author: 'elastic',
    };

    const { trigger } = toAutomationFormValues(automation);
    if (trigger?.kind !== 'every') throw new Error('Expected a schedule preset');
    expect(toPresetSchedule(trigger)).toEqual(schedule);
  });

  it('maps an automation back to its edit form values', () => {
    const automation: Automation = {
      id: 'automation-1',
      name: 'Triage',
      description: 'Triage alerts',
      tags: ['oncall'],
      automationType: 'custom',
      isEnabled: true,
      trigger: {
        rows: [
          {
            kind: 'slack',
            event: 'message',
            channels: ['#oncall'],
            users: ['U1'],
            bots: ['A1'],
            messageFilter: 'outage',
          },
        ],
      },
      execution: { promptTemplate: 'Investigate', reasoningMode: 'investigate' },
      completions: [{ action: 'post_to_slack', targetMode: 'self', destination: '@me' }],
      runtime: { dailyDispatchLimit: 12 },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      author: 'elastic',
    };

    expect(toAutomationFormValues(automation)).toEqual({
      name: 'Triage',
      tags: ['oncall'],
      description: 'Triage alerts',
      trigger: {
        kind: 'slack_message',
        channels: ['#oncall'],
        users: ['U1'],
        bots: ['A1'],
        messageFilter: 'outage',
      },
      dailyDispatchLimit: '12',
      instructions: 'Investigate',
      mode: 'investigate',
      slackAction: { target: 'self', destination: '@me' },
      isEnabled: true,
    });
  });
});
