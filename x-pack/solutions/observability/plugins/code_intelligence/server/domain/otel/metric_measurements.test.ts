/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtelSignal } from '../models/otel_signal_codec';
import { extractOtelSignalsFromWindows, type OtelSourceWindow } from './extract_otel_signals';
import {
  attributeKeyBindings,
  extractMetricMeasurements,
  isGroupingDimensionKey,
  metricMeasurementGrepPatterns,
  withMetricDimensions,
} from './metric_measurements';

/** Builds a source window that starts at line 1 of a file. */
const windowOf = (path: string, content: string, startLine: number = 1): OtelSourceWindow => ({
  content,
  path,
  startLine,
});

/** Returns the keys recorded by the measurement call on the first line of a window. */
const keysOf = (path: string, content: string, declarations: string = ''): readonly string[] =>
  extractMetricMeasurements({
    keyBindings: attributeKeyBindings([windowOf(path, declarations)]),
    windows: [windowOf(path, content)],
  }).flatMap(({ keys }) => keys);

/** Extracts signals, links the given measurement windows, and returns each metric's dimensions. */
const dimensionsOf = (
  constructors: readonly OtelSourceWindow[],
  measurements: readonly OtelSourceWindow[]
): Readonly<Record<string, readonly string[] | undefined>> => {
  /** Signals from the constructor windows. */
  const signals: readonly OtelSignal[] = extractOtelSignalsFromWindows(constructors);
  return Object.fromEntries(
    withMetricDimensions({
      measurements: extractMetricMeasurements({
        keyBindings: attributeKeyBindings([...constructors, ...measurements]),
        windows: measurements,
      }),
      signals,
    })
      .filter(({ kind }) => kind === 'metric_name')
      .map(({ dimensions, value }) => [value ?? '', dimensions])
  );
};

describe('metric instrument bindings', () => {
  it.each([
    [
      'src/telemetry.ts',
      'const events = meter.createCounter("bridge.events", { unit: "1" });',
      'events',
    ],
    ['src/telemetry.ts', 'const events: Counter = meter.createCounter("bridge.events");', 'events'],
    ['src/metrics.py', 'self.requests = meter.create_counter("app.requests")', 'requests'],
    ['main.go', 'requests, err := meter.Int64Counter("app.requests")', 'requests'],
    [
      'metadata.go',
      'builder.ReceiverRequests, err = builder.meter.Int64Counter(\n\t\t"otelcol_receiver_requests",',
      'ReceiverRequests',
    ],
    [
      'AdService.java',
      'private static final LongCounter adRequestsCounter =\n      meter\n          .counterBuilder("demo.ad.requests")',
      'adRequestsCounter',
    ],
    [
      'Cart.cs',
      'private static readonly Histogram<double> addItemHistogram = CartMeter.CreateHistogram(\n    "demo.cart.add_item.latency",',
      'addItemHistogram',
    ],
    [
      'email.rb',
      '$confirmation_counter = meter.create_counter("demo.confirmations")',
      'confirmation_counter',
    ],
    [
      'routes.php',
      "$counter ??= Globals::meterProvider()\n    ->getMeter('quotes')\n    ->createCounter('quotes', 'quotes');",
      'counter',
    ],
  ])('records the instrument variable in %s', (path, content, instrument) => {
    expect(
      extractOtelSignalsFromWindows([windowOf(path, content)]).filter(
        ({ kind }) => kind === 'metric_name'
      )
    ).toEqual([expect.objectContaining({ instrument })]);
  });

  it('leaves unassigned and comparison-adjacent constructors without an instrument', () => {
    /** Signals for constructors that are not assigned to a variable. */
    const signals = extractOtelSignalsFromWindows([
      windowOf(
        'src/telemetry.ts',
        'meter.createObservableGauge("process.cpu").addCallback(cb);\nif (x == meter.createCounter("other.count")) {}'
      ),
    ]);
    expect(signals.map(({ instrument }) => instrument)).toEqual([undefined, undefined]);
  });
});

