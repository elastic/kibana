/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts milliseconds to time duration
 */
export function toLargestTimeDuration(ms: number): string {
  if (isNaN(ms)) {
    return 'INVALID';
  }

  if (ms === 0) {
    return `0s`;
  }

  if (ms % (3600000 * 24) === 0) {
    return `${ms / (3600000 * 24)}d`;
  }

  if (ms % 3600000 === 0) {
    return `${ms / 3600000}h`;
  }

  if (ms % 60000 === 0) {
    return `${ms / 60000}m`;
  }

  if (ms % 1000 === 0) {
    return `${ms / 1000}s`;
  }

  return `${ms}ms`;
}
