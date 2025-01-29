/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';

export function computeMetrics(arr: number[]) {
  if (arr.length === 0) {
    return {
      avg: 0,
      p90: 0,
      p95: 0,
      max: 0,
      min: 0,
    };
  }

  const total = sum(arr);
  const r90 = (90 / 100) * (arr.length - 1) + 1;
  const r95 = (95 / 100) * (arr.length - 1) + 1;

  return {
    avg: total / arr.length,
    p90: arr[Math.floor(r90)],
    p95: arr[Math.floor(r95)],
    max: arr[arr.length - 1],
    min: arr[0],
  };
}
