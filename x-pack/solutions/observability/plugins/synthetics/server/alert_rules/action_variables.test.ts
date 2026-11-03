/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsPluginsSetupDependencies } from '../types';
import { getActionVariables } from './action_variables';

const plugins = {
  observability: {
    getAlertDetailsConfig: () => ({ uptime: { enabled: false } }),
  },
} as unknown as SyntheticsPluginsSetupDependencies;

const contextNames = (ruleType: 'monitorStatus' | 'tls') =>
  getActionVariables({ plugins, ruleType }).context.map((variable) => variable.name);

describe('getActionVariables', () => {
  it('exposes the raw ISO timestamp next to checkedAt for the monitor status rule', () => {
    const { context } = getActionVariables({ plugins, ruleType: 'monitorStatus' });
    const names = context.map((variable) => variable.name);
    const checkedAtIndex = names.indexOf('checkedAt');

    expect(names[checkedAtIndex + 1]).toBe('timestamp');
    expect(names.filter((name) => name === 'checkedAt' || name === 'timestamp')).toEqual([
      'checkedAt',
      'timestamp',
    ]);

    expect(context.find((variable) => variable.name === 'timestamp')?.description).toBe(
      'The timestamp of the last check, as an ISO 8601 string. Use with FormatDate to render it in a specific timezone.'
    );
    expect(context.find((variable) => variable.name === 'checkedAt')?.description).toContain(
      'pre-formatted'
    );
  });

  it('keeps the TLS rule checkedAt description and does not declare timestamp', () => {
    const { context } = getActionVariables({ plugins, ruleType: 'tls' });

    expect(contextNames('tls')).not.toContain('timestamp');
    expect(context.find((variable) => variable.name === 'checkedAt')?.description).toBe(
      'Timestamp of the monitor run.'
    );
  });
});
