/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { NightshiftAutomationAttributes } from './types';

export const validateThreadCompletion = (
  automation: Pick<NightshiftAutomationAttributes, 'trigger' | 'completions'>
): void => {
  const hasSlackTrigger = automation.trigger.rows.some((row) => row.kind === 'slack');
  const repliesInThread = automation.completions.some(
    ({ action, targetMode }) => action === 'post_to_slack' && targetMode === 'thread'
  );
  if (repliesInThread && !hasSlackTrigger) {
    throw badRequest('Replying in a thread requires a Slack trigger.');
  }
};
