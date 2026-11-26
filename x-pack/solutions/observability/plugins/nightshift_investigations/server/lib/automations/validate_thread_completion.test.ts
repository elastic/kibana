/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftAutomationAttributes, NightshiftTriggerRow } from './types';
import { validateThreadCompletion } from './validate_thread_completion';

const build = (
  row: NightshiftTriggerRow
): Pick<NightshiftAutomationAttributes, 'trigger' | 'completions'> => ({
  trigger: { rows: [row] },
  completions: [{ action: 'post_to_slack', targetMode: 'thread' }],
});

describe('validateThreadCompletion', () => {
  it('rejects a thread reply on a trigger that is not a Slack trigger', () => {
    expect(() => validateThreadCompletion(build({ kind: 'alert' }))).toThrow(
      'Replying in a thread requires a Slack trigger.'
    );
  });

  it('accepts a thread reply on a Slack trigger', () => {
    expect(() =>
      validateThreadCompletion(build({ kind: 'slack', event: 'message' }))
    ).not.toThrow();
  });
});
