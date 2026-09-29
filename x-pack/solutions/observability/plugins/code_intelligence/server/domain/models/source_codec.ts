/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { positiveIntegerRt, repositoryRelativePathRt } from '../source_location_codec';
import { resolvedRepositoryRt } from './repository_codec';

/** Validates repository-scoped grep requests and optional paging filters. */
export const grepRequestRt = t.intersection([
  t.type({ pattern: t.string, repository: resolvedRepositoryRt }),
  t.partial({ caseSensitive: t.boolean, cursor: t.string, path: repositoryRelativePathRt }),
]);
export type GrepRequest = t.TypeOf<typeof grepRequestRt>;

/** Describes one source match with its repository path and line. */
export const grepMatchRt = t.type({
  line: positiveIntegerRt,
  path: repositoryRelativePathRt,
  text: t.string,
});
export type GrepMatch = t.TypeOf<typeof grepMatchRt>;

/** Caps inclusive source windows so Phase 0 evidence reads remain bounded. */
export const MAX_SOURCE_WINDOW_LINES = 1_000;

/**
 * Describes an inclusive source-line range to retrieve.
 * Readers may clamp this requested range to existing file boundaries on a successful response.
 */
const sourceWindowRequestBaseRt = t.type({
  endLine: positiveIntegerRt,
  path: repositoryRelativePathRt,
  repository: resolvedRepositoryRt,
  startLine: positiveIntegerRt,
});
/** Validates source-window ranges before a reader performs I/O. */
export const sourceWindowRequestRt = new t.Type<
  t.TypeOf<typeof sourceWindowRequestBaseRt>,
  unknown,
  unknown
>(
  'SourceWindowRequest',
  // Inclusive ranges must never invert, otherwise callers could mistake an empty window for coverage.
  (value): value is t.TypeOf<typeof sourceWindowRequestBaseRt> =>
    sourceWindowRequestBaseRt.is(value) &&
    value.endLine >= value.startLine &&
    value.endLine - value.startLine + 1 <= MAX_SOURCE_WINDOW_LINES,
  (value, context) => {
    /** Holds validated external data for the following invariant checks. */
    const decoded = sourceWindowRequestBaseRt.validate(value, context);
    return decoded._tag === 'Right' &&
      (decoded.right.endLine < decoded.right.startLine ||
        decoded.right.endLine - decoded.right.startLine + 1 > MAX_SOURCE_WINDOW_LINES)
      ? t.failure(value, context, 'Source window must be ordered and no more than 1,000 lines.')
      : decoded;
  },
  (value) => value
);
export type SourceWindowRequest = t.TypeOf<typeof sourceWindowRequestRt>;

/**
 * Describes source lines returned for an inclusive range.
 * Bounds identify the actual range after boundary clamping; lines fully cover every existing line in it.
 */
const sourceWindowBaseRt = t.type({
  endLine: positiveIntegerRt,
  lines: t.readonlyArray(t.string),
  path: repositoryRelativePathRt,
  startLine: positiveIntegerRt,
});
/** Validates that returned lines fully cover the actual returned (possibly clamped) window. */
export const sourceWindowRt = new t.Type<t.TypeOf<typeof sourceWindowBaseRt>, unknown, unknown>(
  'SourceWindow',
  // The line count proves the adapter returned the complete actual clamped window, not a truncated page.
  (value): value is t.TypeOf<typeof sourceWindowBaseRt> =>
    sourceWindowBaseRt.is(value) &&
    value.endLine >= value.startLine &&
    value.endLine - value.startLine + 1 <= MAX_SOURCE_WINDOW_LINES &&
    value.lines.length === value.endLine - value.startLine + 1,
  (value, context) => {
    /** Holds validated external data for the following invariant checks. */
    const decoded = sourceWindowBaseRt.validate(value, context);
    if (decoded._tag === 'Left') return decoded;
    /** Exposes the inclusive bounds and payload used to verify complete window coverage. */
    const { endLine, lines, startLine } = decoded.right;
    return endLine >= startLine &&
      endLine - startLine + 1 <= MAX_SOURCE_WINDOW_LINES &&
      lines.length === endLine - startLine + 1
      ? decoded
      : t.failure(value, context, 'Window must be bounded and cover its inclusive range.');
  },
  (value) => value
);
export type SourceWindow = t.TypeOf<typeof sourceWindowRt>;

/** Validates paged source-tree requests and their continuation options. */
export const sourcePageRequestRt = t.intersection([
  t.type({ repository: resolvedRepositoryRt }),
  t.partial({ cursor: t.string, path: repositoryRelativePathRt, recursive: t.boolean }),
]);
export type SourcePageRequest = t.TypeOf<typeof sourcePageRequestRt>;

/** Describes a repository-relative path returned by tree discovery. */
export const sourcePathRt = t.type({ path: repositoryRelativePathRt });
export type SourcePath = t.TypeOf<typeof sourcePathRt>;
