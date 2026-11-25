/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** An epoch-millisecond minute boundary as `YYYY-MM-DD HH:mm` UTC, the unit the engine plans in. */
export function formatMinute(epochMs: number): string {
  return `${new Date(epochMs).toISOString().slice(0, 16).replace('T', ' ')}Z`;
}
