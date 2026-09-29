/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import { discoverOtelSignals } from './discover_otel_signals';
import { otelMetricConstructorGrepPattern } from './instrumentation_patterns';

/** Provides the immutable repository identity required by the source-reader port. */
const repository: ResolvedRepository = {
  commitSha: '0123456789012345678901234567890123456789',
  repository: 'elastic/example',
  requestedRevision: 'main',
};

/** Creates a reader that finds a span source line and returns deterministic bounded windows. */
const readerWithSpan = (): SourceReader => ({
  grep: async ({ pattern }) =>
    pattern.includes('startSpan')
      ? {
          items: [{ line: 10, path: 'src/telemetry.ts', text: 'tracer.startSpan("checkout")' }],
          status: 'complete',
        }
      : { items: [], status: 'complete' },
  listSourcePage: async () => ({ items: [], status: 'complete' }),
  readWindow: async () => ({
    status: 'success',
    value: {
      endLine: 13,
      lines: ['', '', '', 'tracer.startSpan("checkout")', '', '', ''],
      path: 'src/telemetry.ts',
      startLine: 7,
    },
  }),
});

/** Verifies source-reader discovery preserves the difference between empty data and failed access. */
describe('discoverOtelSignals', () => {
  it('returns a successful empty result when every complete search has no OTel sites', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async () => ({ items: [], status: 'complete' }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(discoverOtelSignals({ reader, repository })).resolves.toEqual({
      diagnostics: [],
      signals: [],
    });
  });

  it('returns extracted source evidence after complete search and read coverage', async () => {
    /** Holds local test or extraction state. */
    const result = await discoverOtelSignals({ reader: readerWithSpan(), repository });

    expect(result.diagnostics).toEqual([]);
    expect(result.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'span_name', value: 'checkout' })])
    );
  });

  it('discovers every metric kind through shared constructor spellings and extracts their kinds', async () => {
    /** Holds local test or extraction state. */
    const metricLines: Readonly<Record<number, string>> = {
      10: 'meter.create_counter("counter.metric")',
      20: 'meter.create_up_down_counter("updown.metric")',
      30: 'meter.Int64Histogram("histogram.metric")',
      40: 'meter.create_observable_gauge("gauge.metric")',
      50: 'meter.upDownCounterBuilder("builder.updown")',
      60: 'meter.gaugeBuilder("builder.gauge")',
      70: 'meter.Int64UpDownCounter("go.updown")',
      80: 'meter.Float64ObservableCounter("go.observable.counter")',
      90: 'meter.Int64ObservableGauge("go.observable.gauge")',
      100: 'meter.CreateCounter<long>("csharp.counter")',
      110: 'meter.CreateObservableUpDownCounter<long>("csharp.observable.updown")',
      120: 'meter.createGauge("direct.gauge")',
      130: 'meter.CreateGauge<long>("csharp.direct.gauge")',
    };
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === otelMetricConstructorGrepPattern
            ? Object.entries(metricLines).map(([line, text]) => ({
                line: Number(line),
                path: 'src/metrics.ts',
                text,
              }))
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => {
        /** Holds local test or extraction state. */
        const line: number = startLine + 3;
        /** Holds local test or extraction state. */
        const source: string = metricLines[line];
        return {
          status: 'success',
          value: {
            endLine: startLine + 6,
            lines: ['', '', '', source, '', '', ''],
            path: 'src/metrics.ts',
            startLine,
          },
        };
      },
    };

    /** Holds local test or extraction state. */
    const result = await discoverOtelSignals({ reader, repository });
    expect(result.diagnostics).toEqual([]);
    expect(result.signals.filter(({ kind }) => kind === 'metric_name')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricKind: 'counter', value: 'counter.metric' }),
        expect.objectContaining({ metricKind: 'updown', value: 'updown.metric' }),
        expect.objectContaining({ metricKind: 'histogram', value: 'histogram.metric' }),
        expect.objectContaining({ metricKind: 'gauge', value: 'gauge.metric' }),
        expect.objectContaining({ metricKind: 'updown', value: 'builder.updown' }),
        expect.objectContaining({ metricKind: 'gauge', value: 'builder.gauge' }),
        expect.objectContaining({ metricKind: 'updown', value: 'go.updown' }),
        expect.objectContaining({ metricKind: 'counter', value: 'go.observable.counter' }),
        expect.objectContaining({ metricKind: 'gauge', value: 'go.observable.gauge' }),
        expect.objectContaining({ metricKind: 'counter', value: 'csharp.counter' }),
        expect.objectContaining({ metricKind: 'updown', value: 'csharp.observable.updown' }),
        expect.objectContaining({ metricKind: 'gauge', value: 'direct.gauge' }),
        expect.objectContaining({ metricKind: 'gauge', value: 'csharp.direct.gauge' }),
      ])
    );
  });

  it('discovers Rust in_span instrumentation from a bounded source window', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) =>
        pattern.includes('in_span')
          ? {
              items: [
                {
                  line: 10,
                  path: 'src/telemetry.rs',
                  text: 'tracer.in_span("rust.operation", || work())',
                },
              ],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'success',
        value: {
          endLine: 13,
          lines: ['', '', '', 'tracer.in_span("rust.operation", || work())', '', '', ''],
          path: 'src/telemetry.rs',
          startLine: 7,
        },
      }),
    };

    /** Holds local test or extraction state. */
    const result = await discoverOtelSignals({ reader, repository });
    expect(result.diagnostics).toEqual([]);
    expect(result.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'span_name', value: 'rust.operation' }),
      ])
    );
  });

  it('discovers multiline error status while excluding non-error status calls', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) =>
        pattern === '(setStatus|set_status|SetStatus)'
          ? {
              items: [
                { line: 10, path: 'src/telemetry.ts', text: 'span.setStatus({' },
                {
                  line: 20,
                  path: 'src/telemetry.ts',
                  text: 'span.setStatus({ code: SpanStatusCode.OK })',
                },
              ],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines:
            startLine === 7
              ? ['', '', '', 'span.setStatus({', '  code: SpanStatusCode.ERROR', '})', '']
              : ['', '', '', 'span.setStatus({ code: SpanStatusCode.OK })', '', '', ''],
          path: 'src/telemetry.ts',
          startLine,
        },
      }),
    };

    /** Holds local test or extraction state. */
    const result = await discoverOtelSignals({ reader, repository });
    expect(result.diagnostics).toEqual([]);
    expect(result.signals.filter(({ kind }) => kind === 'error_status')).toEqual([
      expect.objectContaining({ evidence: [expect.objectContaining({ line: 10 })] }),
    ]);
  });

  it('reads sorted OTel discovery windows with bounded concurrency and deterministic output order', async () => {
    /** Holds local test or extraction state. */
    const hits = Array.from({ length: 10 }, (_, index) => ({
      line: index + 10,
      path: 'src/telemetry.ts',
      text: `tracer.startSpan("operation.${index + 1}")`,
    }));
    /** Tracks in-flight source reads to prove the configured worker-pool bound. */
    let activeReads: number = 0;
    /** Retains the highest observed source-read concurrency. */
    let maximumActiveReads: number = 0;
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) =>
        pattern.includes('startSpan')
          ? { items: hits, status: 'complete' }
          : { items: [], status: 'complete' },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => {
        activeReads += 1;
        maximumActiveReads = Math.max(maximumActiveReads, activeReads);
        /** Later source lines finish first to ensure completion order cannot affect output order. */
        await new Promise<void>((resolve) => setTimeout(resolve, 20 - (startLine - 7)));
        activeReads -= 1;
        return {
          status: 'success',
          value: {
            endLine: startLine + 6,
            lines: ['', '', '', `tracer.startSpan("operation.${startLine - 6}")`, '', '', ''],
            path: 'src/telemetry.ts',
            startLine,
          },
        };
      },
    };

    /** Holds local test or extraction state. */
    const result = await discoverOtelSignals({ reader, repository });
    expect(maximumActiveReads).toBeGreaterThan(1);
    expect(maximumActiveReads).toBeLessThanOrEqual(8);
    expect(result.signals.map(({ evidence }) => evidence[0].line)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 10)
    );
  });

  it('masks calls in blocks opened before bounded extraction windows and retains calls after close', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [
              { line: 1, path: 'src/telemetry.ts', text: '/* disabled instrumentation' },
              { line: 12, path: 'src/telemetry.ts', text: '*/' },
            ]
          : pattern.includes('startSpan')
          ? [
              { line: 10, path: 'src/telemetry.ts', text: 'tracer.startSpan("disabled")' },
              { line: 20, path: 'src/telemetry.ts', text: 'tracer.startSpan("enabled")' },
            ]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines:
            startLine === 7
              ? ['', '', '', 'tracer.startSpan("disabled")', '', '*/', '']
              : ['', '', '', 'tracer.startSpan("enabled")', '', '', ''],
          path: 'src/telemetry.ts',
          startLine,
        },
      }),
    };

    /** Holds local test or extraction state. */
    const result = await discoverOtelSignals({ reader, repository });
    expect(result.diagnostics).toEqual([]);
    expect(result.signals.filter(({ kind }) => kind === 'span_name')).toEqual([
      expect.objectContaining({ value: 'enabled' }),
    ]);
  });

  it('discovers .NET RecordException calls through the extraction grep pattern', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '(recordException|record_exception|RecordException|RecordError|record_error)'
            ? [{ line: 10, path: 'src/telemetry.cs', text: 'activity.RecordException(error)' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: ['', '', '', 'activity.RecordException(error)', '', '', ''],
          path: 'src/telemetry.cs',
          startLine,
        },
      }),
    };

    /** Holds local test or extraction state. */
    const result = await discoverOtelSignals({ reader, repository });
    expect(result.diagnostics).toEqual([]);
    expect(result.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'record_exception' })])
    );
  });

  it('retains signals and source failures when independent grep patterns have mixed outcomes', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) =>
        pattern.includes('startSpan')
          ? {
              items: [{ line: 10, path: 'src/telemetry.ts', text: 'tracer.startSpan("checkout")' }],
              status: 'complete',
            }
          : pattern.includes('addEvent')
          ? {
              error: { code: 'source_unavailable', message: 'sandbox timeout', retryable: true },
              status: 'failure',
            }
          : { items: [], status: 'complete' },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'success',
        value: {
          endLine: 13,
          lines: ['', '', '', 'tracer.startSpan("checkout")', '', '', ''],
          path: 'src/telemetry.ts',
          startLine: 7,
        },
      }),
    };

    /** Holds local test or extraction state. */
    const result = await discoverOtelSignals({ reader, repository });
    expect(result.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'span_name', value: 'checkout' })])
    );
    expect(result.diagnostics).toEqual([
      {
        error: { code: 'source_unavailable', message: 'sandbox timeout', retryable: true },
        kind: 'grep',
        pattern: '(addEvent|add_event|AddEvent|ActivityEvent)',
      },
    ]);
  });
});
