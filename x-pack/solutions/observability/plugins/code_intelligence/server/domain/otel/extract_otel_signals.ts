/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OtelMetricKind,
  OtelSignal,
  OtelSignalKind,
  OtelValueHint,
} from '../models/otel_signal_codec';
import type { SourceLocation } from '../source_location_codec';
import { decodeSourceLiteral } from '../logging/extract_log_signatures';
import { isProductionOtelPath } from './path_policy';
import {
  outsideSourceCommentState,
  sourceWithoutComments,
  type SourceCommentState,
} from './source_comment_policy';
import { hasOtelReceiver, isOtelReceiver } from './receiver_policy';
import { isNonExecutableAtOffset } from './source_comment_policy';
import { hasSupportedStatusErrorArgument } from './status_call_policy';

/** Supplies one bounded source window centered on an OTel grep candidate. */
export interface OtelSourceWindow {
  readonly content: string;
  readonly initialCommentState?: SourceCommentState;
  readonly path: string;
  readonly startLine: number;
}

/** Maps runtime source suffixes to display names for workflow classification context. */
const languageByExtension: Readonly<Record<string, string>> = {
  cc: 'C++',
  cpp: 'C++',
  cs: 'C#',
  go: 'Go',
  java: 'Java',
  js: 'JavaScript',
  jsx: 'JavaScript',
  kt: 'Kotlin',
  php: 'PHP',
  py: 'Python',
  rb: 'Ruby',
  rs: 'Rust',
  ts: 'TypeScript',
  tsx: 'TypeScript',
};
/** Lists roots snapshot-derived from attribute IDs in the `/tmp/semconv-model/model` YAML tree, plus retained legacy SDK roots. */
const semanticConventionRoots: ReadonlySet<string> = new Set([
  'android',
  'app',
  'artifact',
  'asgi',
  'aspnetcore',
  'aws',
  'az',
  'azure',
  'browser',
  'cassandra',
  'cgi',
  'cicd',
  'client',
  'cloud',
  'cloudevents',
  'cloudfoundry',
  'code',
  'container',
  'cpu',
  'cpython',
  'db',
  'deployment',
  'destination',
  'device',
  'disk',
  'dns',
  'dotnet',
  'elasticsearch',
  'enduser',
  'error',
  'event',
  'exception',
  'faas',
  'feature_flag',
  'file',
  'gcp',
  'gen_ai',
  'geo',
  'go',
  'graphql',
  'heroku',
  'host',
  'http',
  'hw',
  'ios',
  'jsonrpc',
  'jvm',
  'k8s',
  'kestrel',
  'linux',
  'log',
  'mainframe',
  'mcp',
  'message',
  'messaging',
  'microsoft',
  'net',
  'network',
  'nfs',
  'nodejs',
  'oci',
  'onc_rpc',
  'openai',
  'openshift',
  'opentracing',
  'oracle',
  'oracle_cloud',
  'os',
  'otel',
  'peer',
  'persistence',
  'pool',
  'pprof',
  'process',
  'profile',
  'razor',
  'rpc',
  'ruby',
  'security_rule',
  'server',
  'service',
  'session',
  'signalr',
  'source',
  'state',
  'system',
  'telco',
  'telemetry',
  'test',
  'thread',
  'tls',
  'unity',
  'url',
  'user',
  'user_agent',
  'v8js',
  'vcs',
  'webengine',
  'wsgi',
  'zos',
]);

/** Returns whether an attribute key belongs to a documented OpenTelemetry semantic-convention namespace. */
const isSemanticConventionKey = (key: string): boolean =>
  semanticConventionRoots.has(key.slice(0, key.indexOf('.')));

/** Returns a display language inferred from a source path extension. */
const languageOf = (path: string): string => {
  /** The suffix is available without a path library and stays platform-neutral. */
  const extension: string = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return languageByExtension[extension] ?? (extension || 'unknown');
};

