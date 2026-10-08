/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Automation } from '../../hooks/use_automations';
import { createAutomationFormValues, toAutomationFormValues } from './automation_form_values';

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

  it('expands weekday ranges from a weekly cron', () => {
    const automation = {
      id: 'automation-1',
      name: 'Weekly',
      automationType: 'custom',
      isEnabled: true,
      trigger: {
        rows: [
          {
            kind: 'schedule',
            schedulePreset: 'weekly',
            cronExpression: '30 9 * * 1-3,5',
            timezone: 'UTC',
          },
        ],
      },
      execution: {},
      completion: {},
      runtime: {},
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      author: 'elastic',
    } as Automation;

    expect(toAutomationFormValues(automation).trigger).toMatchObject({
      kind: 'every',
      unit: 'week',
      daysOfWeek: [1, 2, 3, 5],
    });
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
            messageFilter: 'outage',
          },
        ],
      },
      execution: { promptTemplate: 'Investigate', reasoningMode: 'investigate' },
      completion: { action: 'post_to_slack', targetMode: 'self', destination: '@me' },
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
        messageFilter: 'outage',
      },
      dailyDispatchLimit: '12',
      instructions: 'Investigate',
      mode: 'investigate',
      slackAction: { target: 'thread', destination: '' },
      isEnabled: true,
    });
  });
});
