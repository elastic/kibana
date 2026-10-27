/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { MAX_AUTOMATION_INSTRUCTIONS_LENGTH } from '../../../common/automation_limits';
import { parsePresetSchedule } from '../../../common/automation_schedule';
import type { NightshiftAutomationAttributes } from './types';

/** Rejects schedules that cannot generate an instructions-driven investigation. */
export const validateScheduledAutomation = (
  automation: Pick<NightshiftAutomationAttributes, 'trigger' | 'execution'>
): void => {
  const schedules = automation.trigger.rows.filter((row) => row.kind === 'schedule');
  if (!schedules.length) return;
  if (schedules.length > 1) throw badRequest('Only one schedule row is supported per automation.');
  for (const row of schedules) {
    const schedule = parsePresetSchedule(row);
    if (!schedule.success) throw badRequest(schedule.error);
  }
  const instructions = automation.execution.promptTemplate;
  if (!instructions?.trim() || instructions.length > MAX_AUTOMATION_INSTRUCTIONS_LENGTH) {
    throw badRequest(
      `Scheduled automations require instructions of 1 to ${MAX_AUTOMATION_INSTRUCTIONS_LENGTH} characters.`
    );
  }
};