/** Infers the useful value shape from an attribute key and immediate value expression. */
const inferValueHint = (key: string, expression: string = ''): OtelValueHint => {
  /** Both key and expression may convey a stable type convention. */
  const normalized: string = `${key} ${expression}`.toLowerCase();
  if (/\b(true|false|bool(?:ean)?)\b/.test(normalized)) return 'bool';
  if (/(?:^|[._])(count|amount|total|duration|latency|size|length|ms|seconds?)$/.test(key)) {
    return 'number';
  }
  if (/\b\d+(?:\.\d+)?\b/.test(expression)) return 'number';
  if (/(?:^|[._])id$/.test(key)) return 'id';
  if (/enum|status|type|kind|state/.test(normalized)) return 'enum';
  return 'unknown';
};

/** Maps an instrument-constructor token to its OTel aggregation family. */
const metricKindFromToken = (token: string): OtelMetricKind => {
  /** Case-folding accommodates SDK naming differences across languages. */
  const normalized: string = token.toLowerCase().replaceAll('_', '');
  if (normalized.includes('histogram')) return 'histogram';
  if (normalized.includes('updown')) return 'updown';
  if (normalized.includes('gauge')) return 'gauge';
  return 'counter';
};

/** Builds a quoted-literal capture whose backtick semantics match the source path's language. */
const sourceLiteralCapturePattern = (path: string): string => {
  /** Keeps the delimiter readable while constructing the backtick alternative. */
  const backtick: string = '`';
  /** Double-quoted strings decode a backslash plus its following source character together. */
  const doubleQuoted: string = String.raw`"((?:\\[^\r\n]|[^"\\\r\n])*)"`;
  /** Single-quoted strings follow the same bounded escape-aware capture behavior. */
  const singleQuoted: string = String.raw`'((?:\\[^\r\n]|[^'\\\r\n])*)'`;
  /** Reuses raw fragments so regular-expression backslashes survive template-string construction. */
  const escapedCharacter: string = String.raw`\\[^\r\n]`;
  /** Go raw strings end at the next backtick because backslashes have no delimiter role. */
  const backtickQuoted: string = path.toLowerCase().endsWith('.go')
    ? `${backtick}([^${backtick}${String.raw`\r\n`}]*)${backtick}`
    : `${backtick}((?:${escapedCharacter}|[^${backtick}${String.raw`\\\r\n`}])*)${backtick}`;
  return `(?:${doubleQuoted}|${singleQuoted}|${backtickQuoted})`;
};

/** Selects the populated delimiter-specific literal capture from one source match. */
const literalFromMatch = (
  match: RegExpMatchArray,
  firstCapture: number
): { readonly quote: string; readonly raw: string } | undefined => {
  /** Captures are ordered as double-, single-, and backtick-delimited alternatives. */
  const captures: readonly [string, string | undefined][] = [
    ['"', match[firstCapture]],
    ["'", match[firstCapture + 1]],
    ['`', match[firstCapture + 2]],
  ];
  /** One alternative must be populated for a complete literal-pattern match. */
  const literal: readonly [string, string | undefined] | undefined = captures.find(
    ([, raw]) => raw !== undefined
  );
  if (literal === undefined || literal[1] === undefined) return undefined;
  return { quote: literal[0], raw: literal[1] };
};

/** Returns whether a matched literal participates in runtime string concatenation. */
const isConcatenated = (content: string, match: RegExpMatchArray): boolean =>
  /^\s*\+/.test(content.slice((match.index ?? 0) + match[0].length));

/** Returns whether a match in comment-masked source begins outside a same-window quoted example. */
const isExecutableMatch = (
  content: string,
  _initialState: SourceCommentState | undefined,
  match: RegExpMatchArray,
  path: string
): boolean =>
  // Comment masking has already consumed inherited state and preserved offsets for this second lexical pass.
  !isNonExecutableAtOffset({
    content,
    initialState: outsideSourceCommentState,
    offset: match.index ?? 0,
    path,
  });

/** Locates an extracted match's physical source line within its bounded source window. */
const windowAtOffset = (window: OtelSourceWindow, offset: number): OtelSourceWindow => ({
  ...window,
  // Newlines before a match identify its exact repository line, even in overlapping read windows.
  startLine: window.startLine + window.content.slice(0, offset).split('\n').length - 1,
});

/** Locates a regular-expression match's physical source line within its bounded source window. */
const windowAtMatch = (window: OtelSourceWindow, match: RegExpMatchArray): OtelSourceWindow =>
  windowAtOffset(window, match.index ?? 0);

