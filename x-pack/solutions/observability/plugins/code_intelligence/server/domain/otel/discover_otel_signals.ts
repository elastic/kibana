/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationError } from '../models/operation_result';
import type { OtelSignal } from '../models/otel_signal_codec';
import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import { collectGrepPages } from '../source/collect_grep_pages';
import { mapBounded } from '../source/map_bounded';
import { buildBlockCommentIndex } from './block_comment_index';
import { extractOtelSignalsFromWindows, type OtelSourceWindow } from './extract_otel_signals';
import { otelMetricConstructorGrepPattern } from './instrumentation_patterns';
import {
  attributeKeyBindings,
  extractMetricMeasurements,
  measurementWindowLines,
  metricMeasurementGrepPatterns,
  withMetricDimensions,
} from './metric_measurements';
import { isProductionOtelPath } from './path_policy';

/** Git-grep ERE patterns that locate windows likely to contain an extractable OTel signal. */
const otelExtractionPatterns: readonly string[] = [
  '(startSpan|start_span|start_as_current_span|startActiveSpan|spanBuilder|in_span|StartActivity|[.]Start[(])',
  '(addEvent|add_event|AddEvent|ActivityEvent)',
  '(setAttribute|setAttributes|set_attribute|SetTag|SpanAttribute)',
  '(attribute[.](String|Bool|Int|Int64|Float64|StringSlice)|AttributeKey[.](stringKey|longKey|booleanKey|doubleKey)|KeyValue::new)',
  otelMetricConstructorGrepPattern,
  '(setStatus|set_status|SetStatus)',
  '(recordException|record_exception|RecordException|RecordError|record_error)',
] as const;
/** Number of adjacent lines preserved on each side of a candidate hit. */
const otelWindowRadius: number = 3;
/** Maximum concurrent OTel source-window reads without reducing complete discovery coverage. */
const windowReadConcurrency: number = 8;

/** Preserves an OTel source-access failure without hiding signals read from independent locations. */
export interface OtelDiscoveryDiagnostic {
  readonly error: OperationError;
  readonly kind: 'grep' | 'pagination' | 'window';
  readonly line?: number;
  readonly path?: string;
  readonly pattern?: string;
}

/** Returns source-derived OTel signals alongside all failures that make coverage incomplete. */
export interface OtelDiscoveryResult {
  readonly diagnostics: readonly OtelDiscoveryDiagnostic[];
  readonly signals: readonly OtelSignal[];
}

