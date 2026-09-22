/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Calculates the duration between two dates in nanoseconds.
 * Used for event log duration tracking.
 */
export const getDurationNanoseconds = ({ end, start }: { end: Date; start: Date }): number =>
  (end.getTime() - start.getTime()) * 1_000_000; // Convert milliseconds to nanoseconds
