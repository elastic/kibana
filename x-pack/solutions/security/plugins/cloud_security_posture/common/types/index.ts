/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * as benchmarkV1 from './benchmarks/v1';
export * as benchmarkV2 from './benchmarks/v2';

// Explicit export of everything from latest
export type { BenchmarkScore, Benchmark, GetBenchmarkResponse } from './latest';
