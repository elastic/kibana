/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Automation } from '../hooks/use_automations';
import { toCloneRequestBody } from './clone_automation';

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
  author: 'elastic',
  ...overrides,
});

describe('toCloneRequestBody', () => {
  it('copies an existing automation with a copy suffix', () => {
    const automation = buildAutomation({
      name: 'Triage',
      tags: ['oncall'],
      description: 'Triage alerts',
      trigger: { rows: [{ kind: 'schedule', cronExpression: '0 7 * * 1', timezone: 'CET' }] },
      execution: { promptTemplate: 'Find the cause', reasoningMode: 'investigate' },
      completion: { action: 'post_to_slack', targetMode: 'self', destination: '@me' },
      runtime: { dailyDispatchLimit: 5 },
    });

    expect(toCloneRequestBody(automation)).toEqual({
      name: 'Triage (copy)',
      tags: ['oncall'],
      description: 'Triage alerts',
      isEnabled: false,
      automationType: 'custom',
      trigger: { rows: [{ kind: 'schedule', cronExpression: '0 7 * * 1', timezone: 'CET' }] },
      execution: { promptTemplate: 'Find the cause', reasoningMode: 'investigate' },
      completion: { action: 'post_to_slack', targetMode: 'self', destination: '@me' },
      runtime: { dailyDispatchLimit: 5 },
    });
  });
});
