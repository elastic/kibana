/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MAX_CRON_EXPRESSION_LENGTH = 256;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

interface CronCalendar {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  byhour: number[];
  byminute: number[];
  byweekday?: Array<(typeof WEEKDAYS)[number]>;
  bymonthday?: number[];
}

type CronResult = { success: true; calendar: CronCalendar } | { success: false; error: string };

const parseField = (field: string, minimum: number, maximum: number): number[] | undefined => {
  const values = new Set<number>();
  for (const part of field.split(',')) {
    const match = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part);
    if (!match) return;
    const [, range, stepText] = match;
    const step = stepText === undefined ? 1 : Number(stepText);
    const [start, end] =
      range === '*'
        ? [minimum, maximum]
        : range.includes('-')
        ? range.split('-').map(Number)
        : [Number(range), stepText === undefined ? Number(range) : maximum];
    if (
      !Number.isSafeInteger(step) ||
      step < 1 ||
      start < minimum ||
      end > maximum ||
      start > end
    ) {
      return;
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return [...values].sort((first, second) => first - second);
};

/** Parses the numeric Cron subset that can be represented by one workflow RRULE. */
export const parseCronExpression = (expression: string): CronResult => {
  const invalid = {
    success: false as const,
    error: i18n.translate(
      'xpack.nightshiftInvestigations.automations.cron.invalidExpressionErrorMessage',
      {
        defaultMessage:
          'Enter five numeric Cron fields with valid values, lists, ascending ranges, or positive steps.',
      }
    ),
  };
  if (expression.length > MAX_CRON_EXPRESSION_LENGTH) return invalid;
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return invalid;
  const [minute, hour, monthday, month, weekday] = fields;
  if (month !== '*') {
    return {
      success: false,
      error: i18n.translate('xpack.nightshiftInvestigations.automations.cron.monthErrorMessage', {
        defaultMessage: 'The month field must be *; month restrictions are not supported.',
      }),
    };
  }
  if (monthday !== '*' && weekday !== '*') {
    return {
      success: false,
      error: i18n.translate(
        'xpack.nightshiftInvestigations.automations.cron.dayFieldsErrorMessage',
        {
          defaultMessage: 'Either day-of-month or day-of-week must be *.',
        }
      ),
    };
  }
  const byminute = parseField(minute, 0, 59);
  const byhour = parseField(hour, 0, 23);
  const bymonthday = parseField(monthday, 1, 31);
  const days = parseField(weekday, 0, 7);
  if (!byminute || !byhour || !bymonthday || !days) return invalid;
  return {
    success: true,
    calendar: {
      freq: monthday !== '*' ? 'MONTHLY' : weekday !== '*' ? 'WEEKLY' : 'DAILY',
      interval: 1,
      byhour,
      byminute,
      ...(monthday !== '*' ? { bymonthday } : {}),
      ...(weekday !== '*' ? { byweekday: [...new Set(days.map((day) => WEEKDAYS[day % 7]))] } : {}),
    },
  };
};
