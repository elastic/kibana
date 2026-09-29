/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { candidateIdFor } from '../models/candidate_id_codec';
import type { OperationError } from '../models/operation_result';
import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import { collectGrepPages } from '../source/collect_grep_pages';
import { mapBounded } from '../source/map_bounded';
import type { SourceLocation } from '../source_location_codec';
import { loggingIdiomPatterns } from './idiom_patterns';
import { isNonEmittingLoggingLine } from './non_emitting_line_policy';
import { isExcludedLoggingPath } from './path_policy';

/** Serializes complete grep scans so bounded source adapters are not oversubscribed. */
const patternReadConcurrency: number = 1;
/** Maximum concurrent source-window reads; it bounds resource use without reducing coverage. */
const windowReadConcurrency: number = 8;
/** Inclusive line count retained around a matched logging source line. */
const loggingWindowRadius: number = 3;
/** Maximum excerpt characters retained in a classification candidate. */
const maximumExcerptLength: number = 4_000;

/** A candidate ready for logging classification without coupling discovery to workflows. */
export interface LoggingCandidate {
  readonly evidence: readonly SourceLocation[];
  readonly excerpt: string;
  readonly id: string;
}

/** A recoverable discovery error tied to the pattern or source file that caused it. */
export interface LoggingDiscoveryDiagnostic {
  readonly error: OperationError;
  readonly kind: 'grep' | 'pagination' | 'window';
  readonly line?: number;
  readonly path?: string;
  readonly pattern?: string;
}

/** Complete discovery output keeps successful candidates and individual failures separate. */
export interface LoggingDiscoveryResult {
  readonly candidates: readonly LoggingCandidate[];
  readonly diagnostics: readonly LoggingDiscoveryDiagnostic[];
}

/** Sorts source locations in repository order so batching is repeatable. */
const compareLocations = (left: SourceLocation, right: SourceLocation): number =>
  left.path.localeCompare(right.path) || left.line - right.line;

/** Reads every page for one grep pattern or returns a diagnostic when progress is invalid. */
const discoverPatternLocations = async ({
  pattern,
  reader,
  repository,
}: {
  readonly pattern: string;
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostics: readonly LoggingDiscoveryDiagnostic[];
  readonly locations: Map<string, SourceLocation>;
}> => {
  /** Deduplicated raw hits from the current pattern. */
  const locations: Map<string, SourceLocation> = new Map();
  /** Diagnostics preserve partial success rather than converting failure into empty output. */
  const diagnostics: LoggingDiscoveryDiagnostic[] = [];
  /** Reads every immutable grep page through the shared continuation guard. */
  const collected = await collectGrepPages({
    invalidCursorMessage: (cursor) =>
      `Pattern ${JSON.stringify(pattern)} returned missing or repeated cursor ${JSON.stringify(
        cursor
      )}.`,
    reader,
    request: { pattern, repository },
  });
  if (collected.error !== undefined && collected.failureKind !== undefined) {
    diagnostics.push({ error: collected.error, kind: collected.failureKind, pattern });
  }
  for (const hit of collected.items) {
    if (!isExcludedLoggingPath(hit.path)) {
      locations.set(candidateIdFor(hit.path, hit.line), {
        excerpt: hit.text.slice(0, maximumExcerptLength) || ' ',
        line: hit.line,
        path: hit.path,
      });
    }
  }

  return { diagnostics, locations };
};

/** Discovers every standard logging candidate in a resolved repository snapshot. */
export const discoverLoggingCandidates = async ({
  patterns = loggingIdiomPatterns,
  reader,
  repository,
}: {
  /** Supplies validated repository-specific fallback patterns instead of standard idioms when present. */
  readonly patterns?: readonly string[];
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<LoggingDiscoveryResult> => {
  /** Pattern results remain separate so one failure never erases successes from another pattern. */
  const patternResults = await mapBounded(patterns, patternReadConcurrency, async (pattern) =>
    discoverPatternLocations({ pattern, reader, repository })
  );
  /** Globally deduplicated path:line candidates aggregate all overlapping idiom hits. */
  const locations: Map<string, SourceLocation> = new Map();
  /** Discovery diagnostics remain visible to orchestration. */
  const diagnostics: LoggingDiscoveryDiagnostic[] = [];
  for (const result of patternResults) {
    diagnostics.push(...result.diagnostics);
    for (const [id, location] of result.locations) locations.set(id, location);
  }
  /** Stable ordering prevents adapter completion timing from changing downstream batches. */
  const sortedLocations: readonly SourceLocation[] = [...locations.values()].sort(compareLocations);
  /** Results cover all locations, including repositories that exceed legacy sampling caps. */
  const windowResults = await mapBounded(
    sortedLocations,
    windowReadConcurrency,
    async (location) => {
      /** Source windows remain small even for very large files. */
      const startLine: number = Math.max(1, location.line - loggingWindowRadius);
      /** The bounded request is never longer than seven lines. */
      const endLine: number = location.line + loggingWindowRadius;
      /** Adapter failures are represented without pretending a source line was absent. */
      const result = await reader.readWindow({
        endLine,
        path: location.path,
        repository,
        startLine,
      });
      return { location, result };
    }
  );
  /** Candidates preserve source order after concurrent reads. */
  const candidates: LoggingCandidate[] = [];
  for (const { location, result } of windowResults) {
    if (result.status === 'failure') {
      diagnostics.push({
        error: result.error,
        kind: 'window',
        line: location.line,
        path: location.path,
      });
      continue;
    }
    /** A clamped response is valid only when its actual range still contains the grep hit. */
    if (location.line < result.value.startLine || location.line > result.value.endLine) {
      diagnostics.push({
        error: {
          code: 'matched_line_outside_window',
          message: `Window ${result.value.startLine}-${result.value.endLine} omitted matched line ${location.line}.`,
          retryable: false,
        },
        kind: 'window',
        line: location.line,
        path: location.path,
      });
      continue;
    }
    /** Matched-line indexing is relative to the bounded inclusive response. */
    const matchedLine: string = result.value.lines[location.line - result.value.startLine];
    // Only the hit can prove a non-emission; its adjacent context may contain a real call.
    if (isNonEmittingLoggingLine(matchedLine)) continue;
    /** Bounded excerpt preserves multi-line calls while retaining just local evidence. */
    const excerpt: string = result.value.lines.join('\n').trim().slice(0, maximumExcerptLength);
    if (excerpt.length === 0) continue;
    candidates.push({
      evidence: [{ excerpt, line: location.line, path: location.path }],
      excerpt,
      id: candidateIdFor(location.path, location.line),
    });
  }

  return { candidates, diagnostics };
};
