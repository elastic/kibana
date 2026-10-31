/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Snapshot instants for point-in-time eval examples that name a calendar day without a year
 * ("What did user X's profile look like on March 15th?").
 *
 * A year-less month-and-day resolves to either the current or the previous UTC calendar year
 * depending on when the suite runs, so the fixture holds a snapshot for both readings and the
 * query lands on a seeded day either way. Both instants sit at noon UTC, well inside the day
 * range `security.get_entity`'s date branch ranges over.
 */
export const getMarchSnapshotTimestamps = (now: Date = new Date()): string[] => {
  const year = now.getUTCFullYear();
  return [`${year}-03-15T12:00:00.000Z`, `${year - 1}-03-15T12:00:00.000Z`];
};