/** Locates call evidence at its captured method rather than its receiver's source line. */
const windowAtMatchedMethod = (
  window: OtelSourceWindow,
  match: RegExpMatchArray
): OtelSourceWindow => {
  /** The final method token follows the receiver/operator, even when the receiver repeats its name. */
  const methodOffset: number = match[0].lastIndexOf(match[2]);
  return windowAtOffset(window, (match.index ?? 0) + methodOffset);
};

/** Delegates one matched status call's bounded argument validation to shared lexical policy. */
const hasStatusErrorArgument = (content: string, match: RegExpMatchArray, path: string): boolean =>
  hasSupportedStatusErrorArgument({
    content,
    openParenthesis: (match.index ?? 0) + match[0].lastIndexOf('('),
    path,
  });

/** Creates evidence attached directly to each extracted signal. */
const evidenceFor = (window: OtelSourceWindow): readonly SourceLocation[] => [
  { excerpt: window.content.slice(0, 4_000) || ' ', line: window.startLine, path: window.path },
];

/** Converts a static literal into a signal while retaining dynamic prefixes as evidence. */
const literalSignal = ({
  concatenated = false,
  kind,
  metricKind,
  quote,
  raw,
  valueHint,
  window,
}: {
  readonly concatenated?: boolean;
  readonly kind: OtelSignalKind;
  readonly metricKind?: OtelMetricKind;
  readonly quote: string;
  readonly raw: string;
  readonly valueHint?: OtelValueHint;
  readonly window: OtelSourceWindow;
}): OtelSignal | undefined => {
  /** Decoding establishes a runtime value without executing the customer source. */
  const decoded: string | undefined = decodeSourceLiteral({
    evidence: evidenceFor(window),
    message: raw,
    quote,
  });
  /** Unknown escape semantics remain useful source evidence but cannot anchor a literal query. */
  if (decoded === undefined) {
    return {
      evidence: evidenceFor(window),
      kind,
      language: languageOf(window.path),
      ...(metricKind === undefined ? {} : { metricKind }),
      templated: true,
      ...(valueHint === undefined ? {} : { valueHint }),
    };
  }
  /** Interpolation and concatenation mean the runtime signal is not a stable literal query value. */
  const interpolation: number = decoded.search(/\$\{|#\{|%[a-zA-Z]|\{[^}]+\}/);
  /** A stable prefix remains valuable evidence even though later generation must not assume a literal. */
  const value: string = (interpolation === -1 ? decoded : decoded.slice(0, interpolation))
    .trim()
    .replace(/[.\s_-]+$/, '');
  /** Fully dynamic names retain source evidence but deliberately omit an invented empty literal value. */
  const templated: boolean = interpolation !== -1 || concatenated;
  if (value.length === 0 && !templated) return undefined;
  return {
    evidence: evidenceFor(window),
    kind,
    language: languageOf(window.path),
    ...(metricKind === undefined ? {} : { metricKind }),
    ...(templated ? { templated: true } : {}),
    ...(value.length === 0 ? {} : { value }),
    ...(valueHint === undefined ? {} : { valueHint }),
  };
};

/** Adds a signal once per kind, value, instrument kind, and source location. */
const addSignal = ({
  seen,
  signal,
  signals,
}: {
  readonly seen: Set<string>;
  readonly signal: OtelSignal | undefined;
  readonly signals: OtelSignal[];
}): void => {
  if (signal === undefined) return;
  /** Dynamic names retain an empty value marker while their evidence stays independently useful. */
  const location: SourceLocation = signal.evidence[0];
  /** Metric kind is part of identity because it selects a different future query family. */
  const identity: string = `${signal.kind}:${signal.value ?? ''}:${signal.metricKind ?? ''}:${
    location.path
  }:${location.line}`;
  if (seen.has(identity)) return;
  seen.add(identity);
  signals.push(signal);
};

/** Extracts OTel signal evidence from supplied source windows without I/O or runtime-specific dependencies. */
export const extractOtelSignalsFromWindows = (
  windows: readonly OtelSourceWindow[]
): readonly OtelSignal[] => {
  /** Results retain source-window order for stable downstream classification batches. */
  const signals: OtelSignal[] = [];
  /** Identity eliminates overlapping extraction-pattern matches. */
  const seen: Set<string> = new Set();
  for (const window of windows) {
    if (!isProductionOtelPath(window.path)) continue;
    /** Source text is intentionally parsed heuristically, not executed or compiled. */
    const content: string = sourceWithoutComments({
      content: window.content,
      initialState: window.initialCommentState ?? outsideSourceCommentState,
      path: window.path,
    });
    /** Span patterns cover JS/Java/Python/C# builders plus Go's context-first Start call. */
    const spanLiteralPattern: string = sourceLiteralCapturePattern(window.path);
    /** Span matching uses source-language delimiter rules without evaluating source. */
    const spanPattern: RegExp = new RegExp(
      String.raw`(?:startSpan|start_span|startActiveSpan|start_as_current_span|spanBuilder|StartActivity|in_span)\s*\(\s*${spanLiteralPattern}|\b[\w.]*tracer[\w.]*(?:\s*\([^\n)]*\))?\s*\.\s*Start\s*\(\s*[^,]+,\s*${spanLiteralPattern}`,
      'gi'
    );
    for (const match of content.matchAll(spanPattern)) {
      /** The 2 span-call alternatives begin at captures 1 and 4 respectively. */
      const literal = literalFromMatch(match, 1) ?? literalFromMatch(match, 4);
      if (literal === undefined) continue;
      if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
      addSignal({
        seen,
        signals,
        signal: literalSignal({
          kind: 'span_name',
          concatenated: isConcatenated(content, match),
          quote: literal.quote,
          raw: literal.raw,
          window: windowAtMatch(window, match),
        }),
      });
    }
    /** Dynamic span names remain evidence but omit a value so generation cannot invent a literal query. */
    const dynamicSpanPattern: RegExp =
      /(?:startSpan|start_span|startActiveSpan|start_as_current_span|spanBuilder|StartActivity|in_span)\s*\((?!\s*["'`])\s*|\b[\w.]*tracer[\w.]*(?:\s*\([^\n)]*\))?\s*\.\s*Start\s*\(\s*[^,]+,(?!\s*["'`])\s*/gi;
    for (const _match of content.matchAll(dynamicSpanPattern)) {
      if (!isExecutableMatch(content, window.initialCommentState, _match, window.path)) continue;
      addSignal({
        seen,
        signals,
        signal: {
          evidence: evidenceFor(windowAtMatch(window, _match)),
          kind: 'span_name',
          language: languageOf(window.path),
          templated: true,
        },
      });
    }
    /** Event calls require an OTel-shaped receiver because addEvent is otherwise ambiguous. */
    const eventLiteralPattern: string = sourceLiteralCapturePattern(window.path);
    /** Event matching uses source-language delimiter rules without evaluating source. */
    const eventPattern: RegExp = new RegExp(
      String.raw`([$\w.]+)\s*(?:\?\.|\?->|\.|->)\s*(?:addEvent|add_event|AddEvent)\s*\(\s*(?:new\s+(?:ActivityEvent)?\s*\(\s*)?${eventLiteralPattern}`,
      'gi'
    );
    if (hasOtelReceiver(content)) {
      for (const match of content.matchAll(eventPattern)) {
        /** The receiver consumes capture 1, so delimiter-specific captures start at 2. */
        const literal = literalFromMatch(match, 2);
        if (literal === undefined) continue;
        if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
        if (!isOtelReceiver(match[1])) continue;
        addSignal({
          seen,
          signals,
          signal: literalSignal({
            concatenated: isConcatenated(content, match),
            kind: 'event_name',
            quote: literal.quote,
            raw: literal.raw,
            window: windowAtMatch(window, match),
          }),
        });
      }
      /** Direct variable event names remain evidence even though a literal template cannot represent them. */
      const dynamicDirectEventPattern: RegExp =
        /([$\w.]+)\s*(?:\?\.|\?->|\.|->)\s*(?:addEvent|add_event|AddEvent)\s*\((?!\s*new\s+(?:ActivityEvent)?\s*\(\s*)(?!\s*["'`])\s*/gi;
      for (const match of content.matchAll(dynamicDirectEventPattern)) {
        if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
        if (!isOtelReceiver(match[1])) continue;
        addSignal({
          seen,
          signals,
          signal: {
            evidence: evidenceFor(windowAtMatch(window, match)),
            kind: 'event_name',
            language: languageOf(window.path),
            templated: true,
          },
        });
      }
      /** Wrapped variable event names need their own branch so literal ActivityEvent wrappers are never double-counted. */
      const dynamicWrappedEventPattern: RegExp =
        /([$\w.]+)\s*(?:\?\.|\?->|\.|->)\s*(?:addEvent|add_event|AddEvent)\s*\(\s*new\s+(?:ActivityEvent)?\s*\((?!\s*["'`])\s*/gi;
      for (const match of content.matchAll(dynamicWrappedEventPattern)) {
        if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
        if (!isOtelReceiver(match[1])) continue;
        addSignal({
          seen,
          signals,
          signal: {
            evidence: evidenceFor(windowAtMatch(window, match)),
            kind: 'event_name',
            language: languageOf(window.path),
            templated: true,
          },
        });
      }
    }
    /** Direct attribute setters require an OTel-shaped receiver to reject DOM setAttribute calls. */
    const attributePattern: RegExp =
      /([$\w.]+)\s*(?:\?\.|\?->|\.|->)\s*(?:setAttribute|set_attribute|SetTag|SpanAttribute)\s*\(\s*(["'`])([a-zA-Z][\w.-]+)\2\s*,\s*([^,)\n}]*)/gi;
    if (hasOtelReceiver(content)) {
      for (const match of content.matchAll(attributePattern)) {
        if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
        if (!isOtelReceiver(match[1]) || isSemanticConventionKey(match[3])) continue;
        {
          addSignal({
            seen,
            signals,
            signal: literalSignal({
              kind: 'attr_key',
              quote: match[2],
              raw: match[3],
              valueHint: inferValueHint(match[3], match[4]),
              window: windowAtMatch(window, match),
            }),
          });
        }
      }
    }
    /** Escaped attribute-key spellings remain templated because the restricted key grammar cannot establish their validity. */
    const escapedAttributeKeyPattern: RegExp =
      /([$\w.]+)\s*(?:\?\.|\?->|\.|->)\s*(?:setAttribute|set_attribute|SetTag|SpanAttribute)\s*\(\s*(["'`])((?:\\.|(?!\2)[^\r\n])*)\2\s*,/gi;
    if (hasOtelReceiver(content)) {
      for (const match of content.matchAll(escapedAttributeKeyPattern)) {
        if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
        if (!isOtelReceiver(match[1]) || !match[3].includes('\\')) continue;
        addSignal({
          seen,
          signals,
          signal: {
            evidence: evidenceFor(windowAtMatch(window, match)),
            kind: 'attr_key',
            language: languageOf(window.path),
            templated: true,
          },
        });
      }
    }
    /** Dynamic or concatenated attribute keys remain evidence without inventing a stable literal key. */
    const dynamicAttributePattern: RegExp =
      /([\w.$]+)\s*(?:\?\.|\?->|\.|->)\s*(?:setAttribute|set_attribute|SetTag|SpanAttribute)\s*\(\s*(?:(['"])[^'"\n]*\2\s*\+\s*[^,\n]+|["'][^'"\n]*(?:#\{|\$\{)[^'"\n]*["']|[$f]["'][^'"\n]*["']|`[^`]*\$\{[^}]+\}[^`]*`|[a-zA-Z_$][\w$]*(?:\s*\([^)]*\))?(?:\s*\+\s*[^,\n]+)?)\s*,/gi;
    for (const match of content.matchAll(dynamicAttributePattern)) {
      if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
      if (!isOtelReceiver(match[1])) continue;
      addSignal({
        seen,
        signals,
        signal: {
          evidence: evidenceFor(windowAtMatch(window, match)),
          kind: 'attr_key',
          language: languageOf(window.path),
          templated: true,
        },
      });
    }
    /** Plural attribute calls with variable maps or computed object keys retain dynamic-key evidence. */
    const dynamicAttributesPattern: RegExp =
      /([\w.]+)\s*(?:\?\.|\?->|\.|->)\s*setAttributes\s*\(\s*(?:[a-zA-Z_$][\w$]*|\{\s*\[)/gi;
    for (const match of content.matchAll(dynamicAttributesPattern)) {
      if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
      if (!isOtelReceiver(match[1])) continue;
      addSignal({
        seen,
        signals,
        signal: {
          evidence: evidenceFor(windowAtMatch(window, match)),
          kind: 'attr_key',
          language: languageOf(window.path),
          templated: true,
        },
      });
    }
    /** Constructor calls with variable keys retain evidence when a stable literal cannot be established. */
    const dynamicAttributeConstructorPattern: RegExp =
      /(?:AttributeKey\.(?:stringKey|longKey|booleanKey|doubleKey)|KeyValue::new)\s*\(\s*(?!['"`])/g;
    for (const match of content.matchAll(dynamicAttributeConstructorPattern)) {
      if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
      addSignal({
        seen,
        signals,
        signal: {
          evidence: evidenceFor(windowAtMatch(window, match)),
          kind: 'attr_key',
          language: languageOf(window.path),
          templated: true,
        },
      });
    }
    /** Constructor patterns preserve cross-language attribute keys even when setters hold wrapped values. */
    const attributeConstructorPattern: RegExp =
      /(?:attribute\.(String|Bool|Int|Int64|Float64|StringSlice)|AttributeKey\.(stringKey|longKey|booleanKey|doubleKey)|KeyValue::new|(string|long|boolean|double)Key)\s*\(\s*(["'`])([a-zA-Z][\w.-]+)\4/g;
    for (const match of content.matchAll(attributeConstructorPattern)) {
      if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
      /** Constructor match groups carry the key in the final capture. */
      const key: string = match[5];
      if (isSemanticConventionKey(key)) continue;
      /** SDK constructor names give a stronger hint than key-name inference alone. */
      const typeToken: string = (match[1] ?? match[2] ?? match[3] ?? '').toLowerCase();
      /** Captures the constructor-derived attribute value hint for the extracted key. */
      const valueHint: OtelValueHint = /bool/.test(typeToken)
        ? 'bool'
        : /int|long|float|double/.test(typeToken)
        ? 'number'
        : inferValueHint(key);
      addSignal({
        seen,
        signals,
        signal: literalSignal({
          kind: 'attr_key',
          quote: match[4],
          raw: key,
          valueHint,
          window: windowAtMatch(window, match),
        }),
      });
    }
    /** Object attributes are a JavaScript/TypeScript form that carries several keys in one call. */
    const objectCallPattern: RegExp =
      /([\w.]+)\s*(?:\?\.|\?->|\.|->)\s*setAttributes\s*\(\s*\{([\s\S]*?)\}\s*\)/gi;
    if (hasOtelReceiver(content)) {
      for (const objectMatch of content.matchAll(objectCallPattern)) {
        if (!isExecutableMatch(content, window.initialCommentState, objectMatch, window.path))
          continue;
        if (!isOtelReceiver(objectMatch[1])) continue;
        /** Finds the captured object body because its regex index starts after the opening brace. */
        const objectContentOffset: number = content.indexOf(objectMatch[2], objectMatch.index ?? 0);
        /** Object entries are constrained to one source window and do not attempt full JavaScript parsing. */
        const keyPattern: RegExp =
          /(?:(['"`])([a-zA-Z][\w.-]+)\1|([a-zA-Z_$][\w$]*))\s*:\s*([^,}\n]+)/g;
        for (const keyMatch of objectMatch[2].matchAll(keyPattern)) {
          /** Quoted and bare property forms share the same extraction behavior. */
          const key: string = keyMatch[2] ?? keyMatch[3];
          if (!isSemanticConventionKey(key)) {
            addSignal({
              seen,
              signals,
              signal: literalSignal({
                kind: 'attr_key',
                quote: keyMatch[1] ?? '"',
                raw: key,
                valueHint: inferValueHint(key, keyMatch[4]),
                window: windowAtOffset(window, objectContentOffset + (keyMatch.index ?? 0)),
              }),
            });
          }
        }
      }
    }
    /** Metric constructors cover OTel SDK builders across the supported language fixtures. */
    const metricLiteralPattern: string = sourceLiteralCapturePattern(window.path);
    /** Metric matching uses source-language delimiter rules without evaluating source. */
    const metricPattern: RegExp = new RegExp(
      String.raw`(create_?(?:Observable)?(?:UpDownCounter|Counter|Histogram|Gauge)|Create(?:UpDownCounter|Counter|Histogram|Gauge|ObservableUpDownCounter|ObservableGauge|ObservableCounter)|create_(?:counter|up_down_counter|histogram|gauge|observable_counter|observable_gauge|observable_up_down_counter)|Int64(?:UpDownCounter|ObservableUpDownCounter|ObservableCounter|ObservableGauge|Counter|Histogram|Gauge)|Float64(?:UpDownCounter|ObservableUpDownCounter|ObservableCounter|ObservableGauge|Counter|Histogram|Gauge)|counterBuilder|upDownCounterBuilder|histogramBuilder|gaugeBuilder)\s*(?:<[^>\n]+>)?\s*\(\s*${metricLiteralPattern}`,
      'gi'
    );
    for (const match of content.matchAll(metricPattern)) {
      /** The constructor token consumes capture 1, so delimiter-specific captures start at 2. */
      const literal = literalFromMatch(match, 2);
      if (literal === undefined) continue;
      if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
      addSignal({
        seen,
        signals,
        signal: literalSignal({
          concatenated: isConcatenated(content, match),
          kind: 'metric_name',
          metricKind: metricKindFromToken(match[1]),
          quote: literal.quote,
          raw: literal.raw,
          window: windowAtMatch(window, match),
        }),
      });
    }
    /** Dynamic metric names remain source evidence while avoiding unsupported literal query generation. */
    const dynamicMetricPattern: RegExp =
      /(create_?(?:Observable)?(?:UpDownCounter|Counter|Histogram|Gauge)|Create(?:UpDownCounter|Counter|Histogram|Gauge|ObservableUpDownCounter|ObservableGauge|ObservableCounter)|create_(?:counter|up_down_counter|histogram|gauge|observable_counter|observable_gauge|observable_up_down_counter)|Int64(?:UpDownCounter|ObservableUpDownCounter|ObservableCounter|ObservableGauge|Counter|Histogram|Gauge)|Float64(?:UpDownCounter|ObservableUpDownCounter|ObservableCounter|ObservableGauge|Counter|Histogram|Gauge)|counterBuilder|upDownCounterBuilder|histogramBuilder|gaugeBuilder)\s*(?:<[^>\n]+>)?\s*\((?!\s*["'`])\s*/gi;
    for (const match of content.matchAll(dynamicMetricPattern)) {
      if (!isExecutableMatch(content, window.initialCommentState, match, window.path)) continue;
      addSignal({
        seen,
        signals,
        signal: {
          evidence: evidenceFor(windowAtMatch(window, match)),
          kind: 'metric_name',
          language: languageOf(window.path),
          metricKind: metricKindFromToken(match[1]),
          templated: true,
        },
      });
    }
    /** Error-status matches retain the exact status-call line rather than their grep-window center. */
    const errorStatusPattern: RegExp =
      /([$\w.]+)\s*(?:\?\.|\?->|\.|->)\s*(setStatus|set_status|SetStatus)\s*\(/g;
    for (const match of content.matchAll(errorStatusPattern)) {
      if (
        isNonExecutableAtOffset({ content, offset: match.index ?? 0, path: window.path }) ||
        !isOtelReceiver(match[1]) ||
        !hasStatusErrorArgument(content, match, window.path)
      )
        continue;
      addSignal({
        seen,
        signals,
        signal: {
          evidence: evidenceFor(windowAtMatchedMethod(window, match)),
          kind: 'error_status',
          language: languageOf(window.path),
        },
      });
    }
    /** Exception matches likewise retain each exact recorder-call line in overlapping source windows. */
    const exceptionPattern: RegExp =
      /([$\w.]+)\s*(?:\?\.|\?->|\.|->)\s*(recordException|record_exception|RecordException|RecordError|record_error)\s*\(/g;
    for (const match of content.matchAll(exceptionPattern)) {
      if (
        isNonExecutableAtOffset({ content, offset: match.index ?? 0, path: window.path }) ||
        !isOtelReceiver(match[1])
      )
        continue;
      addSignal({
        seen,
        signals,
        signal: {
          evidence: evidenceFor(windowAtMatchedMethod(window, match)),
          kind: 'record_exception',
          language: languageOf(window.path),
        },
      });
    }
  }
  return signals;
};
