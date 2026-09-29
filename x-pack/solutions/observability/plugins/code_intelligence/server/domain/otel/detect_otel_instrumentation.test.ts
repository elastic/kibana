/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import { detectOtelInstrumentation } from './detect_otel_instrumentation';

/** Provides one immutable repository identity for instrumentation-gate tests. */
const repository: ResolvedRepository = {
  commitSha: '0123456789012345678901234567890123456789',
  repository: 'elastic/example',
  requestedRevision: 'main',
};

/** Verifies the repository-wide OTel gate preserves ambiguity and source-failure boundaries. */
describe('detectOtelInstrumentation', () => {
  it('counts production imports while excluding ambiguous DOM receiver calls', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '@opentelemetry/'
            ? [
                {
                  line: 1,
                  path: 'src/telemetry.ts',
                  text: "import { trace } from '@opentelemetry/api'",
                },
              ]
            : pattern === 'setAttribute'
            ? [{ line: 2, path: 'src/dom.ts', text: 'element.setAttribute("role", "status")' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ path, startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: ['', '', '', 'element.setAttribute("role", "status")', '', '', ''],
          path,
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 1, set_attribute: 0 } },
      diagnostics: [],
    });
  });

  it('does not treat an import-looking string as instrumentation while retaining a real OTel import', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '@opentelemetry/'
            ? [
                {
                  line: 1,
                  path: 'src/example.ts',
                  text: 'const example = "import \'@opentelemetry/api\'"',
                },
                {
                  line: 2,
                  path: 'src/telemetry.ts',
                  text: "import { trace } from '@opentelemetry/api'",
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 1 } },
      diagnostics: [],
    });
  });

  it('does not treat a TypeScript local import named opentelemetry as OTel instrumentation', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '[oO]pen[Tt]elemetry'
            ? [
                {
                  line: 1,
                  path: 'src/local.ts',
                  text: 'import opentelemetry from "./local"',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: false, signalCounts: { instrumentation_other: 0 } },
      diagnostics: [],
    });
  });

  it('counts an executable JavaScript import continuation while rejecting a quoted example', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '@opentelemetry/'
            ? [
                {
                  line: 2,
                  path: 'src/telemetry.ts',
                  text: '  from "@opentelemetry/api"',
                },
                {
                  line: 3,
                  path: 'src/telemetry.ts',
                  text: '} from "@opentelemetry/api"',
                },
                {
                  line: 4,
                  path: 'src/example.ts',
                  text: 'const example = "from \\"@opentelemetry/api\\""',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 2 } },
      diagnostics: [],
    });
  });

  it('matches valid JavaScript, Python, Java, Kotlin, Scala, C#, Rust, PHP, and grouped Go imports', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '@opentelemetry/'
            ? [
                {
                  line: 1,
                  path: 'src/telemetry.ts',
                  text: "import { trace } from '@opentelemetry/api'",
                },
              ]
            : pattern === 'go[.]opentelemetry[.]io'
            ? [
                {
                  line: 2,
                  path: 'src/telemetry.go',
                  text: 'import otel "go.opentelemetry.io/otel"',
                },
              ]
            : pattern === '[oO]pen[Tt]elemetry'
            ? [
                {
                  line: 3,
                  path: 'src/Telemetry.cs',
                  text: 'using OpenTelemetry.Trace;',
                },
                {
                  line: 4,
                  path: 'src/telemetry.rs',
                  text: 'use opentelemetry::trace::Tracer;',
                },
                {
                  line: 5,
                  path: 'src/telemetry.py',
                  text: 'from opentelemetry.instrumentation.requests import RequestsInstrumentor',
                },
                {
                  line: 6,
                  path: 'src/Telemetry.java',
                  text: 'import io.opentelemetry.api.trace.Tracer;',
                },
                {
                  line: 7,
                  path: 'src/Telemetry.java',
                  text: 'import static io.opentelemetry.api.common.AttributeKey.*;',
                },
                {
                  line: 8,
                  path: 'src/telemetry.php',
                  text: 'use OpenTelemetry\\API\\Trace\\Tracer;',
                },
                {
                  line: 9,
                  path: 'src/Telemetry.kt',
                  text: 'import io.opentelemetry.api.trace.Tracer',
                },
                {
                  line: 10,
                  path: 'src/Telemetry.scala',
                  text: 'import io.opentelemetry.api.trace.{Tracer, Span}',
                },
                {
                  line: 11,
                  path: 'src/Telemetry.kt',
                  text: 'import io.opentelemetry.api.trace.* // SDK tracing',
                },
                {
                  line: 12,
                  path: 'src/Telemetry.scala',
                  text: 'import io.opentelemetry.api.trace.Tracer as OtelTracer, foo.Bar // SDK tracing',
                },
                {
                  line: 13,
                  path: 'src/Telemetry.scala',
                  text: 'import io.opentelemetry.api.trace.*, foo.Bar',
                },
                {
                  line: 14,
                  path: 'src/Telemetry.scala',
                  text: 'import foo.Bar, io.opentelemetry.api.trace.Tracer',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 14 } },
      diagnostics: [],
    });
  });

  it('rejects Kotlin and Scala package prefixes that only resemble OpenTelemetry', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '[oO]pen[Tt]elemetry'
            ? [
                {
                  line: 1,
                  path: 'src/local.kt',
                  text: 'import io.opentelemetryx.Local',
                },
                {
                  line: 2,
                  path: 'src/local.scala',
                  text: 'import io.opentelemetry_fake.Local',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: false, signalCounts: { instrumentation_other: 0 } },
      diagnostics: [],
    });
  });

  it('counts official Rust OTel crate imports while rejecting unrelated lookalikes', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '[oO]pen[Tt]elemetry'
            ? [
                {
                  line: 1,
                  path: 'src/telemetry.rs',
                  text: 'use opentelemetry_sdk::trace::SdkTracerProvider;',
                },
                {
                  line: 2,
                  path: 'src/http.rs',
                  text: 'use opentelemetry_http::HeaderExtractor;',
                },
                {
                  line: 3,
                  path: 'src/sdk_alias.rs',
                  text: 'use opentelemetry_sdk as sdk;',
                },
                {
                  line: 4,
                  path: 'src/http_alias.rs',
                  text: 'use opentelemetry_http as http;',
                },
                {
                  line: 5,
                  path: 'src/otlp_alias.rs',
                  text: 'use opentelemetry_otlp as otlp;',
                },
                {
                  line: 6,
                  path: 'src/absolute.rs',
                  text: 'use ::opentelemetry::trace::Tracer;',
                },
                {
                  line: 7,
                  path: 'src/grouped.rs',
                  text: 'use {opentelemetry::trace::Tracer, opentelemetry_sdk as sdk};',
                },
                {
                  line: 8,
                  path: 'src/tracing.rs',
                  text: 'use tracing_opentelemetry::OpenTelemetrySpanExt;',
                },
                {
                  line: 9,
                  path: 'src/local.rs',
                  text: 'use opentelemetry_fake::Tracer;',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 8 } },
      diagnostics: [],
    });
  });

  it('counts approved Rust grouped-use entries only inside exact bounded executable context', async () => {
    /** Records every grouped-use proof request for its SourceReader bounds assertion. */
    const windowRequests: {
      readonly endLine: number;
      readonly path: string;
      readonly startLine: number;
    }[] = [];
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '[oO]pen[Tt]elemetry'
            ? [
                {
                  line: 1,
                  path: 'src/same_line.rs',
                  text: 'use {std::time::Instant, opentelemetry::trace::Tracer};',
                },
                {
                  line: 3,
                  path: 'src/multiline.rs',
                  text: 'opentelemetry_sdk::trace::SdkTracerProvider,',
                },
                {
                  line: 1,
                  path: 'src/nested.rs',
                  text: 'use {foo::{opentelemetry::trace::Tracer}};',
                },
                {
                  line: 1,
                  path: 'src/later_top_level.rs',
                  text: 'pub(crate) use {foo::{opentelemetry::trace::Tracer}, opentelemetry_sdk::trace::SdkTracerProvider};',
                },
                {
                  line: 1,
                  path: 'src/context_free.rs',
                  text: 'opentelemetry::trace::Tracer,',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ endLine, path, startLine }) => {
        windowRequests.push({ endLine, path, startLine });
        /** Returns exactly the requested bounded use-group context for each candidate path. */
        const lines: readonly string[] =
          path === 'src/same_line.rs'
            ? ['use {std::time::Instant, opentelemetry::trace::Tracer};']
            : path === 'src/multiline.rs'
            ? ['use {', '  std::time::Instant,', '  opentelemetry_sdk::trace::SdkTracerProvider,']
            : path === 'src/nested.rs'
            ? ['use {foo::{opentelemetry::trace::Tracer}};']
            : path === 'src/later_top_level.rs'
            ? [
                'pub(crate) use {foo::{opentelemetry::trace::Tracer}, opentelemetry_sdk::trace::SdkTracerProvider};',
              ]
            : ['opentelemetry::trace::Tracer,'];
        return { status: 'success', value: { endLine, lines, path, startLine } };
      },
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 3 } },
      diagnostics: [],
    });
    expect(windowRequests).toEqual([
      { endLine: 1, path: 'src/same_line.rs', startLine: 1 },
      { endLine: 3, path: 'src/multiline.rs', startLine: 1 },
      { endLine: 1, path: 'src/nested.rs', startLine: 1 },
      { endLine: 1, path: 'src/later_top_level.rs', startLine: 1 },
      { endLine: 1, path: 'src/context_free.rs', startLine: 1 },
    ]);
  });

  it('counts a direct Go alias import as OTel instrumentation', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'go[.]opentelemetry[.]io'
            ? [
                {
                  line: 1,
                  path: 'src/telemetry.go',
                  text: 'import otel "go.opentelemetry.io/otel"',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 1 } },
      diagnostics: [],
    });
  });

  it('counts direct OTel idioms without imports while rejecting unrelated object calls', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'setAttribute'
            ? [
                {
                  line: 1,
                  path: 'src/telemetry.php',
                  text: '$span->setAttribute("tenant.id", $id)',
                },
                { line: 2, path: 'src/dom.php', text: '$element->setAttribute("role", "status")' },
              ]
            : pattern === 'addEvent'
            ? [
                { line: 3, path: 'src/telemetry.php', text: '$span->addEvent("paid")' },
                { line: 4, path: 'src/dom.php', text: '$emitter->addEvent("ignored")' },
              ]
            : pattern === 'setStatus'
            ? [
                { line: 5, path: 'src/telemetry.php', text: '$span->setStatus(StatusCode::ERROR)' },
                {
                  line: 6,
                  path: 'src/telemetry.rs',
                  text: 'span.set_status(Status::Error { description: "failed" })',
                },
                { line: 7, path: 'src/http.php', text: '$response->setStatus(500)' },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ path, startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: ['', '', '', '$response->setStatus(500)', '', '', ''],
          path,
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: {
        hasOtel: true,
        signalCounts: { add_event: 1, set_attribute: 1, set_status_error: 2 },
      },
      diagnostics: [],
    });
  });

  it('counts multiline OTel ambiguous calls while rejecting mixed-window unrelated calls', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'startSpan'
            ? [{ line: 10, path: 'src/a.ts', text: 'tracer.startSpan("operation")' }]
            : pattern === 'setAttribute'
            ? [
                { line: 20, path: 'src/a.ts', text: '.setAttribute("tenant.id", id)' },
                { line: 30, path: 'src/a.ts', text: 'element.setAttribute("ignored", id)' },
              ]
            : pattern === 'addEvent'
            ? [{ line: 40, path: 'src/a.ts', text: '.AddEvent("paid")' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines:
            startLine === 17
              ? ['', '', 'span', '  .setAttribute("tenant.id", id)', '', '', '']
              : startLine === 37
              ? ['', '', 'activity', '  .AddEvent("paid")', '', '', '']
              : ['', '', '', 'element.setAttribute("ignored", id)', 'span = currentSpan()', '', ''],
          path: 'src/a.ts',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { add_event: 1, set_attribute: 1, start_span: 1 } },
      diagnostics: [],
    });
  });

  it('does not treat unrelated Go Start calls as OTel spans', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '[.]Start[(]'
            ? [
                { line: 1, path: 'src/workers.go', text: 'worker.Start(ctx, "worker")' },
                { line: 2, path: 'src/workers.go', text: 'scheduler.Start(ctx, "scheduler")' },
                { line: 3, path: 'src/workers.go', text: 'server.Start(ctx, "server")' },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: false, signalCounts: { start_span: 0 } },
      diagnostics: [],
    });
  });

  it('proves multiline OTel error status through bounded windows and reports window failures', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'setStatus'
            ? [
                { line: 10, path: 'src/a.ts', text: 'span.setStatus({' },
                { line: 20, path: 'src/a.ts', text: 'response.setStatus(200)' },
                { line: 30, path: 'src/a.ts', text: 'span.setStatus({' },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) =>
        startLine === 27
          ? {
              status: 'failure',
              error: { code: 'timeout', message: 'window timeout', retryable: true },
            }
          : {
              status: 'success',
              value: {
                endLine: startLine + 6,
                lines:
                  startLine === 7
                    ? ['', '', '', 'span.setStatus({', ' code: SpanStatusCode.ERROR', '})', '']
                    : ['', '', '', 'response.setStatus(200)', '', '', ''],
                path: 'src/a.ts',
                startLine,
              },
            },
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { set_status_error: 1 } },
      diagnostics: [expect.objectContaining({ kind: 'window', line: 30, path: 'src/a.ts' })],
    });
  });

  it('rejects an OK status whose message only describes an error code', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'SetStatus'
            ? [
                {
                  line: 1,
                  path: 'src/status.cs',
                  text: 'activity.SetStatus(ActivityStatusCode.Ok, "SpanStatusCode.ERROR was handled")',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ path, startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: [
            '',
            '',
            '',
            'activity.SetStatus(ActivityStatusCode.Ok, "SpanStatusCode.ERROR was handled")',
            '',
            '',
            '',
          ],
          path,
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: false, signalCounts: { set_status_error: 0 } },
      diagnostics: [],
    });
  });

  it('recognizes generic dot-form error status codes on an OTel receiver', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'setStatus'
            ? [
                {
                  line: 1,
                  path: 'src/status.ts',
                  text: 'span.setStatus(StatusCode.ERROR)',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: false, signalCounts: { set_status_error: 1 } },
      diagnostics: [],
    });
  });

  it('counts direct createGauge and CreateGauge metric constructors', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('Gauge')
          ? [
              { line: 1, path: 'src/a.ts', text: 'meter.createGauge("direct.gauge")' },
              { line: 2, path: 'src/a.cs', text: 'meter.CreateGauge<long>("csharp.gauge")' },
            ]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { create_metric: 2 } },
      diagnostics: [],
    });
  });

  it('counts case-compatible .NET gRPC instrumentation imports', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '[oO]pen[Tt]elemetry[.]Instrumentation[.]Grpc'
            ? [
                {
                  line: 1,
                  path: 'src/Telemetry.cs',
                  text: 'using OpenTelemetry.Instrumentation.Grpc;',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_grpc: 1 } },
      diagnostics: [],
    });
  });

  it('counts complete Go grouped-import module paths only with executable import context', async () => {
    /** Records each grouped-import proof request for its source-window contract assertion. */
    const windowRequests: {
      readonly endLine: number;
      readonly path: string;
      readonly startLine: number;
    }[] = [];
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'go[.]opentelemetry[.]io'
            ? [
                { line: 2, path: 'src/telemetry.go', text: 'otel "go.opentelemetry.io/otel"' },
                { line: 1, path: 'src/quoted.go', text: '"go.opentelemetry.io/otel"' },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ endLine, path, startLine }) => {
        windowRequests.push({ endLine, path, startLine });
        /** Returns the context-exclusive closing-delimiter window for each requested source path. */
        const lines: readonly string[] =
          path === 'src/telemetry.go'
            ? ['import (', 'otel "go.opentelemetry.io/otel"']
            : ['"go.opentelemetry.io/otel"'];
        return {
          status: 'success',
          value: { endLine, lines, path, startLine },
        };
      },
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 1 } },
      diagnostics: [],
    });
    expect(windowRequests).toEqual([
      { endLine: 2, path: 'src/telemetry.go', startLine: 1 },
      { endLine: 1, path: 'src/quoted.go', startLine: 1 },
    ]);
  });

  it('accepts commented Go grouped-import entries but rejects hits inside inherited block comments', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ path, pattern }) =>
        path === 'src/commented.go'
          ? {
              items: [{ line: 1, path, text: '/* imports disabled' }],
              status: 'complete',
            }
          : {
              items:
                pattern === 'go[.]opentelemetry[.]io'
                  ? [
                      {
                        line: 2,
                        path: 'src/telemetry.go',
                        text: '_ "go.opentelemetry.io/otel" // telemetry',
                      },
                      {
                        line: 2,
                        path: 'src/commented.go',
                        text: '"go.opentelemetry.io/otel"',
                      },
                    ]
                  : [],
              status: 'complete',
            },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ endLine, path, startLine }) => ({
        status: 'success',
        value: {
          endLine,
          lines: ['import (', '_ "go.opentelemetry.io/otel" // telemetry'],
          path,
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 1 } },
      diagnostics: [],
    });
  });

  it('counts a blank Go otelhttp import as HTTP instrumentation', async () => {
    /** Records the bounded source proof request for its exact import-group context. */
    const windowRequests: {
      readonly endLine: number;
      readonly path: string;
      readonly startLine: number;
    }[] = [];
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'otelhttp'
            ? [
                {
                  line: 2,
                  path: 'src/http.go',
                  text: '_ "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ endLine, path, startLine }) => {
        windowRequests.push({ endLine, path, startLine });
        /** Returns the preceding import-group opener and the requested blank import hit. */
        const lines: readonly string[] = [
          'import (',
          '_ "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"',
        ];
        return { status: 'success', value: { endLine, lines, path, startLine } };
      },
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: {
        hasOtel: true,
        signalCounts: { instrumentation_http: 1, instrumentation_other: 0 },
      },
      diagnostics: [],
    });
    expect(windowRequests).toEqual([{ endLine: 2, path: 'src/http.go', startLine: 1 }]);
  });

  it('counts each restored HTTP instrumentation ecosystem pattern once', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'instrumentation[-./](http|fetch|requests|urllib3|aspnetcore|sinatra)'
            ? [
                { line: 1, path: 'src/a.ts', text: 'import "instrumentation-fetch"' },
                { line: 2, path: 'src/a.py', text: 'import instrumentation.requests' },
                { line: 3, path: 'src/a.py', text: 'import instrumentation/urllib3' },
                {
                  line: 4,
                  path: 'src/a.cs',
                  text: 'using OpenTelemetry.Instrumentation.AspNetCore;',
                },
                { line: 5, path: 'src/a.rb', text: 'require "instrumentation.sinatra"' },
                {
                  line: 6,
                  path: 'src/a.ts',
                  text: 'const packageName = "instrumentation-http"',
                },
                {
                  line: 7,
                  path: 'src/a.ts',
                  text: 'import { x } from "./x"; const packageName = "instrumentation-http"',
                },
                {
                  line: 8,
                  path: 'src/a.ts',
                  text: 'const enabled = require("./config") ? "instrumentation-http" : "none"',
                },
                {
                  line: 9,
                  path: 'src/a.ts',
                  text: 'import("./config").then(() => "instrumentation-http")',
                },
                { line: 10, path: 'src/a.ts', text: 'require("instrumentation-http")' },
              ]
            : pattern === '[oO]pen[Tt]elemetry[.]Instrumentation[.](Http|AspNetCore)'
            ? [
                { line: 11, path: 'src/b.cs', text: 'using OpenTelemetry.Instrumentation.Http;' },
                {
                  line: 12,
                  path: 'src/b.cs',
                  text: 'using OpenTelemetry.Instrumentation.AspNetCore;',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { instrumentation_http: 8 } },
      diagnostics: [],
    });
  });

  it('recognizes Rust in_span calls as OTel span sites', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'in_span'
            ? [
                { line: 1, path: 'src/telemetry.rs', text: 'tracer.in_span("one", || work())' },
                { line: 2, path: 'src/telemetry.rs', text: 'tracer.in_span("two", || work())' },
                { line: 3, path: 'src/telemetry.rs', text: 'tracer.in_span("three", || work())' },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { start_span: 3 } },
      diagnostics: [],
    });
  });

  it('recognizes Go tracer factory receivers as OTel Start sites', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === '[.]Start[(]'
            ? [
                {
                  line: 1,
                  path: 'src/telemetry.go',
                  text: 'otel.Tracer("pkg").Start(ctx, "literal")',
                },
                {
                  line: 2,
                  path: 'src/telemetry.go',
                  text: 'otel.Tracer("pkg").Start(ctx, operationName)',
                },
                {
                  line: 3,
                  path: 'src/telemetry.go',
                  text: 'otel.Tracer("other").Start(ctx, "third")',
                },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { start_span: 3 } },
      diagnostics: [],
    });
  });

  it('retains a successful pattern gate result and diagnostics when another pattern fails', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) =>
        pattern === '@opentelemetry/'
          ? {
              items: [
                {
                  line: 1,
                  path: 'src/telemetry.ts',
                  text: "import { trace } from '@opentelemetry/api'",
                },
              ],
              status: 'complete',
            }
          : pattern === 'otelgrpc'
          ? {
              error: { code: 'timeout', message: 'source search timed out', retryable: true },
              status: 'failure',
            }
          : { items: [], status: 'complete' },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toEqual({
      detection: {
        hasOtel: true,
        signalCounts: {
          add_event: 0,
          create_metric: 0,
          instrumentation_grpc: 0,
          instrumentation_http: 0,
          instrumentation_other: 1,
          record_exception: 0,
          set_attribute: 0,
          set_status_error: 0,
          start_span: 0,
        },
      },
      diagnostics: [
        {
          error: { code: 'timeout', message: 'source search timed out', retryable: true },
          kind: 'grep',
          pattern: 'otelgrpc',
        },
      ],
    });
  });

  it('recognizes config-only OTEL instrumentation through the Git ERE pattern', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'OTEL_[A-Z0-9_]+'
            ? [{ line: 1, path: 'config/otel.yaml', text: 'OTEL_SERVICE_NAME: checkout' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: true, signalCounts: { instrumentation_other: 1 } },
      diagnostics: [],
    });
  });

  it('does not read or count non-production fallback hits', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'setAttribute'
            ? [{ line: 4, path: 'examples/demo.ts', text: '.setAttribute("tenant.id", id)' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'success',
        value: {
          endLine: 7,
          lines: ['span', '.setAttribute("tenant.id", id)', '', ''],
          path: 'examples/demo.ts',
          startLine: 1,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { set_attribute: 0 } },
      diagnostics: [],
    });
  });

  it('correlates fallback validation to the triggering hit instead of nearby OTel calls', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'setAttribute'
            ? [{ line: 10, path: 'src/a.ts', text: 'element.setAttribute("ignored", id)' }]
            : pattern === 'setStatus'
            ? [{ line: 20, path: 'src/a.ts', text: 'response.setStatus(500)' }]
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
              ? [
                  '',
                  '',
                  '',
                  'element.setAttribute("ignored", id)',
                  'span.setAttribute("real", id)',
                  '',
                  '',
                ]
              : [
                  '',
                  '',
                  '',
                  'response.setStatus(500)',
                  'span.setStatus({ code: SpanStatusCode.ERROR })',
                  '',
                  '',
                ],
          path: 'src/a.ts',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { set_attribute: 0, set_status_error: 0 } },
      diagnostics: [],
    });
  });

  it('limits error markers to the triggering status call arguments', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'setStatus'
            ? [
                {
                  line: 10,
                  path: 'src/a.ts',
                  text: 'span.setStatus({ code: SpanStatusCode.OK }); // Error is handled elsewhere',
                },
                {
                  line: 20,
                  path: 'src/a.ts',
                  text: 'span.setStatus({ code: SpanStatusCode.OK });',
                },
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
              ? [
                  '',
                  '',
                  '',
                  'span.setStatus({ code: SpanStatusCode.OK }); // Error is handled elsewhere',
                  '',
                  '',
                  '',
                ]
              : [
                  '',
                  '',
                  '',
                  'span.setStatus({ code: SpanStatusCode.OK });',
                  'const Error = handledElsewhere;',
                  '',
                  '',
                ],
          path: 'src/a.ts',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { set_status_error: 0 } },
      diagnostics: [],
    });
  });

  it('correlates fallback error arguments to the triggering status hit instead of an adjacent call', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? []
          : pattern === 'setStatus'
          ? [
              { line: 10, path: 'src/a.ts', text: 'span.setStatus(SpanStatusCode.OK)' },
              { line: 11, path: 'src/a.ts', text: 'span.setStatus(SpanStatusCode.ERROR)' },
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
              ? [
                  '',
                  '',
                  '',
                  'span.setStatus(SpanStatusCode.OK)',
                  'span.setStatus(SpanStatusCode.ERROR)',
                  '',
                  '',
                ]
              : ['', '', '', 'span.setStatus(SpanStatusCode.ERROR)', '', '', ''],
          path: 'src/a.ts',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { set_status_error: 1 } },
      diagnostics: [],
    });
  });

  it('anchors fluent status arguments at the hit line instead of a prior receiver-line call', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? []
          : pattern === 'setStatus'
          ? [
              { line: 10, path: 'src/a.ts', text: 'span.setStatus(SpanStatusCode.ERROR); span' },
              { line: 11, path: 'src/a.ts', text: '.setStatus(SpanStatusCode.OK)' },
              { line: 20, path: 'src/a.ts', text: 'span.setStatus(SpanStatusCode.OK); span' },
              { line: 21, path: 'src/a.ts', text: '.setStatus(SpanStatusCode.ERROR)' },
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
              ? ['', '', '', 'span.setStatus(SpanStatusCode.ERROR); span', '', '', '']
              : startLine === 8
              ? [
                  '',
                  '',
                  'span.setStatus(SpanStatusCode.ERROR); span',
                  '.setStatus(SpanStatusCode.OK)',
                  '',
                  '',
                  '',
                ]
              : startLine === 17
              ? ['', '', '', 'span.setStatus(SpanStatusCode.OK); span', '', '', '']
              : [
                  '',
                  '',
                  'span.setStatus(SpanStatusCode.OK); span',
                  '.setStatus(SpanStatusCode.ERROR)',
                  '',
                  '',
                  '',
                ],
          path: 'src/a.ts',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { set_status_error: 2 } },
      diagnostics: [],
    });
  });

  it('counts a multiline continuation only when it belongs to the triggering OTel hit', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'setStatus'
            ? [{ line: 10, path: 'src/a.ts', text: 'otelSpan.setStatus({' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: ['', '', '', 'otelSpan.setStatus({', ' code: SpanStatusCode.Error', '})', ''],
          path: 'src/a.ts',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { set_status_error: 1 } },
      diagnostics: [],
    });
  });

  it('counts multiline exception calls with an OTel receiver on the preceding line', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'recordException'
            ? [{ line: 10, path: 'src/a.ts', text: '.recordException(error)' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: ['', '', 'otelSpan', '.recordException(error)', '', '', ''],
          path: 'src/a.ts',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 1 } },
      diagnostics: [],
    });
  });

  it('rejects inline and block comment exception calls while retaining executable calls', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'recordException'
            ? [
                {
                  line: 1,
                  path: 'src/a.ts',
                  text: 'work(); // span.recordException(error)',
                },
                { line: 2, path: 'src/a.ts', text: '/* span.recordException(error) */' },
                { line: 4, path: 'src/a.ts', text: 'span.recordException(error); // recorded' },
              ]
            : pattern === 'record_error'
            ? [{ line: 3, path: 'src/a.py', text: 'value = 1  # span.record_error(error)' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: {
          code: 'unexpected',
          message: 'comment sites must not read windows',
          retryable: false,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 1 } },
      diagnostics: [],
    });
  });

  it('rejects every OTel-shaped hit inside one repository-indexed block comment', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [
              { line: 1, path: 'src/a.ts', text: '/* instrumentation disabled' },
              { line: 40, path: 'src/a.ts', text: '*/' },
            ]
          : pattern === 'recordException'
          ? [
              { line: 10, path: 'src/a.ts', text: 'span.recordException(error)' },
              { line: 41, path: 'src/a.ts', text: 'span.recordException(error)' },
            ]
          : pattern === 'record_error'
          ? [{ line: 20, path: 'src/a.ts', text: 'span.record_error(error)' }]
          : pattern === 'RecordError'
          ? [{ line: 30, path: 'src/a.ts', text: 'span.RecordError(error)' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: {
          code: 'unexpected',
          message: 'comment hits must not read windows',
          retryable: false,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 1 } },
      diagnostics: [],
    });
  });

  it('ignores delimiter-like text inside quoted strings when indexing block comments', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [{ line: 1, path: 'src/a.ts', text: 'const literal = "/*";' }]
          : pattern === 'recordException'
          ? [{ line: 10, path: 'src/a.ts', text: 'span.recordException(error)' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 1 } },
      diagnostics: [],
    });
  });

  it('excludes commented imports and OTEL config while retaining executable config', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [
              { line: 3, path: 'config/otel.yaml', text: '/* OTEL_SERVICE_NAME: disabled' },
              { line: 4, path: 'config/otel.yaml', text: '*/' },
            ]
          : pattern === 'OTEL_[A-Z0-9_]+'
          ? [
              { line: 1, path: 'config/otel.yaml', text: '# OTEL_SERVICE_NAME: disabled' },
              { line: 3, path: 'config/otel.yaml', text: '/* OTEL_SERVICE_NAME: disabled' },
              { line: 5, path: 'config/otel.yaml', text: 'OTEL_SERVICE_NAME: enabled' },
            ]
          : pattern === '@opentelemetry/'
          ? [{ line: 1, path: 'src/a.ts', text: '// import x from "@opentelemetry/api"' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { instrumentation_other: 1 } },
      diagnostics: [],
    });
  });

  it('preserves multiline template-literal state while indexing delimiter candidates', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [
              { line: 1, path: 'src/a.ts', text: 'const fixture = `' },
              { line: 2, path: 'src/a.ts', text: '/* literal text' },
              { line: 3, path: 'src/a.ts', text: '`;' },
            ]
          : pattern === 'recordException'
          ? [{ line: 4, path: 'src/a.ts', text: 'span.recordException(error)' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 1 } },
      diagnostics: [],
    });
  });

  it('reports paginated delimiter discovery failures as incomplete source coverage', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) =>
        pattern.includes('[/][*]')
          ? {
              error: { code: 'timeout', message: 'delimiter search timed out', retryable: true },
              status: 'failure',
            }
          : pattern === 'recordException'
          ? {
              items: [{ line: 1, path: 'src/a.ts', text: 'span.recordException(error)' }],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      diagnostics: [
        expect.objectContaining({ kind: 'grep', pattern: expect.stringContaining('[/][*]') }),
      ],
    });
  });

  it('rejects commented span and metric idioms before non-receiver eligibility counts them', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'startSpan'
            ? [
                { line: 1, path: 'src/a.ts', text: '// tracer.startSpan("disabled")' },
                { line: 2, path: 'src/a.py', text: '# tracer.startSpan("disabled")' },
              ]
            : pattern.includes('create(Counter')
            ? [{ line: 3, path: 'src/a.ts', text: '// meter.createCounter("disabled")' }]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: {
          code: 'unexpected',
          message: 'comment sites must not read windows',
          retryable: false,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { create_metric: 0, start_span: 0 } },
      diagnostics: [],
    });
  });

  it('does not let Rust lifetimes prevent a later real block comment from suppressing a distant call', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [
              { line: 1, path: 'src/a.rs', text: "fn borrow<'a>(value: &'a str) {}" },
              { line: 2, path: 'src/a.rs', text: '/* disabled instrumentation' },
            ]
          : pattern === 'recordException'
          ? [{ line: 10, path: 'src/a.rs', text: 'span.recordException(error)' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: {
          code: 'unexpected',
          message: 'comment hits must not read windows',
          retryable: false,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 0 } },
      diagnostics: [],
    });
  });

  it('lets Rust character literals close before indexing a following real block comment', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [
              { line: 1, path: 'src/a.rs', text: "let marker = 'a';" },
              { line: 2, path: 'src/a.rs', text: '/* disabled instrumentation' },
            ]
          : pattern === 'recordException'
          ? [{ line: 10, path: 'src/a.rs', text: 'span.recordException(error)' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: {
          code: 'unexpected',
          message: 'comment hits must not read windows',
          retryable: false,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 0 } },
      diagnostics: [],
    });
  });

  it('counts calls after a block closer without reapplying inherited comment state', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [{ line: 1, path: 'src/a.ts', text: '/* disabled' }]
          : pattern === 'recordException'
          ? [{ line: 2, path: 'src/a.ts', text: '*/ span.recordException(error)' }]
          : pattern === 'setStatus'
          ? [{ line: 2, path: 'src/a.ts', text: '*/ span.setStatus(SpanStatusCode.ERROR)' }]
          : pattern === 'setAttribute'
          ? [{ line: 2, path: 'src/a.ts', text: '*/ span.setAttribute("tenant.id", id)' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: {
        signalCounts: { record_exception: 1, set_attribute: 1, set_status_error: 1 },
      },
      diagnostics: [],
    });
  });

  it('batches lexical indexing for many candidate paths with bounded concurrency', async () => {
    /** Holds local test or extraction state. */
    const paths: readonly string[] = Array.from({ length: 20 }, (_, index) => `src/${index}.ts`);
    /** Tracks in-flight lexical grep requests. */
    let activeLexicalGreps: number = 0;
    /** Retains the greatest observed lexical grep concurrency. */
    let maximumActiveLexicalGreps: number = 0;
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ path, pattern }) => {
        if (pattern.includes('[/][*]')) {
          activeLexicalGreps += 1;
          maximumActiveLexicalGreps = Math.max(maximumActiveLexicalGreps, activeLexicalGreps);
          await new Promise<void>((resolve) => setTimeout(resolve, 5));
          activeLexicalGreps -= 1;
          return { items: [], status: 'complete' };
        }
        return {
          items:
            pattern === 'recordException'
              ? paths.map((sourcePath, index) => ({
                  line: index + 1,
                  path: sourcePath,
                  text: 'span.recordException(error)',
                }))
              : [],
          status: 'complete',
        };
      },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    /** Holds local test or extraction state. */
    const result = await detectOtelInstrumentation({ reader, repository });
    expect(maximumActiveLexicalGreps).toBeGreaterThan(1);
    expect(maximumActiveLexicalGreps).toBeLessThanOrEqual(8);
    expect(result.detection.signalCounts.record_exception).toBe(20);
    expect(result.diagnostics).toEqual([]);
  });

  it('does not count candidates when their path lexical context is incomplete', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) =>
        pattern.includes('[/][*]')
          ? {
              error: { code: 'timeout', message: 'lexical context unavailable', retryable: true },
              status: 'failure',
            }
          : pattern === 'recordException'
          ? {
              items: [{ line: 10, path: 'src/a.ts', text: 'span.recordException(error)' }],
              status: 'complete',
            }
          : { items: [], status: 'complete' },
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'failure',
        error: { code: 'unexpected', message: 'not called', retryable: false },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 0 } },
      diagnostics: [expect.objectContaining({ kind: 'grep', path: 'src/a.ts' })],
    });
  });

  it('rejects fallback calls inside inherited multiline literal state', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [
              { line: 1, path: 'src/a.ts', text: 'const fixture = `' },
              { line: 5, path: 'src/a.ts', text: '`;' },
            ]
          : pattern === 'recordException'
          ? [{ line: 2, path: 'src/a.ts', text: 'span.recordException(error)' }]
          : pattern === 'setStatus'
          ? [{ line: 3, path: 'src/a.ts', text: 'span.setStatus(SpanStatusCode.ERROR)' }]
          : pattern === 'setAttribute'
          ? [{ line: 4, path: 'src/a.ts', text: 'span.setAttribute("tenant.id", id)' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: ['', '', '', 'span.recordException(error)', '', '', ''],
          path: 'src/a.ts',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: {
        hasOtel: false,
        signalCounts: { record_exception: 0, set_attribute: 0, set_status_error: 0 },
      },
      diagnostics: [],
    });
  });

  it('rejects a fallback exception inside inherited Python triple-quote state', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? [
              { line: 1, path: 'src/a.py', text: 'fixture = """' },
              { line: 3, path: 'src/a.py', text: '"""' },
            ]
          : pattern === 'recordException'
          ? [{ line: 2, path: 'src/a.py', text: 'span.recordException(error)' }]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: ['', '', '', 'span.recordException(error)', '', '', ''],
          path: 'src/a.py',
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { hasOtel: false, signalCounts: { record_exception: 0 } },
      diagnostics: [],
    });
  });

  it('counts optional and null-safe OTel exception receivers while rejecting unrelated receivers', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items: pattern.includes('[/][*]')
          ? []
          : pattern === 'recordException'
          ? [
              { line: 1, path: 'src/a.ts', text: 'span?.recordException(error)' },
              { line: 2, path: 'src/a.ts', text: 'activity?.RecordException(error)' },
              { line: 3, path: 'src/a.ts', text: 'response?.recordException(error)' },
              { line: 4, path: 'src/a.php', text: '$span?->recordException($error)' },
            ]
          : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async ({ path, startLine }) => ({
        status: 'success',
        value: {
          endLine: startLine + 6,
          lines: ['', '', '', 'response?.recordException(error)', '', '', ''],
          path,
          startLine,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 3 } },
      diagnostics: [],
    });
  });

  it('counts exceptions only from directly attached OTel receivers', async () => {
    /** Holds local test or extraction state. */
    const reader: SourceReader = {
      grep: async ({ pattern }) => ({
        items:
          pattern === 'record_error'
            ? [
                { line: 1, path: 'src/a.py', text: 'function record_error(error) {}' },
                { line: 2, path: 'src/a.py', text: '# span.record_error(error)' },
                { line: 3, path: 'src/a.py', text: 'response.record_error(error)' },
                { line: 4, path: 'src/a.py', text: 'span.record_error(error)' },
              ]
            : [],
        status: 'complete',
      }),
      listSourcePage: async () => ({ items: [], status: 'complete' }),
      readWindow: async () => ({
        status: 'success',
        value: {
          endLine: 4,
          lines: [
            'function record_error(error) {}',
            '# span.record_error(error)',
            'response.record_error(error)',
            'span.record_error(error)',
          ],
          path: 'src/a.py',
          startLine: 1,
        },
      }),
    };

    await expect(detectOtelInstrumentation({ reader, repository })).resolves.toMatchObject({
      detection: { signalCounts: { record_exception: 1 } },
      diagnostics: [],
    });
  });
});
