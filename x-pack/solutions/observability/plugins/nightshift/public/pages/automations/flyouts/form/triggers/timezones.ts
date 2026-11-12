/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const getGmtOffset = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find(({ type }) => type === 'timeZoneName')?.value ?? '';

export const TIMEZONE_OPTIONS = [...new Set(['UTC', ...Intl.supportedValuesOf('timeZone')])].map(
  (value) => ({ value, label: value, help: getGmtOffset(value) })
);