describe('measurement attribute keys', () => {
  it.each([
    [
      'src/telemetry.ts',
      'events.add(1, { "event.name": name, "agent.persona": persona });',
      ['event.name', 'agent.persona'],
    ],
    [
      'src/telemetry.ts',
      'latency.record(ms, {\n  "operation.name": name,\n});',
      ['operation.name'],
    ],
    [
      'src/charge.js',
      "transactionsCounter.add(1, { 'demo.payment.currency': code, kind });",
      ['demo.payment.currency'],
    ],
    ['src/telemetry.ts', 'tokens.add(n, { kind: k, ...common });', ['kind']],
    [
      'server.py',
      "rec_metrics['app.requests'].add(len(items), {'recommendation.type': 'catalog'})",
      ['recommendation.type'],
    ],
    ['routes.php', "$counter->add(1, ['number_of_items' => $n]);", ['number_of_items']],
    [
      'obsreport.go',
      'rec.telemetryBuilder.ReceiverRequests.Add(ctx, 1, rec.otelAttrs, metric.WithAttributeSet(attribute.NewSet(attribute.String("outcome", outcome))))',
      ['outcome'],
    ],
    ['lib.rs', 'counter.add(1, &[KeyValue::new("request.kind", kind)]);', ['request.kind']],
    [
      'Store.cs',
      'histogram.Record(seconds, new KeyValuePair<string, object?>("cache.result", hit), new("op.type", op));',
      ['cache.result', 'op.type'],
    ],
    [
      'Store.cs',
      'histogram.Record(seconds, new TagList { { "cache.result", hit } });',
      ['cache.result'],
    ],
  ])('reads the keys of a %s measurement', (path, content, keys) => {
    expect(keysOf(path, content)).toEqual(keys);
  });

  it('resolves attribute keys declared once and referenced by variable', () => {
    expect(
      keysOf(
        'AdService.java',
        'adRequestsCounter.add(\n    1,\n    Attributes.of(\n        adRequestTypeKey, type.name(), adResponseTypeKey, response.name()));',
        'private static final AttributeKey<String> adRequestTypeKey =\n    AttributeKey.stringKey("demo.ad.request_type");\nprivate static final AttributeKey<String> adResponseTypeKey =\n    AttributeKey.stringKey("demo.ad.response_type");'
      )
    ).toEqual(['demo.ad.request_type', 'demo.ad.response_type']);
  });

  it('ignores bare object keys in languages where they are expressions', () => {
    expect(keysOf('server.py', 'counter.add(1, {kind: value})')).toEqual([]);
  });

  it('ignores commented-out and quoted measurement calls', () => {
    expect(
      extractMetricMeasurements({
        keyBindings: new Map(),
        windows: [
          windowOf('src/a.ts', '// events.add(1, { "event.name": name });'),
          windowOf('src/b.ts', 'log("events.add(1, { \\"event.name\\": name })");'),
        ],
      })
    ).toEqual([]);
  });

  it('reads only the call on the first line of a window', () => {
    expect(
      extractMetricMeasurements({
        keyBindings: new Map(),
        windows: [windowOf('src/a.ts', 'events.add(1);\nevents.add(1, { "event.name": n });', 7)],
      })
    ).toEqual([{ keys: [], line: 7, path: 'src/a.ts', receiver: { instrument: 'events' } }]);
  });
});

describe('grouping dimension keys', () => {
  it.each([
    'event.name',
    'operation.name',
    'usage.kind',
    'demo.ad.request_type',
    'recommendation.type',
    'outcome',
    'http.response.status_code',
    'tool.status',
  ])('groups by %s', (key) => {
    expect(isGroupingDimensionKey(key)).toBe(true);
  });

  it.each([
    'agent.persona',
    'session.id',
    'message.text',
    'content.sha256',
    'number_of_items',
    'user.name',
    'file_name',
    'request.duration',
  ])('does not group by %s', (key) => {
    expect(isGroupingDimensionKey(key)).toBe(false);
  });
});

