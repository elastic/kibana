/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationError } from '../models/operation_result';
import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import { collectGrepPages } from '../source/collect_grep_pages';
import { mapBounded } from '../source/map_bounded';
import {
  commentStateAfter,
  outsideSourceCommentState,
  type SourceCommentState,
} from './source_comment_policy';

/** One Git ERE finds block delimiters and quote context without materializing unrelated repository paths. */
const lexicalContextPattern: string = '([/][*]|[*][/]|["\'`])';
/** Matches the sandbox reader's default scan capacity without reducing complete path coverage. */
const lexicalReadConcurrency: number = 2;

/** Preserves incomplete path-scoped lexical discovery separately from complete no-comment state. */
export interface BlockCommentIndexDiagnostic {
  readonly error: OperationError;
  readonly kind: 'grep' | 'pagination';
  readonly path: string;
  readonly pattern: string;
}

/** Provides repository-derived lexical state at the start of a source line. */
export interface BlockCommentIndex {
  readonly isComplete: (path: string) => boolean;
  readonly stateAtLine: (path: string, line: number) => SourceCommentState;
}

/** Returns an empty index for callers whose candidate paths have no lexical delimiters. */
const emptyIndex = (): BlockCommentIndex => ({
  isComplete: () => true,
  stateAtLine: () => outsideSourceCommentState,
});

/** Reads every paginated lexical-context match for one candidate path. */
const lexicalLinesForPath = async ({
  path,
  reader,
  repository,
}: {
  readonly path: string;
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostics: readonly BlockCommentIndexDiagnostic[];
  readonly lines: readonly { readonly line: number; readonly text: string }[];
}> => {
  /** One line can match several alternatives but needs one quote-aware lexical scan. */
  const lines: Map<number, string> = new Map();
  /** Failures remain observable because an omitted opener cannot prove later source is executable. */
  const diagnostics: BlockCommentIndexDiagnostic[] = [];
  /** Reads every path-scoped page through the shared continuation guard. */
  const collected = await collectGrepPages({
    invalidCursorMessage: () =>
      `Lexical-context pattern ${JSON.stringify(
        lexicalContextPattern
      )} returned a missing or repeated cursor.`,
    reader,
    request: { path, pattern: lexicalContextPattern, repository },
  });
  if (collected.error !== undefined && collected.failureKind !== undefined) {
    diagnostics.push({
      error: collected.error,
      kind: collected.failureKind,
      path,
      pattern: lexicalContextPattern,
    });
  }
  for (const hit of collected.items) lines.set(hit.line, hit.text);
  return { diagnostics, lines: [...lines.entries()].map(([line, text]) => ({ line, text })) };
};

/** Builds lexical state only for deduplicated candidate paths, never for the entire repository. */
export const buildBlockCommentIndex = async ({
  paths,
  reader,
  repository,
}: {
  readonly paths: readonly string[];
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostics: readonly BlockCommentIndexDiagnostic[];
  readonly index: BlockCommentIndex;
}> => {
  /** Stable path order makes diagnostics and index construction deterministic. */
  const candidatePaths: readonly string[] = [...new Set(paths)].sort((left, right) =>
    left.localeCompare(right)
  );
  /** Per-path reads bound retained lexical material to candidate files rather than repository size. */
  const results = await mapBounded(candidatePaths, lexicalReadConcurrency, async (path) => ({
    path,
    ...(await lexicalLinesForPath({ path, reader, repository })),
  }));
  /** Each path contributes independent typed coverage diagnostics. */
  const diagnostics: BlockCommentIndexDiagnostic[] = results.flatMap(
    (result) => result.diagnostics
  );
  /** Failed lexical pages make only their own candidate path incomplete. */
  const incompletePaths: ReadonlySet<string> = new Set(
    results.filter((result) => result.diagnostics.length > 0).map((result) => result.path)
  );
  /** Only compact line-to-state transitions remain after each candidate path is scanned. */
  const transitions: Map<
    string,
    readonly { readonly line: number; readonly state: SourceCommentState }[]
  > = new Map();
  for (const result of results) {
    /** Each candidate file begins outside comments and processes lexical lines in repository order. */
    let state: SourceCommentState = outsideSourceCommentState;
    /** Stores only state changes needed by bounded later windows. */
    const pathTransitions: { readonly line: number; readonly state: SourceCommentState }[] = [];
    for (const { line, text } of [...result.lines].sort((left, right) => left.line - right.line)) {
      // Newline-aware scanning retains template literals but closes ordinary quoted strings between lines.
      state = commentStateAfter({ content: `${text}\n`, initialState: state, path: result.path });
      pathTransitions.push({ line, state });
    }
    transitions.set(result.path, pathTransitions);
  }
  if (transitions.size === 0) return { diagnostics, index: emptyIndex() };
  return {
    diagnostics,
    index: {
      /** Prevents callers from treating failed lexical context as executable source. */
      isComplete: (path: string): boolean => !incompletePaths.has(path),
      /** Same-line content is scanned separately; only earlier transitions determine its initial state. */
      stateAtLine: (path: string, line: number): SourceCommentState => {
        /** Unknown paths and lines before the first lexical transition begin outside comments. */
        const pathTransitions = transitions.get(path) ?? [];
        /** Carries the last lexical state strictly before the requested source line. */
        let state: SourceCommentState = outsideSourceCommentState;
        for (const transition of pathTransitions) {
          if (transition.line >= line) break;
          state = transition.state;
        }
        return state;
      },
    },
  };
};
