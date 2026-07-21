/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Stats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  std_dev: number;
  count: number;
}

export function computeStats(values: number[]): Stats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, std_dev: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / sorted.length;

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean * 100) / 100,
    median: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    std_dev: Math.round(Math.sqrt(variance) * 100) / 100,
    count: sorted.length,
  };
}

function percentile(sorted: number[], pct: number): number {
  const idx = (pct / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}
