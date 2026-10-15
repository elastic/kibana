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
import {
  declaredWrapperName,
  enclosingDeclarationIndex,
  hasDynamicMessage,
} from './logging_wrappers';
import { isNonEmittingLoggingLine } from './non_emitting_line_policy';
import { isExcludedLoggingPath } from './path_policy';

/** Serializes complete grep scans so bounded source adapters are not oversubscribed. */
export const patternReadConcurrency: number = 1;
/** Maximum concurrent source-window reads; it bounds resource use without reducing coverage. */
const windowReadConcurrency: number = 8;
/** Inclusive line count retained around a matched logging source line. */
const loggingWindowRadius: number = 3;
/** Lines read above a candidate window to find the function that holds a wrapper's sink. */
const wrapperDeclarationLookback: number = 40;
/** Lines kept from a wrapper declaration, including the declaration line. */
const wrapperDeclarationLines: number = 4;
/** Maximum excerpt characters retained in a classification candidate. */
const maximumExcerptLength: number = 4_000;

/** Names a call to a logging wrapper found by the second discovery pass. */
export interface LoggingWrapperCall {
  /** The wrapper name plus its aliases, as they appear at call sites. */
  readonly callNames: readonly string[];
  readonly name: string;
}

/** A candidate ready for logging classification without coupling discovery to workflows. */
export interface LoggingCandidate {
  /** A wrapper the sink sits in, because its message argument uses one of the wrapper's parameters. */
  readonly declaredWrapperName?: string;
  readonly evidence: readonly SourceLocation[];
  readonly excerpt: string;
  readonly id: string;
  /** Zero-based line in `sourceWindow` that holds the grep hit. */
  readonly matchedLineIndex: number;
  /** Untrimmed source window, bounded like `excerpt`, whose indentation supports statement analysis. */
  readonly sourceWindow: string;
  /** Set when the candidate is a call to a logging wrapper rather than a standard idiom. */
  readonly wrapper?: LoggingWrapperCall;
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
export const compareLocations = (left: SourceLocation, right: SourceLocation): number =>
  left.path.localeCompare(right.path) || left.line - right.line;

/** Reads every page for one grep pattern or returns a diagnostic when progress is invalid. */
export const discoverPatternLocations = async ({
  caseSensitive,
  path,
  pattern,
  reader,
  repository,
}: {
  readonly caseSensitive?: boolean;
  readonly path?: string;
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
    request: {
      pattern,
      repository,
      ...(caseSensitive === undefined ? {} : { caseSensitive }),
      ...(path === undefined ? {} : { path }),
    },
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

/** A candidate whose window was read, with the first line number of that window. */
interface WindowedCandidate {
  readonly candidate: LoggingCandidate;
  readonly windowStartLine: number;
}

/** Reads the bounded source window around each location and builds a candidate from it. */
export const readCandidateWindows = async ({
  locations,
  reader,
  repository,
}: {
  readonly locations: readonly SourceLocation[];
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly candidates: readonly WindowedCandidate[];
  readonly diagnostics: readonly LoggingDiscoveryDiagnostic[];
}> => {
  /** Results cover all locations, including repositories that exceed legacy sampling caps. */
  const windowResults = await mapBounded(locations, windowReadConcurrency, async (location) => {
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
  });
  /** Candidates preserve source order after concurrent reads. */
  const candidates: WindowedCandidate[] = [];
  const diagnostics: LoggingDiscoveryDiagnostic[] = [];
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
    /** Untrimmed window text keeps the line positions and indentation reported by the reader. */
    const windowText: string = result.value.lines.join('\n');
    /** Bounded excerpt preserves multi-line calls while retaining just local evidence. */
    const excerpt: string = windowText.trim().slice(0, maximumExcerptLength);
    if (excerpt.length === 0) continue;
    /** Leading whitespace that trimming removes before the excerpt starts. */
    const leadingWhitespace: number = windowText.length - windowText.trimStart().length;
    candidates.push({
      candidate: {
        evidence: [{ excerpt, line: location.line, path: location.path }],
        excerpt,
        id: candidateIdFor(location.path, location.line),
        matchedLineIndex: location.line - result.value.startLine,
        sourceWindow: windowText.slice(0, leadingWhitespace + maximumExcerptLength),
      },
      windowStartLine: result.value.startLine,
    });
  }
  return { candidates, diagnostics };
};

/**
 * Adds the declaration of the enclosing function as evidence when a call logs a non-literal
 * message and that declaration is above the candidate window, so the classifier can recognise a
 * logging wrapper whose sink is several lines below its declaration.
 */
const withWrapperContext = async ({
  reader,
  repository,
  windowed,
}: {
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
  readonly windowed: WindowedCandidate;
}): Promise<
  | { readonly candidate: LoggingCandidate; readonly diagnostic?: undefined }
  | { readonly candidate?: undefined; readonly diagnostic: LoggingDiscoveryDiagnostic }
> => {
  const { candidate, windowStartLine } = windowed;
  if (!hasDynamicMessage(candidate.sourceWindow, candidate.matchedLineIndex)) return { candidate };
  /** Adds the wrapper name a declaration line proves, if any. */
  const withDeclaredName = (
    withContext: LoggingCandidate,
    declarationLine: string
  ): LoggingCandidate => {
    const name: string | undefined = declaredWrapperName({
      declarationLine,
      matchedLineIndex: candidate.matchedLineIndex,
      sourceWindow: candidate.sourceWindow,
    });
    return name === undefined ? withContext : { ...withContext, declaredWrapperName: name };
  };
  /** A declaration inside the window is already visible to the classifier. */
  const windowLines: readonly string[] = candidate.sourceWindow.split('\n');
  const windowIndex: number | undefined = enclosingDeclarationIndex(
    windowLines,
    candidate.matchedLineIndex
  );
  if (windowIndex !== undefined) {
    return { candidate: withDeclaredName(candidate, windowLines[windowIndex]) };
  }
  if (windowStartLine <= 1) return { candidate };
  const location: SourceLocation = candidate.evidence[0];
  const result = await reader.readWindow({
    endLine: windowStartLine - 1,
    path: location.path,
    repository,
    startLine: Math.max(1, windowStartLine - wrapperDeclarationLookback),
  });
  if (result.status === 'failure') {
    return {
      diagnostic: {
        error: result.error,
        kind: 'window',
        line: location.line,
        path: location.path,
      },
    };
  }
  const index: number | undefined = enclosingDeclarationIndex(
    result.value.lines,
    result.value.lines.length
  );
  if (index === undefined) return { candidate };
  const excerpt: string = result.value.lines
    .slice(index, index + wrapperDeclarationLines)
    .join('\n')
    .trim()
    .slice(0, maximumExcerptLength);
  if (excerpt.length === 0) return { candidate };
  return {
    candidate: withDeclaredName(
      {
        ...candidate,
        evidence: [
          ...candidate.evidence,
          { excerpt, line: result.value.startLine + index, path: location.path },
        ],
      },
      result.value.lines[index]
    ),
  };
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
  const windows = await readCandidateWindows({ locations: sortedLocations, reader, repository });
  diagnostics.push(...windows.diagnostics);
  const contextResults = await mapBounded(windows.candidates, windowReadConcurrency, (windowed) =>
    withWrapperContext({ reader, repository, windowed })
  );
  const candidates: LoggingCandidate[] = [];
  for (const result of contextResults) {
    if (result.diagnostic !== undefined) diagnostics.push(result.diagnostic);
    else candidates.push(result.candidate);
  }

  return { candidates, diagnostics };
};
