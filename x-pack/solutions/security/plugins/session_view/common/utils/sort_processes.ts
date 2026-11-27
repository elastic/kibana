/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Process } from '..';

// digits after the millisecond part of an ISO timestamp's fraction (e.g. date_nanos values)
const SUB_MILLIS_REGEX = /T[\d:]+\.\d{3}(\d{1,6})/;

const getSubMillis = (timestamp: string): number => {
  const match = SUB_MILLIS_REGEX.exec(timestamp);
  return match ? Number(match[1].padEnd(6, '0')) : 0;
};

/**
 * Compares ISO timestamps chronologically. String comparison is not safe when values mix
 * millisecond and nanosecond precision (e.g. `logsdb` and `logsdb_columnar` backing indices).
 */
const compareTimestamps = (a: string | undefined, b: string | undefined): number => {
  const millisA = a ? Date.parse(a) : 0;
  const millisB = b ? Date.parse(b) : 0;

  if (Number.isNaN(millisA) || Number.isNaN(millisB)) {
    return (a ?? '').localeCompare(b ?? '');
  }

  if (millisA !== millisB) {
    return millisA < millisB ? -1 : 1;
  }

  return Math.sign(getSubMillis(a ?? '') - getSubMillis(b ?? ''));
};

export const sortProcesses = (a: Process, b: Process) =>
  compareTimestamps(a.getDetails()?.process?.start, b.getDetails()?.process?.start);
