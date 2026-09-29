/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractOtelSignalsFromWindows } from './extract_otel_signals';

/** Extracts signals from one-line fixture files with production source paths. */
const extract = (files: Readonly<Record<string, string>>) =>
  extractOtelSignalsFromWindows(
    Object.entries(files).map(([path, content]) => ({ content, path, startLine: 1 }))
  );

/** Verifies pure cross-language OTel signal parsing and source-evidence safeguards. */
describe('extractOtelSignalsFromWindows', () => {
  it('extracts cross-language spans and every metric instrument kind', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/a.cs': 'source.StartActivity("cs.span")',
      'src/a.go': 'tracer.Start(ctx, "go.span")',
      'src/a.py': 'tracer.start_as_current_span("py.span")',
      'src/a.ts': 'tracer.startSpan("ts.span")',
      'src/m.ts': [
        'meter.createCounter("orders.count")',
        'meter.createHistogram("request.duration")',
        'meter.createUpDownCounter("queue.depth")',
        'meter.createObservableGauge("pool.size")',
      ].join('\n'),
      'src/A.java': 'tracer.spanBuilder("java.span")',
    });

    expect(
      signals
        .filter(({ kind }) => kind === 'span_name')
        .map(({ value }) => value)
        .sort()
    ).toEqual(['cs.span', 'go.span', 'java.span', 'py.span', 'ts.span']);
    expect(
      signals
        .filter(({ kind }) => kind === 'metric_name')
        .map(({ metricKind }) => metricKind)
        .sort()
    ).toEqual(['counter', 'gauge', 'histogram', 'updown']);
  });

  it('decodes escaped span, event, and metric literals without executing source', () => {
    /** Preserves source escape spellings so extraction must establish their runtime values. */
    const signals = extract({
      'src/escaped.ts': [
        String.raw`tracer.startSpan("say \"hi\"")`,
        String.raw`span.addEvent("event\\path")`,
        String.raw`meter.createCounter("metric\u002Ecount")`,
        String.raw`span.setAttribute("tenant\u002Eid", value)`,
        String.raw`tracer.startSpan("unknown\q")`,
      ].join('\n'),
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'span_name', value: 'say "hi"' }),
        expect.objectContaining({ kind: 'event_name', value: 'event\\path' }),
        expect.objectContaining({ kind: 'metric_name', value: 'metric.count' }),
        expect.objectContaining({ kind: 'attr_key', templated: true }),
        expect.objectContaining({ kind: 'span_name', templated: true }),
      ])
    );
    expect(signals).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'unknown\\q' }),
        expect.objectContaining({ kind: 'attr_key', value: 'tenant\\u002Eid' }),
      ])
    );
  });

  it('retains non-ASCII Go byte-escape calls as templated evidence', () => {
    /** The Go byte is not safely representable as a Unicode literal without an encoding contract. */
    const signals = extract({
      'src/telemetry.go': String.raw`tracer.Start(ctx, "span\xFF")`,
    });

    expect(signals).toEqual([expect.objectContaining({ kind: 'span_name', templated: true })]);
    expect(signals[0]?.value).toBeUndefined();
  });

  it('ends Go raw OTel literals at the first backtick while retaining JavaScript escaped backticks', () => {
    /** Go raw strings with trailing backslashes must not consume a following literal argument. */
    const goSignals = extract({
      'src/telemetry.go': [
        'tracer.Start(ctx, `span C:\\`, `metadata`)',
        'span.AddEvent(`event C:\\`, `metadata`)',
        'meter.CreateCounter(`metric C:\\`, `metadata`)',
      ].join('\n'),
    });
    /** JavaScript template strings permit an escaped delimiter inside the literal. */
    const typeScriptSignals = extract({
      'src/telemetry.ts': 'tracer.startSpan(`say \\`hi`)',
    });

    expect(goSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'span_name', value: 'span C:\\' }),
        expect.objectContaining({ kind: 'event_name', value: 'event C:\\' }),
        expect.objectContaining({ kind: 'metric_name', value: 'metric C:\\' }),
      ])
    );
    expect(goSignals).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: expect.stringContaining('metadata') }),
      ])
    );
    expect(typeScriptSignals).toEqual([
      expect.objectContaining({ kind: 'span_name', value: 'say `hi' }),
    ]);
  });

  it('does not extract escaped OTel calls from quoted source examples', () => {
    /** Keeps an escaped call inside a source string beside one executable span call. */
    const signals = extract({
      'src/examples.ts': [
        String.raw`const example = "tracer.startSpan(\"not-real\")"`,
        'tracer.startSpan("real")',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'span_name')).toEqual([
      expect.objectContaining({ value: 'real' }),
    ]);
  });

  it('retains dynamic names as templated evidence and filters semantic conventions', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/telemetry.ts': [
        'tracer.startSpan(operationName)',
        'span.addEvent(eventName)',
        'span.addEvent("checkout." + type)',
        'span.addEvent(`checkout.${type}`)',
        'span.setAttributes({ "payment.valid": false, "http.method": method })',
        'meter.createCounter(metricName)',
      ].join('\n'),
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'span_name', templated: true }),
        expect.objectContaining({ kind: 'event_name', templated: true }),
        expect.objectContaining({ kind: 'event_name', templated: true, value: 'checkout' }),
        expect.objectContaining({
          kind: 'metric_name',
          metricKind: 'counter',
          templated: true,
        }),
        expect.objectContaining({ kind: 'attr_key', value: 'payment.valid', valueHint: 'bool' }),
      ])
    );
    expect(signals).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'http.method' })])
    );
  });

  it('retains fully interpolated span, event, and metric names without empty values', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/dynamic.ts': [
        'tracer.startSpan(`${operation}`)',
        'span.addEvent(`${event}`)',
        'meter.createCounter(`${metric}`)',
      ].join('\n'),
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'span_name', templated: true }),
        expect.objectContaining({ kind: 'event_name', templated: true }),
        expect.objectContaining({ kind: 'metric_name', templated: true }),
      ])
    );
    expect(signals.some(({ value }) => value === '')).toBe(false);
  });

  it('extracts error status only from directly attached OTel receivers', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/status.php': [
        '$span->setStatus(StatusCode::ERROR)',
        '$response->setStatus(StatusCode::ERROR)',
        'object.setStatus(StatusCode.ERROR)',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'error_status')).toHaveLength(1);
  });

  it('extracts generic dot-form, Rust enum-variant, and standalone C++ error status codes', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/status.ts': 'span.setStatus(StatusCode.ERROR)',
      'src/status.rs': 'span.set_status(Status::Error { description: "failed" })',
      'src/status.cc': ['span.SetStatus(kError)', 'span.SetStatus(networkErrorCount)'].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'error_status')).toHaveLength(3);
  });

  it('does not treat a quoted error code in an OK status call as an error status', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/status.cs':
        'activity.SetStatus(ActivityStatusCode.Ok, "SpanStatusCode.ERROR was handled")',
    });

    expect(signals.filter(({ kind }) => kind === 'error_status')).toEqual([]);
  });

  it('recognizes otelSpan error status through the shared receiver policy', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/status.ts': 'otelSpan.setStatus({ code: SpanStatusCode.Error })',
    });

    expect(signals.filter(({ kind }) => kind === 'error_status')).toHaveLength(1);
  });

  it('extracts PHP literal event and attribute calls from a direct OTel receiver', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/telemetry.php': '$span->addEvent("paid"); $span->setAttribute("tenant.id", $id);',
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'event_name', value: 'paid' }),
        expect.objectContaining({ kind: 'attr_key', value: 'tenant.id' }),
      ])
    );
  });

  it('retains literal and dynamic Go tracer context-first spans, including qualified receivers', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/telemetry.go': [
        'span := tracer.Start(ctx, operationName)',
        'qualified := otel.Tracer.Start(ctx, "qualified.operation")',
        'factoryLiteral := otel.Tracer("pkg").Start(ctx, "factory.literal")',
        'factoryDynamic := otel.Tracer("pkg").Start(ctx, operationName)',
      ].join('\n'),
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'span_name', templated: true }),
        expect.objectContaining({ kind: 'span_name', value: 'qualified.operation' }),
        expect.objectContaining({ kind: 'span_name', value: 'factory.literal' }),
      ])
    );
  });

  it('does not extract unrelated Go Start calls as spans', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/workers.go': [
        'worker.Start(ctx, "worker")',
        'scheduler.Start(ctx, operationName)',
        'server.Start(ctx, "server")',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'span_name')).toEqual([]);
  });

  it('extracts multiline error status and excludes unrelated non-error status', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/telemetry.ts': [
        'span.setStatus({',
        '  code: SpanStatusCode.ERROR,',
        '})',
        'span.setStatus({ code: SpanStatusCode.OK })',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'error_status')).toHaveLength(1);
  });

  it('attaches multiline fluent error-status evidence to the method source line', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/telemetry.ts': [
        'telemetry.setStatusSpan.span',
        '  .setStatus(SpanStatusCode.ERROR)',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'error_status')).toEqual([
      expect.objectContaining({ evidence: [expect.objectContaining({ line: 2 })] }),
    ]);
  });

  it('keeps literal ActivityEvent wrappers literal and preserves dynamic wrappers once', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/telemetry.cs': [
        'activity.AddEvent(new ActivityEvent("paid"))',
        'activity.AddEvent(new ActivityEvent(eventName))',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'event_name')).toHaveLength(2);
    expect(signals.filter(({ kind }) => kind === 'event_name')[0]).toMatchObject({ value: 'paid' });
    expect(signals.filter(({ kind }) => kind === 'event_name')[0]).not.toHaveProperty('templated');
    expect(signals.filter(({ kind }) => kind === 'event_name')[1]).toMatchObject({
      templated: true,
    });
  });

  it('uses actual match lines and deduplicates calls repeated by overlapping source windows', () => {
    /** Holds local test or extraction state. */
    const signals = extractOtelSignalsFromWindows([
      {
        content: [
          'const tracer = getTracer()',
          'tracer.startSpan("checkout")',
          'span.addEvent("paid")',
        ].join('\n'),
        path: 'src/telemetry.ts',
        startLine: 10,
      },
      {
        content: ['tracer.startSpan("checkout")', 'span.addEvent("paid")', 'return span'].join(
          '\n'
        ),
        path: 'src/telemetry.ts',
        startLine: 11,
      },
    ]);

    expect(signals).toHaveLength(2);
    expect(signals.map((signal) => [signal.kind, signal.evidence[0].line]).sort()).toEqual([
      ['event_name', 12],
      ['span_name', 11],
    ]);
  });

  it('rejects ambiguous receiver calls and non-production paths', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'examples/demo.ts': 'tracer.startSpan("demo")',
      'src/dom.ts': 'element.setAttribute("payment.id", id); emitter.addEvent("payment.changed")',
    });

    expect(signals).toEqual([]);
  });

  it('retains dynamic and concatenated attribute keys without claiming a stable literal key', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/concatenated.ts': 'span.setAttribute("tenant." + tenantId, value)',
      'src/interpolated.ts': 'span.setAttribute(`tenant.${tenantId}`, value)',
      'src/variable.ts': 'span.setAttribute(key, value)',
    });

    expect(signals.filter(({ kind }) => kind === 'attr_key')).toEqual([
      expect.objectContaining({ templated: true }),
      expect.objectContaining({ templated: true }),
      expect.objectContaining({ templated: true }),
    ]);
    expect(signals).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'tenant' })])
    );
  });

  it('retains cross-language and plural dynamic attribute keys as templated evidence', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/concat.ts': 'span.setAttribute(prefix + suffix, value)',
      'src/call.ts': 'span.setAttribute(getKey(), value)',
      'src/python.py': 'span.set_attribute(f"tenant.{tenant_id}", value)',
      'src/csharp.cs': 'span.SetTag($"tenant.{tenantId}", value)',
      'src/map.ts': 'span.setAttributes(attributes)',
      'src/computed.ts': 'span.setAttributes({ [key]: value })',
    });

    expect(signals.filter(({ kind }) => kind === 'attr_key')).toEqual([
      expect.objectContaining({ templated: true }),
      expect.objectContaining({ templated: true }),
      expect.objectContaining({ templated: true }),
      expect.objectContaining({ templated: true }),
      expect.objectContaining({ templated: true }),
      expect.objectContaining({ templated: true }),
    ]);
    expect(signals.some(({ value }) => value !== undefined)).toBe(false);
  });

  it('filters semantic-convention roots in setter, object, and constructor attributes', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/telemetry.ts': [
        'span.setAttribute("service.name", serviceName)',
        'span.setAttribute("app.build_id", buildId)',
        'span.setAttribute("peer.service", peerService)',
        'span.setAttribute("payment.transaction.id", paymentId)',
        'span.setAttributes({ "exception.type": type, "error.type": error, "server.address": host, "feature_flag.key": key, "http.method": method, "db.system": database, "rpc.service": rpc, "net.host.name": host, "messaging.system": broker, "file.path": path, "artifact.type": artifactType, "hw.id": hardwareId, "company.order.id": id })',
      ].join('\n'),
      'src/telemetry.rs':
        'span.set_attribute(KeyValue::new("url.full", requestUrl)); span.set_attribute(KeyValue::new("vcs.repository.url", repositoryUrl)); span.set_attribute(KeyValue::new("security_rule.id", ruleId))',
    });

    expect(signals.filter(({ kind }) => kind === 'attr_key')).toEqual([
      expect.objectContaining({ value: 'payment.transaction.id' }),
      expect.objectContaining({ value: 'company.order.id' }),
    ]);
  });

  it('retains cross-language constructor, interpolation, and PHP dynamic attribute keys', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/a.java': 'span.setAttribute(AttributeKey.stringKey(key), value)',
      'src/a.rs': 'span.set_attribute(KeyValue::new(key, value))',
      'src/a.rb': 'span.set_attribute("tenant.#{id}", value)',
      'src/a.kt': 'span.setAttribute("tenant.${id}", value)',
      'src/a.php': '$span->setAttribute(key, value);',
    });

    expect(signals.filter(({ kind }) => kind === 'attr_key')).toHaveLength(5);
    expect(signals.every(({ templated, value }) => templated === true && value === undefined)).toBe(
      true
    );
  });

  it('requires each ambiguous event and attribute call to have its own OTel receiver', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/mixed.ts': [
        'span.addEvent("real")',
        'element.addEvent("dom")',
        'span.setAttribute("payment.real", true)',
        'element.setAttribute("payment.dom", false)',
        'span.setAttributes({ "payment.object": true })',
        'element.setAttributes({ "payment.object.dom": false })',
      ].join('\n'),
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'event_name', value: 'real' }),
        expect.objectContaining({ kind: 'attr_key', value: 'payment.real' }),
        expect.objectContaining({ kind: 'attr_key', value: 'payment.object' }),
      ])
    );
    expect(signals).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'dom' })])
    );
    expect(signals).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'payment.dom' })])
    );
  });

  it('extracts attribute hints, status, and exceptions from source evidence', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/telemetry.go': [
        'span.SetAttributes(attribute.String("payment.user.id", id), attribute.Bool("payment.feature.enabled", enabled))',
        'span.SetStatus(codes.Error, "failed")',
        'span.RecordError(err)',
      ].join('\n'),
    });

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'attr_key', value: 'payment.user.id', valueHint: 'id' }),
        expect.objectContaining({
          kind: 'attr_key',
          value: 'payment.feature.enabled',
          valueHint: 'bool',
        }),
        expect.objectContaining({ kind: 'error_status' }),
        expect.objectContaining({ kind: 'record_exception' }),
      ])
    );
  });

  it('attaches multiline exception evidence to the call line and deduplicates overlapping windows', () => {
    /** Holds local test or extraction state. */
    const signals = extractOtelSignalsFromWindows([
      {
        content: ['otelSpan', '  .recordException(error)'].join('\n'),
        path: 'src/errors.ts',
        startLine: 20,
      },
      {
        content: ['otelSpan', '  .recordException(error)', 'return otelSpan'].join('\n'),
        path: 'src/errors.ts',
        startLine: 20,
      },
    ]);

    expect(signals.filter(({ kind }) => kind === 'record_exception')).toEqual([
      expect.objectContaining({ evidence: [expect.objectContaining({ line: 21 })] }),
    ]);
  });

  it('rejects inline and block comment exception calls while retaining executable calls', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/errors.py': [
        'work(); // span.recordException(error)',
        'value = 1  # span.record_error(error)',
        '/* span.recordException(error) */',
        'span.recordException(error); // recorded',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'record_exception')).toEqual([
      expect.objectContaining({ evidence: [expect.objectContaining({ line: 4 })] }),
    ]);
  });

  it('extracts signals after inherited comments and multiline strings close', () => {
    /** Holds local test or extraction state. */
    const signals = extractOtelSignalsFromWindows([
      {
        content: '*/\ntracer.startSpan("after-comment")',
        initialCommentState: { blockCommentDepth: 1, inBlockComment: true },
        path: 'src/after_comment.ts',
        startLine: 10,
      },
      {
        content: '"""\nspan.setAttribute("tenant.id", tenantId)',
        initialCommentState: { inBlockComment: false, multilineDelimiter: '"""' },
        path: 'src/after_string.py',
        startLine: 20,
      },
      {
        content: 'tracer.Start(ctx, "quoted")`\ntracer.Start(ctx, "after-raw-string")',
        initialCommentState: { inBlockComment: false, quote: '`' },
        path: 'src/after_raw_string.go',
        startLine: 30,
      },
    ]);

    expect(signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'span_name', value: 'after-comment' }),
        expect.objectContaining({ kind: 'attr_key', value: 'tenant.id' }),
        expect.objectContaining({ kind: 'span_name', value: 'after-raw-string' }),
      ])
    );
  });

  it('preserves TypeScript private-field exception calls without treating hash as a comment', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/private.ts': 'this.#span.recordException(error)',
    });

    expect(signals.filter(({ kind }) => kind === 'record_exception')).toEqual([
      expect.objectContaining({ evidence: [expect.objectContaining({ line: 1 })] }),
    ]);
  });

  it('extracts optional and null-safe receiver exception calls', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/a.ts': [
        'span?.recordException(error)',
        'activity?.RecordException(error)',
        'response?.recordException(error)',
      ].join('\n'),
      'src/a.php': '$span?->recordException($error)',
    });

    expect(signals.filter(({ kind }) => kind === 'record_exception')).toHaveLength(3);
  });

  it('rejects receiver calls written inside ordinary quoted example text', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/examples.ts': [
        'const example = "span.recordException(error)"',
        'span.recordException(error)',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'record_exception')).toHaveLength(1);
  });

  it('extracts exceptions only from directly attached OTel receivers', () => {
    /** Holds local test or extraction state. */
    const signals = extract({
      'src/errors.php': [
        'function record_error(error) {}',
        '// span.recordException(error)',
        'response.recordException(error)',
        '$span->record_exception($error)',
      ].join('\n'),
    });

    expect(signals.filter(({ kind }) => kind === 'record_exception')).toHaveLength(1);
  });
});
