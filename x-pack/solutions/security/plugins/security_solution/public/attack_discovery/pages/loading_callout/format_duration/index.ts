/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const formatDuration = (duration_ms: number): string => {
  const hours = Math.floor(duration_ms / 3600000);
  const durationAfterHoursMs = duration_ms % 3600000;

  const minutes = Math.floor(durationAfterHoursMs / 60000);
  const durationAfterMinutesMs = durationAfterHoursMs % 60000;

  const seconds = Math.floor(durationAfterMinutesMs / 1000);
  const milliseconds = durationAfterMinutesMs % 1000;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (seconds > 0) {
    parts.push(`${seconds}s`);
  }

  if (parts.length === 0 && milliseconds > 0) {
    parts.push(`${milliseconds}ms`);
  }

  return parts.join(' ');
};
