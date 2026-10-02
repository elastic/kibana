/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const COMMON_TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0,
  GMT: 0,
  IST: 5.5,
  PST: -8,
  PDT: -7,
  EST: -5,
  EDT: -4,
  CST: -6,
  CDT: -5,
  MST: -7,
  MDT: -6,
  BST: 1,
  CET: 1,
  CEST: 2,
  JST: 9,
  AEST: 10,
  AEDT: 11,
  NZST: 12,
};

const formatGmtOffset = (hours: number) =>
  hours === 0 ? 'GMT' : `GMT${hours > 0 ? '+' : '-'}${Math.abs(hours)}`;

const getIanaOffset = (timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find(({ type }) => type === 'timeZoneName')?.value ?? '';

export const TIMEZONE_OPTIONS = [
  ...Object.entries(COMMON_TIMEZONE_OFFSETS).map(([value, offset]) => ({
    value,
    label: value,
    help: formatGmtOffset(offset),
  })),
  ...Intl.supportedValuesOf('timeZone')
    .filter((value) => !(value in COMMON_TIMEZONE_OFFSETS))
    .map((value) => ({ value, label: value, help: getIanaOffset(value) })),
];
