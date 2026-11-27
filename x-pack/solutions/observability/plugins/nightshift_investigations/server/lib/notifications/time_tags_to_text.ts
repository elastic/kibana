/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A complete `<time>` tag: group 1 is the opening tag's attributes, group 2 the inner text. */
const TIME_TAG = /<time(?=[\s/>])([^>]*?)(?:\/>|>([^<]*)<\/time\s*>)/gi;
const DATETIME_ATTRIBUTE = /\sdatetime\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const ISO_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const pad = (value: number): string => String(value).padStart(2, '0');

const parseDatetime = (value: string | undefined): Date | undefined => {
  const [, year, month, day] = (value && ISO_WITH_ZONE.exec(value)) || [];
  if (!value || !year) return undefined;
  // `Date` rolls an impossible day such as Feb 30 over into the next month instead of rejecting it.
  const calendarDay = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendarDay.getUTCMonth() !== Number(month) - 1 || calendarDay.getUTCDate() !== Number(day)) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const formatUtc = (time: Date, now: Date): string => {
  const year = time.getUTCFullYear() === now.getUTCFullYear() ? '' : `, ${time.getUTCFullYear()}`;
  return `${MONTHS[time.getUTCMonth()]} ${time.getUTCDate()}${year}, ${pad(
    time.getUTCHours()
  )}:${pad(time.getUTCMinutes())} UTC`;
};

/**
 * Replaces each `<time datetime="...">` tag with a readable UTC time ("Nov 24, 17:20 UTC"), for
 * surfaces such as Slack that show the tag as raw text. A tag without a valid `datetime` becomes
 * its inner text, or stays as written when it has none.
 */
export const timeTagsToText = (text: string, now: Date = new Date()): string =>
  text.replace(TIME_TAG, (tag, attributes: string, innerText?: string) => {
    const [, doubleQuoted, singleQuoted] = DATETIME_ATTRIBUTE.exec(attributes) ?? [];
    const parsed = parseDatetime(doubleQuoted ?? singleQuoted);
    return parsed ? formatUtc(parsed, now) : innerText || tag;
  });