/** Collects every path and line matched by one pattern while retaining incomplete source coverage diagnostics. */
const locationsForPattern = async ({
  caseSensitive,
  pattern,
  reader,
  repository,
}: {
  readonly caseSensitive?: boolean;
  readonly pattern: string;
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostics: readonly OtelDiscoveryDiagnostic[];
  readonly locations: ReadonlyMap<string, ReadonlySet<number>>;
}> => {
  /** Groups lines per path so each bounded source window can be read once. */
  const locations: Map<string, Set<number>> = new Map();
  /** Diagnostics preserve partial results rather than converting failures to a complete empty result. */
  const diagnostics: OtelDiscoveryDiagnostic[] = [];
  /** Reads every immutable grep page through the shared continuation guard. */
  const collected = await collectGrepPages({
    invalidCursorMessage: () =>
      `OTel extraction pattern ${JSON.stringify(pattern)} returned a missing or repeated cursor.`,
    reader,
    request: { ...(caseSensitive === undefined ? {} : { caseSensitive }), pattern, repository },
  });
  if (collected.error !== undefined && collected.failureKind !== undefined) {
    diagnostics.push({ error: collected.error, kind: collected.failureKind, pattern });
  }
  for (const hit of collected.items) {
    if (!isProductionOtelPath(hit.path)) continue;
    /** Existing line numbers are deduplicated across repeated grep context or overlapping patterns. */
    const lines: Set<number> = locations.get(hit.path) ?? new Set<number>();
    lines.add(hit.line);
    locations.set(hit.path, lines);
  }
  return { diagnostics, locations };
};

/** Collects the merged path and line hits of several patterns, plus any grep failures. */
const locationsForPatterns = async ({
  caseSensitive,
  patterns,
  reader,
  repository,
}: {
  readonly caseSensitive?: boolean;
  readonly patterns: readonly string[];
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostics: readonly OtelDiscoveryDiagnostic[];
  readonly locations: ReadonlyMap<string, ReadonlySet<number>>;
}> => {
  /** Candidate locations aggregate the complete union of every successfully read pattern. */
  const locations: Map<string, Set<number>> = new Map();
  /** Diagnostics expose partial source coverage to orchestration even when no signals were extracted. */
  const diagnostics: OtelDiscoveryDiagnostic[] = [];
  for (const pattern of patterns) {
    /** Failed patterns retain their diagnostic while independent patterns continue. */
    const patternResult = await locationsForPattern({ caseSensitive, pattern, reader, repository });
    diagnostics.push(...patternResult.diagnostics);
    for (const [path, lines] of patternResult.locations) {
      /** Mutable local sets make merging overlapping pattern hits explicit and complete. */
      const mergedLines: Set<number> = locations.get(path) ?? new Set<number>();
      for (const line of lines) mergedLines.add(line);
      locations.set(path, mergedLines);
    }
  }
  return { diagnostics, locations };
};

/** Reads one bounded window per hit, in sorted order, from paths whose comment state is fully known. */
const readHitWindows = async ({
  linesAfter,
  linesBefore,
  locations,
  reader,
  repository,
}: {
  readonly linesAfter: number;
  readonly linesBefore: number;
  readonly locations: ReadonlyMap<string, ReadonlySet<number>>;
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostics: readonly OtelDiscoveryDiagnostic[];
  readonly windows: readonly OtelSourceWindow[];
}> => {
  /** Diagnostics preserve partial results rather than converting failures to a complete empty result. */
  const diagnostics: OtelDiscoveryDiagnostic[] = [];
  /** Candidate-path lexical paging avoids repository-wide quote materialization. */
  const blockCommentResult = await buildBlockCommentIndex({
    paths: [...locations.keys()],
    reader,
    repository,
  });
  diagnostics.push(...blockCommentResult.diagnostics);
  /** Source locations are sorted before concurrent reads to retain deterministic evidence order. */
  const sortedLocations: readonly { readonly line: number; readonly path: string }[] = [
    ...locations.entries(),
  ]
    .flatMap(([path, lines]) => [...lines].map((line) => ({ line, path })))
    .sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line);
  /** Each outcome remains tied to its original sorted location despite out-of-order completion. */
  const completeLocations = sortedLocations.filter(({ path }) => {
    /** Incomplete lexical context cannot safely establish executable source inside a bounded window. */
    if (blockCommentResult.index.isComplete(path)) return true;
    return false;
  });
  /** Retains bounded source-window reads in sorted location order. */
  const windowResults = await mapBounded(
    completeLocations,
    windowReadConcurrency,
    async ({ line, path }) => ({
      line,
      path,
      result: await reader.readWindow({
        endLine: line + linesAfter,
        path,
        repository,
        startLine: Math.max(1, line - linesBefore),
      }),
    })
  );
  /** Windows and diagnostics consume ordered worker results, not completion order. */
  const windows: OtelSourceWindow[] = [];
  for (const { line, path, result } of windowResults) {
    if (result.status === 'failure') {
      diagnostics.push({ error: result.error, kind: 'window', line, path });
      continue;
    }
    /** A clamped response must still contain the grep hit or coverage cannot be claimed. */
    if (line < result.value.startLine || line > result.value.endLine) {
      diagnostics.push({
        error: {
          code: 'matched_line_outside_window',
          message: `OTel source window ${result.value.startLine}-${result.value.endLine} omitted matched line ${line}.`,
          retryable: false,
        },
        kind: 'window',
        line,
        path,
      });
      continue;
    }
    windows.push({
      content: result.value.lines.join('\n'),
      initialCommentState: blockCommentResult.index.stateAtLine(path, result.value.startLine),
      path,
      startLine: result.value.startLine,
    });
  }
  return { diagnostics, windows };
};

/** Discovers OTel signals while retaining failures separately from a complete empty discovery result. */
export const discoverOtelSignals = async ({
  patterns = otelExtractionPatterns,
  reader,
  repository,
}: {
  /** Supplies validated repository-specific fallback patterns instead of standard OTel idioms when present. */
  readonly patterns?: readonly string[];
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<OtelDiscoveryResult> => {
  /** Hits of every standard OTel pattern. */
  const hits = await locationsForPatterns({ patterns, reader, repository });
  /** Windows centered on each hit. */
  const primary = await readHitWindows({
    linesAfter: otelWindowRadius,
    linesBefore: otelWindowRadius,
    locations: hits.locations,
    reader,
    repository,
  });
  /** Signals found at instrumentation sites, before measurement dimensions are added. */
  const signals: readonly OtelSignal[] = extractOtelSignalsFromWindows(primary.windows);
  /** Diagnostics from both passes; any one makes coverage incomplete. */
  const diagnostics: OtelDiscoveryDiagnostic[] = [...hits.diagnostics, ...primary.diagnostics];
  /** Measurement calls are often far from the constructor, so they need their own repository-wide search. */
  const measurementPatterns: readonly string[] = metricMeasurementGrepPatterns(signals);
  if (measurementPatterns.length === 0) return { diagnostics, signals };
  /** Instrument variable names are case-sensitive identifiers. */
  const measurementHits = await locationsForPatterns({
    caseSensitive: true,
    patterns: measurementPatterns,
    reader,
    repository,
  });
  /** Windows starting at each measurement receiver and covering wrapped arguments. */
  const measurementWindows = await readHitWindows({
    linesAfter: measurementWindowLines,
    linesBefore: 0,
    locations: measurementHits.locations,
    reader,
    repository,
  });
  diagnostics.push(...measurementHits.diagnostics, ...measurementWindows.diagnostics);
  return {
    diagnostics,
    signals: withMetricDimensions({
      measurements: extractMetricMeasurements({
        keyBindings: attributeKeyBindings([...primary.windows, ...measurementWindows.windows]),
        windows: measurementWindows.windows,
      }),
      signals,
    }),
  };
};
