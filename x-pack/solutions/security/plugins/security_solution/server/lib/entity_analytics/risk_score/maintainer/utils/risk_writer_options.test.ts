/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRiskWriterOptions } from './risk_writer_options';

const defaults = { flushBytes: 2_000_000, flushInterval: 1_000, concurrency: 2 };

describe('experimental risk writer options', () => {
  it('uses an independent copy of the defaults when headers are omitted', () => {
    const options = getRiskWriterOptions({}, defaults);
    expect(options).toEqual(defaults);
    expect(options).not.toBe(defaults);
  });

  it('applies per-run overrides while preserving the flush interval', () => {
    expect(
      getRiskWriterOptions(
        {
          'x-risk-perf-mode': 'stream',
          'x-risk-perf-flush-bytes': '4000000',
          'x-risk-perf-concurrency': '8',
        },
        defaults
      )
    ).toEqual({ flushBytes: 4_000_000, flushInterval: 1_000, concurrency: 8 });
    expect(getRiskWriterOptions({}, defaults)).toEqual(defaults);
  });

  it('selects the page-writer baseline', () => {
    expect(getRiskWriterOptions({ 'x-risk-perf-mode': 'baseline' }, defaults)).toBeUndefined();
  });

  it('rejects stream settings combined with baseline mode', () => {
    expect(() =>
      getRiskWriterOptions(
        { 'x-risk-perf-mode': 'baseline', 'x-risk-perf-concurrency': '8' },
        defaults
      )
    ).toThrow('Baseline mode accepts only the mode override');
  });

  it.each([
    { 'x-risk-perf-mode': 'other' },
    { 'x-risk-perf-mode': ['stream', 'baseline'] },
    { 'x-risk-perf-flush-bytes': '99999' },
    { 'x-risk-perf-flush-bytes': '20000001' },
    { 'x-risk-perf-flush-bytes': 'Infinity' },
    { 'x-risk-perf-concurrency': '0' },
    { 'x-risk-perf-concurrency': '17' },
    { 'x-risk-perf-concurrency': '1.5' },
    { 'x-risk-perf-concurrency': ['6', '8'] },
  ])('rejects malformed or out-of-range overrides: %j', (headers) => {
    expect(() => getRiskWriterOptions(headers, defaults)).toThrow();
  });
});
