/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MANUAL_AUTOMATION_TRIGGER_SOURCE = 'nightshift-automation-manual';

/** Whether the automation can be run without an alert or Slack message. */
export const isScheduleOnlyAutomation = (automation: {
  trigger: { rows: ReadonlyArray<{ kind: string }> };
}): boolean =>
  automation.trigger.rows.length === 1 && automation.trigger.rows[0].kind === 'schedule';