describe('withMetricDimensions', () => {
  it('adds grouping keys from same-file measurements, in source order and without duplicates', () => {
    /** Constructors and measurements share one TypeScript file. */
    const path = 'src/telemetry.ts';
    expect(
      dimensionsOf(
        [
          windowOf(
            path,
            'const events = meter.createCounter("bridge.events");\nconst tokens = meter.createCounter("bridge.usage.tokens");\nconst cost = meter.createCounter("bridge.usage.cost");'
          ),
        ],
        [
          windowOf(path, 'events.add(1, { "event.name": name, "agent.persona": persona });', 405),
          windowOf(path, 'tokens.add(n, { "usage.kind": kind, "agent.persona": persona });', 414),
          windowOf(path, 'cost.add(n, { "agent.persona": persona });', 421),
          windowOf(path, 'events.add(1, { "event.name": `tool.${status}` });', 480),
        ]
      )
    ).toEqual({
      'bridge.events': ['event.name'],
      'bridge.usage.cost': undefined,
      'bridge.usage.tokens': ['usage.kind'],
    });
  });

  it('links a cross-file call only when the instrument variable name is unique', () => {
    expect(
      dimensionsOf(
        [
          windowOf(
            'a/metadata.go',
            'b.ReceiverRequests, err = b.meter.Int64Counter("receiver.requests")'
          ),
          windowOf('a/one.go', 'counter, err := meter.Int64Counter("one.count")'),
          windowOf('b/two.go', 'counter, err := meter.Int64Counter("two.count")'),
        ],
        [
          windowOf(
            'a/obsreport.go',
            'r.tb.ReceiverRequests.Add(ctx, 1, metric.WithAttributes(attribute.String("outcome", o)))'
          ),
          windowOf(
            'c/other.go',
            'counter.Add(ctx, 1, metric.WithAttributes(attribute.String("op.type", t)))'
          ),
        ]
      )
    ).toEqual({ 'one.count': undefined, 'receiver.requests': ['outcome'], 'two.count': undefined });
  });

  it('links a call that looks the instrument up by its metric name', () => {
    expect(
      dimensionsOf(
        [windowOf('metrics.py', 'requests = meter.create_counter("app.requests")')],
        [
          windowOf(
            'server.py',
            'metrics["app.requests"].add(n, {"recommendation.type": "catalog"})'
          ),
        ]
      )
    ).toEqual({ 'app.requests': ['recommendation.type'] });
  });

  it('caps the number of grouping keys', () => {
    expect(
      dimensionsOf(
        [windowOf('src/m.ts', 'const ops = meter.createCounter("ops")')],
        [
          windowOf(
            'src/m.ts',
            'ops.add(1, { "a.name": a, "b.kind": b, "c.type": c, "d.status": d });',
            9
          ),
        ]
      )
    ).toEqual({ ops: ['a.name', 'b.kind', 'c.type'] });
  });
});

describe('metricMeasurementGrepPatterns', () => {
  it('builds no pattern when no literal metric was found', () => {
    expect(
      metricMeasurementGrepPatterns(
        extractOtelSignalsFromWindows([windowOf('src/m.ts', 'const c = meter.createCounter(name)')])
      )
    ).toEqual([]);
  });

  it('searches for instrument variables and metric-name lookups', () => {
    expect(
      metricMeasurementGrepPatterns(
        extractOtelSignalsFromWindows([
          windowOf('src/m.ts', 'const events = meter.createCounter("bridge.events")'),
        ])
      )
    ).toEqual([
      '(^|[^A-Za-z0-9_])(events)[[:space:]]*([?]?[.]|->)[[:space:]]*(add|Add|record|Record)[[:space:]]*[(]',
      '[[]["\'`](bridge[.]events)["\'`][]][[:space:]]*([?]?[.]|->)[[:space:]]*(add|Add|record|Record)[[:space:]]*[(]',
    ]);
  });

  it('splits many instruments across patterns within the length limit', () => {
    /** 300 distinct instruments, too many for one pattern. */
    const content: string = Array.from(
      { length: 300 },
      (_, index) => `const instrument_${index} = meter.createCounter("metric.${index}")`
    ).join('\n');
    /** Patterns for every instrument variable and metric name. */
    const patterns = metricMeasurementGrepPatterns(
      extractOtelSignalsFromWindows([windowOf('src/m.ts', content)])
    );
    expect(patterns.length).toBeGreaterThan(2);
    expect(patterns.every((pattern) => pattern.length <= 2_048)).toBe(true);
    expect(patterns.join('\n')).toContain('instrument_299');
    expect(patterns.join('\n')).toContain('metric[.]299');
  });
});
