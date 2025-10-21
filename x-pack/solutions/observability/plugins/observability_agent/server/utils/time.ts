/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// converts microseconds to milliseconds
export function toMilliseconds(us: number | null): number | undefined {
  if (us) {
    return us / 1000;
  }
}

// convert epoch milliseconds to ISO string
export function toISOString(epoch: number | null) {
  if (epoch) {
    return new Date(epoch).toISOString();
  }
}
