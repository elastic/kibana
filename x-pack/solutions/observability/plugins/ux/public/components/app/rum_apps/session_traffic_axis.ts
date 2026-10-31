/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const validDate = (value: number): Date | undefined => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
};

/** Compact tick: time for short ranges, calendar day otherwise. */
export const formatSessionTrafficAxis = (value: number, spanMs: number, locale: string): string => {
  const date = validDate(value);
  if (!date) {
    return '';
  }
  if (spanMs <= 2 * DAY_MS) {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  if (spanMs <= 45 * DAY_MS) {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
};

/** Tooltip header with enough context that the tick can stay short. */
export const formatSessionTrafficTooltip = (
  value: number,
  spanMs: number,
  locale: string
): string => {
  const date = validDate(value);
  if (!date) {
    return '';
  }
  if (spanMs <= 2 * DAY_MS) {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};
