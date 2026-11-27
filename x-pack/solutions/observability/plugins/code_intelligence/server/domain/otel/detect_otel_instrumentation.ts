/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationError } from '../models/operation_result';
import type { ResolvedRepository } from '../models/repository_codec';
import type { SourceReader } from '../ports/source_reader';
import {
  otelInstrumentationPatterns,
  type OtelInstrumentationKind,
} from './instrumentation_patterns';
import { buildBlockCommentIndex, type BlockCommentIndex } from './block_comment_index';
import { isProductionOtelPath } from './path_policy';
import { otelReceiverCallPattern } from './receiver_policy';
import { hasSupportedStatusErrorArgument } from './status_call_policy';
import { commentStateAfter } from './source_comment_policy';
import {
  isNonExecutableAtOffset,
  sourceWithoutComments,
  type SourceCommentState,
} from './source_comment_policy';

/** Counts repository-wide OTel import and instrumentation idiom sites. */
export type OtelSignalCounts = Readonly<Record<OtelInstrumentationKind, number>>;

/** Represents the OTel instrumentation gate calculated from every successfully read pattern. */
export interface OtelInstrumentationDetection {
  readonly hasOtel: boolean;
  readonly signalCounts: OtelSignalCounts;
}

/** Preserves an incomplete OTel gate search without conflating it with a complete empty search. */
export interface OtelInstrumentationDiagnostic {
  readonly error: OperationError;
  readonly kind: 'grep' | 'pagination' | 'window';
  readonly line?: number;
  readonly path?: string;
  readonly pattern?: string;
}

/** Returns OTel gate evidence and every independent source-access diagnostic. */
export interface OtelInstrumentationDetectionResult {
  readonly detection: OtelInstrumentationDetection;
  readonly diagnostics: readonly OtelInstrumentationDiagnostic[];
}

/** Matches a supported OTel, HTTP, or gRPC ecosystem module specifier. */
const otelModuleSpecifier: string =
  '(?:@opentelemetry/[\\w@./-]+|go\\.opentelemetry\\.io/[\\w@./-]+|io\\.opentelemetry(?:\\.(?:[\\w$]+|\\*))*|opentelemetry(?:[./\\\\][\\w@./\\\\-]+)*|grpc[.]otel[\\w@./-]*|otelgrpc[\\w@./-]*|instrumentation[-./](?:http|fetch|requests|urllib3|aspnetcore|sinatra)[\\w@./-]*)';
/** Matches a standalone executable OpenTelemetry configuration key. */
const otelConfigKey: RegExp = /\bOTEL_[A-Z0-9_]+\b/i;
/** Returns the structural import expression accepted for one source language. */
const importExpressionForPath = (path: string): RegExp => {
  if (/\.(?:[cm]?[jt]sx?)$/i.test(path))
    return new RegExp(
      String.raw`\bimport\s+(?:["']${otelModuleSpecifier}["']|[^;\n]*?\bfrom\s+["']${otelModuleSpecifier}["'])|^\s*(?:\}\s*)?from\s+["']${otelModuleSpecifier}["']|\bimport\s*\(\s*["']${otelModuleSpecifier}["']\s*\)|\brequire\s*\(\s*["']${otelModuleSpecifier}["']\s*\)`,
      'gim'
    );
  if (/\.py$/i.test(path))
    return new RegExp(
      String.raw`\bimport\s+${otelModuleSpecifier}(?:\s+as\s+\w+)?\b|\bfrom\s+${otelModuleSpecifier}\s+import\b`,
      'gi'
    );
  if (/\.rb$/i.test(path))
    return new RegExp(String.raw`\brequire\s*["']${otelModuleSpecifier}["']`, 'gi');
  if (/\.java$/i.test(path))
    return new RegExp(String.raw`\bimport\s+(?:static\s+)?${otelModuleSpecifier}\s*;`, 'gi');
  if (/\.(?:kt|kts)$/i.test(path))
    return new RegExp(
      String.raw`\bimport\s+io\.opentelemetry(?:\.[\w$]+)*(?:\.\*)?(?:\s+as\s+\w+)?\s*;?\s*(?=//|/\*|$)`,
      'gi'
    );
  if (/\.scala$/i.test(path))
    return new RegExp(
      String.raw`(?:\bimport|,)\s+io\.opentelemetry(?:\.[\w$]+)*(?:\.(?:\*|_)|\.\{[^}\n]+\})?(?:\s+(?:as|=>)\s+\w+)?\s*;?\s*(?=,|//|/\*|$)`,
      'gi'
    );
  if (/\.cs$/i.test(path))
    return new RegExp(String.raw`\busing\s+(?:\w+\s*=\s*)?${otelModuleSpecifier}\s*;`, 'gi');
  if (/\.rs$/i.test(path))
    return new RegExp(
      String.raw`\buse\s+(?:::)?(?:opentelemetry|tracing_opentelemetry|opentelemetry_(?:api|appender_(?:log|tracing)|aws|contrib|datadog|dynatrace|http|jaeger|otlp|prometheus|proto|resource_detectors|runtime|sdk|semantic_conventions|stdout|zipkin)|\{\s*(?:opentelemetry|tracing_opentelemetry|opentelemetry_(?:api|appender_(?:log|tracing)|aws|contrib|datadog|dynatrace|http|jaeger|otlp|prometheus|proto|resource_detectors|runtime|sdk|semantic_conventions|stdout|zipkin)))(?:\s+as\s+\w+)?(?:::|;|,|\})`,
      'gi'
    );
  if (/\.php$/i.test(path))
    return new RegExp(String.raw`\buse\s+${otelModuleSpecifier}(?:\\|;|\{)`, 'gi');
  if (/\.go$/i.test(path))
    return new RegExp(
      String.raw`^\s*import\s+(?:(?:[._]|[A-Za-z_]\w*)\s+)?["']go\.opentelemetry\.io/[^"']+["']\s*$`,
      'gi'
    );
  return /$a/gi;
};
/** Returns whether import/config evidence begins outside comments and string literals. */
const hasExecutableImportOrConfig = ({
  content,
  initialCommentState,
  path,
}: {
  readonly content: string;
  readonly initialCommentState: SourceCommentState;
  readonly path: string;
}): boolean => {
  /** Config is language-independent; every module form is constrained by its source path. */
  const configMatches: RegExp = new RegExp(otelConfigKey.source, 'gi');
  /** Pairs the path-specific import matcher with the configuration-key matcher. */
  const matches: RegExp[] = [importExpressionForPath(path), configMatches];
  for (const expression of matches)
    for (const match of content.matchAll(expression)) {
      if (
        !isNonExecutableAtOffset({
          content,
          initialState: initialCommentState,
          offset: match.index ?? 0,
          path,
        })
      )
        return true;
    }
  return false;
};

/** Identifies idioms also used by browser DOM nodes and ordinary event emitters. */
const ambiguousKinds: ReadonlySet<OtelInstrumentationKind> = new Set([
  'add_event',
  'set_attribute',
]);
/** Identifies idioms that require a receiver directly attached to the triggering method call. */
const receiverScopedKinds: ReadonlySet<OtelInstrumentationKind> = new Set([
  ...ambiguousKinds,
  'record_exception',
  'set_status_error',
]);
/** Inclusive source lines retained around status hits for multiline error-status proof. */
const statusWindowRadius: number = 3;
/** Requires generic Go Start calls to use a tracer-named receiver rather than an unrelated worker API. */
const goTracerStart: RegExp = /\b[\w.]*tracer[\w.]*(?:\s*\([^\n)]*\))?\s*\.\s*Start\s*\(/i;
/** Matches one complete Go grouped-import module path, optionally preceded by its import alias. */
const goGroupedOtelImport: RegExp =
  /^\s*(?:(?:[._]|[A-Za-z_]\w*)\s+)?["']go\.opentelemetry\.io\/[^"']+["']\s*$/;
/** Matches the exact Rust crate roots approved as OpenTelemetry ecosystem imports. */
const rustApprovedOtelCrate: string =
  '(?:opentelemetry_(?:api|appender_(?:log|tracing)|aws|contrib|datadog|dynatrace|http|jaeger|otlp|prometheus|proto|resource_detectors|runtime|sdk|semantic_conventions|stdout|zipkin)|opentelemetry|tracing_opentelemetry)';
/** Matches an approved Rust crate entry at a top-level `use { ... }` group position. */
const rustGroupedOtelUseEntry: RegExp = new RegExp(
  String.raw`(?:^\s*|[,{]\s*)(?:::)?${rustApprovedOtelCrate}(?=\s*(?:::|\bas\b|,|\}))`
);
/** Finds the approved crate token after a grouped-entry delimiter has been matched. */
const rustApprovedOtelCrateToken: RegExp = new RegExp(rustApprovedOtelCrate);
/** Maximum preceding source lines read to prove an enclosing grouped import or use statement. */
const groupedImportContextLines: number = 1_000;

/** Proves that a grouped Go module-path hit remains inside an executable `import (` block. */
const isGoGroupedImportEntry = async ({
  initialState,
  line,
  path,
  reader,
  repository,
}: {
  readonly initialState: SourceCommentState;
  readonly line: number;
  readonly path: string;
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostic?: OtelInstrumentationDiagnostic;
  readonly eligible: boolean;
}> => {
  /** The bounded read includes the hit and at most 999 preceding source lines. */
  const startLine: number = Math.max(1, line - groupedImportContextLines + 1);
  /** Retrieves exactly the source range whose starting lexical state was supplied by the caller. */
  const window = await reader.readWindow({
    endLine: line,
    path,
    repository,
    startLine,
  });
  if (window.status === 'failure')
    return {
      diagnostic: { error: window.error, kind: 'window', line, path },
      eligible: false,
    };
  /** Lexical state is reconstructed from the bounded window's first source line. */
  let state: SourceCommentState = initialState;
  /** An import group remains open until an executable closing parenthesis is reached. */
  let importGroupOpen: boolean = false;
  for (const sourceLine of window.value.lines) {
    /** Comment masking preserves source positions for executable-token verification. */
    const executableLine: string = sourceWithoutComments({
      content: sourceLine,
      initialState: state,
      path,
    });
    if (/^\s*import\s*\(/.test(executableLine)) importGroupOpen = true;
    else if (importGroupOpen && /^\s*\)/.test(executableLine)) importGroupOpen = false;
    state = commentStateAfter({ content: `${sourceLine}\n`, initialState: state, path });
  }
  return { eligible: importGroupOpen };
};

/** Proves that the requested Rust crate hit remains inside an executable `use { ... }` group. */
const isRustGroupedUseEntry = async ({
  blockComments,
  line,
  path,
  reader,
  repository,
}: {
  readonly blockComments: BlockCommentIndex;
  readonly line: number;
  readonly path: string;
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostic?: OtelInstrumentationDiagnostic;
  readonly eligible: boolean;
}> => {
  /** Retains bounded windows until source start so a distant group opener cannot silently invalidate coverage. */
  const windows: { readonly lines: readonly string[]; readonly startLine: number }[] = [];
  /** Ends the next backwards request immediately before the previously read bounded window. */
  let endLine: number = line;
  for (;;) {
    /** Each SourceReader request remains bounded to the requested maximum context size. */
    const startLine: number = Math.max(1, endLine - groupedImportContextLines + 1);
    /** Retrieves one exact bounded range with lexical state reconstructed only when it is scanned. */
    const window = await reader.readWindow({ endLine, path, repository, startLine });
    if (window.status === 'failure')
      return {
        diagnostic: { error: window.error, kind: 'window', line, path },
        eligible: false,
      };
    windows.push(window.value);
    if (startLine === 1) break;
    endLine = startLine - 1;
  }
  /** Tracks the brace depth of the current grouped use, where 1 is its top-level entry list. */
  let useGroupDepth: number | undefined;
  for (const window of windows.reverse()) {
    /** Each bounded window inherits lexical state from its own exact requested start line. */
    let state: SourceCommentState = blockComments.stateAtLine(path, window.startLine);
    for (const [index, sourceLine] of window.lines.entries()) {
      /** Comment masking preserves source positions for group and crate-entry verification. */
      const executableLine: string = sourceWithoutComments({
        content: sourceLine,
        initialState: state,
        path,
      });
      /** A grouped use begins before its opening brace is included in this line's depth balance. */
      const opener: RegExpMatchArray | null =
        /^\s*(?:pub(?:\s*\([^)]*\))?\s+)?use\s+(?:::)?\{/.exec(executableLine);
      if (useGroupDepth === undefined && opener !== null) useGroupDepth = 0;
      if (useGroupDepth !== undefined && window.startLine + index === line) {
        /** Global matching considers every approved root on the triggering source line. */
        const roots: RegExp = new RegExp(rustGroupedOtelUseEntry.source, 'g');
        for (const root of executableLine.matchAll(roots)) {
          /** Locates the crate token after any comma or opening-brace delimiter in the grouped-entry match. */
          const crateToken: RegExpMatchArray | null = rustApprovedOtelCrateToken.exec(root[0]);
          /** Braces before the crate token distinguish top-level entries from nested crate paths. */
          const prefix: string = executableLine.slice(
            0,
            (root.index ?? 0) + (crateToken?.index ?? 0)
          );
          /** Opening braces increase and closing braces decrease the enclosing Rust use depth. */
          const depthAtRoot: number =
            useGroupDepth +
            [...prefix].filter((character) => character === '{').length -
            [...prefix].filter((character) => character === '}').length;
          if (depthAtRoot === 1) return { eligible: true };
        }
      }
      if (useGroupDepth !== undefined) {
        /** Full-line brace balance closes the group only after all nested groups close. */
        useGroupDepth +=
          [...executableLine].filter((character) => character === '{').length -
          [...executableLine].filter((character) => character === '}').length;
        if (useGroupDepth <= 0) useGroupDepth = undefined;
      }
      state = commentStateAfter({ content: `${sourceLine}\n`, initialState: state, path });
    }
  }
  return { eligible: false };
};

/** Creates an immutable zero-value count vector for one detection attempt. */
const emptyCounts = (): OtelSignalCounts => ({
  add_event: 0,
  create_metric: 0,
  instrumentation_grpc: 0,
  instrumentation_http: 0,
  instrumentation_other: 0,
  record_exception: 0,
  set_attribute: 0,
  set_status_error: 0,
  start_span: 0,
});

/** Returns the first direct OTel receiver call outside comments, if one exists. */
const uncommentedOtelReceiverCall = (
  content: string,
  method: string,
  initialBlockComment = false,
  path: string
): RegExpMatchArray | undefined => {
  /** Global matching inspects every direct call rather than trusting a commented first match. */
  const calls: RegExp = new RegExp(otelReceiverCallPattern(method).source, 'gi');
  for (const match of content.matchAll(calls)) {
    if (
      !isNonExecutableAtOffset({
        content,
        initialState: { inBlockComment: initialBlockComment },
        offset: match.index ?? 0,
        path,
      })
    )
      return match;
  }
  return undefined;
};

/** Returns whether source text contains a direct OTel receiver call only within a comment. */
const hasCommentedOtelReceiverCall = (
  content: string,
  method: string,
  initialBlockComment = false,
  path: string
): boolean => {
  /** Global matching inspects all direct calls because one line can contain several source fragments. */
  const calls: RegExp = new RegExp(otelReceiverCallPattern(method).source, 'gi');
  for (const match of content.matchAll(calls)) {
    if (
      isNonExecutableAtOffset({
        content,
        initialState: { inBlockComment: initialBlockComment },
        offset: match.index ?? 0,
        path,
      })
    )
      return true;
  }
  return false;
};

/** Returns whether a grep hit is production OTel evidence for the requested idiom. */
const isEligibleSite = ({
  content,
  kind,
  pattern,
  initialBlockComment = false,
  initialCommentState,
  path,
}: {
  readonly content: string;
  readonly kind: OtelInstrumentationKind;
  readonly pattern: string;
  readonly initialBlockComment?: boolean;
  readonly initialCommentState?: SourceCommentState;
  readonly path: string;
}): boolean => {
  if (!isProductionOtelPath(path)) return false;
  /** Comment-masked source drives imports and config eligibility rather than raw grep text. */
  const executableContent: string = sourceWithoutComments({
    content,
    initialState: initialCommentState ?? { inBlockComment: initialBlockComment },
    path,
  });
  if (kind.startsWith('instrumentation_')) {
    return hasExecutableImportOrConfig({
      content,
      initialCommentState: initialCommentState ?? { inBlockComment: initialBlockComment },
      path,
    });
  }
  // A generic `.Start(` match is common outside OTel; only tracer-named receivers establish its meaning.
  if (kind === 'start_span' && /\.Start\s*\(/.test(executableContent))
    return goTracerStart.test(executableContent);
  if (!receiverScopedKinds.has(kind)) {
    /** The triggering grep expression identifies the idiom without accepting a quoted example on its line. */
    const matches: RegExp = new RegExp(pattern, 'gi');
    for (const match of content.matchAll(matches)) {
      if (
        !isNonExecutableAtOffset({
          content,
          initialState: initialCommentState ?? { inBlockComment: initialBlockComment },
          offset: match.index ?? 0,
          path,
        })
      )
        return true;
    }
    return false;
  }
  if (
    uncommentedOtelReceiverCall(
      executableContent,
      methodForReceiverScopedKind(kind),
      false,
      path
    ) === undefined
  )
    return false;
  return kind !== 'set_status_error' || hasOtelErrorStatusArguments(executableContent, false, path);
};

/** Returns the method family whose receiver must identify the requested OTel idiom. */
const methodForReceiverScopedKind = (kind: OtelInstrumentationKind): string => {
  if (kind === 'add_event') return '(?:addEvent|add_event|AddEvent)';
  if (kind === 'set_attribute')
    return '(?:setAttribute|setAttributes|set_attribute|SetTag|SpanAttribute)';
  if (kind === 'record_exception')
    return '(?:recordException|record_exception|RecordException|RecordError|record_error)';
  return '(?:setStatus|set_status|SetStatus)';
};

/** Returns whether one completed OTel status call contains an explicit error marker in its arguments. */
const hasOtelErrorStatusArguments = (
  content: string,
  initialBlockComment = false,
  path: string
): boolean => {
  /** The global expression finds each direct status call without accepting unrelated status methods. */
  const statusCalls: RegExp = new RegExp(
    otelReceiverCallPattern(methodForReceiverScopedKind('set_status_error')).source,
    'gi'
  );
  for (const match of content.matchAll(statusCalls)) {
    if (
      isNonExecutableAtOffset({
        content,
        initialState: { inBlockComment: initialBlockComment },
        offset: match.index ?? 0,
        path,
      })
    )
      continue;
    /** The opening parenthesis is retained by the receiver-call pattern and starts argument scanning. */
    const openParenthesis: number = (match.index ?? 0) + match[0].lastIndexOf('(');
    if (hasSupportedStatusErrorArgument({ content, openParenthesis, path })) return true;
  }
  return false;
};

/** Validates the first direct OTel status call in hit-correlated fallback content only. */
const firstOtelErrorStatusArguments = (
  content: string,
  initialBlockComment = false,
  path: string
): boolean => {
  /** The first matching receiver call starts the only status argument list eligible for this grep hit. */
  const statusCall: RegExpMatchArray | undefined =
    new RegExp(
      otelReceiverCallPattern(methodForReceiverScopedKind('set_status_error')).source,
      'i'
    ).exec(content) ?? undefined;
  if (statusCall === undefined) return false;
  /** The opening parenthesis begins the bounded balanced-argument scan for this exact call. */
  const openParenthesis: number = (statusCall.index ?? 0) + statusCall[0].lastIndexOf('(');
  if (
    isNonExecutableAtOffset({
      content,
      initialState: { inBlockComment: initialBlockComment },
      offset: statusCall.index ?? 0,
      path,
    })
  )
    return false;
  return hasSupportedStatusErrorArgument({ content, openParenthesis, path });
};

/** Validates the first status method token in the triggering hit content without accepting prior calls. */
const statusErrorArgumentsAtMethod = (content: string, path: string): boolean => {
  /** The first method token belongs to the triggering grep-hit line or its continuation only. */
  const method: RegExpMatchArray | undefined =
    /(?:setStatus|set_status|SetStatus)\s*\(/.exec(content) ?? undefined;
  if (method === undefined) return false;
  /** The matched opening parenthesis starts the exact balanced status argument list. */
  const openParenthesis: number = (method.index ?? 0) + method[0].lastIndexOf('(');
  return hasSupportedStatusErrorArgument({ content, openParenthesis, path });
};

/** Validates only the call started on a grep hit and its immediately attached continuation lines. */
const isOtelCallAtHit = ({
  initialCommentState,
  kind,
  line,
  path,
  window,
}: {
  readonly initialCommentState: SourceCommentState;
  readonly kind: OtelInstrumentationKind;
  readonly line: number;
  readonly path: string;
  readonly window: { readonly lines: readonly string[]; readonly startLine: number };
}): boolean => {
  /** The grep hit determines the one call that may contribute a fallback count. */
  const hitIndex: number = line - window.startLine;
  /** The physical grep-hit source line anchors fallback eligibility. */
  const hitLine: string | undefined = window.lines[hitIndex];
  if (hitLine === undefined) return false;
  /** The inherited lexical state masks calls inside multiline literals before fallback validation. */
  const executableHitLine: string = sourceWithoutComments({
    content: hitLine,
    initialState: initialCommentState,
    path,
  });
  /** The method must be on the grep hit, not on an unrelated nearby source line. */
  const method: string = methodForReceiverScopedKind(kind);
  /** Content begins at the status call unless a fluent receiver must be prepended. */
  const callContent: string = window.lines
    .slice(hitIndex, hitIndex + statusWindowRadius + 1)
    .join('\n');
  /** The status scanner begins at the receiver line when a fluent continuation is used. */
  let callInitialBlockComment: boolean = false;
  /** Fluent receivers require a different status anchor because their method begins on the hit line. */
  let fluentReceiver: boolean = false;
  if (uncommentedOtelReceiverCall(executableHitLine, method, false, path) !== undefined) {
    if (kind !== 'set_status_error') return true;
  } else {
    /** A fluent continuation can put the receiver on exactly the preceding non-comment line. */
    const precedingLine: string | undefined = window.lines[hitIndex - 1];
    if (
      precedingLine === undefined ||
      !/\b(?:span|otel_?span|active_?span|current_?span|activity|tracer|meter|scope)\b\s*$/i.test(
        precedingLine
      ) ||
      !new RegExp(`^\\s*(?:\\.|->)\\s*${method}\\s*\\(`).test(executableHitLine)
    )
      return false;
    if (kind !== 'set_status_error') return true;
    fluentReceiver = true;
    callInitialBlockComment = false;
  }
  return fluentReceiver
    ? statusErrorArgumentsAtMethod(callContent, path)
    : firstOtelErrorStatusArguments(callContent, callInitialBlockComment, path);
};

/** Applies the import-or-three-idiom gate to all successfully read OTel pattern locations. */
const detectionFrom = (signalCounts: OtelSignalCounts): OtelInstrumentationDetection => {
  /** Import sites are independently sufficient OTel evidence. */
  const importsDetected: boolean =
    signalCounts.instrumentation_grpc +
      signalCounts.instrumentation_http +
      signalCounts.instrumentation_other >
    0;
  /** Ambiguous calls are counted only after receiver filtering above. */
  const idiomSites: number =
    signalCounts.start_span +
    signalCounts.set_attribute +
    signalCounts.add_event +
    signalCounts.record_exception +
    signalCounts.set_status_error +
    signalCounts.create_metric;
  return { hasOtel: importsDetected || idiomSites >= 3, signalCounts };
};

/** Reads every grep page for one pattern while retaining partial locations and typed failures. */
const countPatternSites = async ({
  blockCommentCache,
  kind,
  pattern,
  reader,
  repository,
}: {
  readonly blockCommentCache: Map<string, BlockCommentIndex>;
  readonly kind: OtelInstrumentationKind;
  readonly pattern: string;
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<{
  readonly diagnostics: readonly OtelInstrumentationDiagnostic[];
  readonly locations: ReadonlySet<string>;
}> => {
  /** Locations deduplicate overlapping matches from repeated source text on a line. */
  const locations: Set<string> = new Set();
  /** Diagnostics retain incomplete coverage when a pattern cannot finish. */
  const diagnostics: OtelInstrumentationDiagnostic[] = [];
  /** Cursors defend against adapters that report incomplete pages without progress. */
  const cursors: Set<string> = new Set();
  /** Identifies the next page only after verified adapter progress. */
  let cursor: string | undefined;
  for (;;) {
    /** Reader requests have no hit limit or path filter, preserving repository coverage. */
    const page = await reader.grep({
      pattern,
      repository,
      ...(cursor === undefined ? {} : { cursor }),
    });
    if (page.status === 'failure') {
      diagnostics.push({ error: page.error, kind: 'grep', pattern });
      break;
    }
    /** One grep page batches unknown production paths into a bounded multi-path lexical request. */
    const uncachedPaths: readonly string[] = [
      ...new Set(
        page.items
          .filter((hit) => isProductionOtelPath(hit.path) && !blockCommentCache.has(hit.path))
          .map((hit) => hit.path)
      ),
    ].sort((left, right) => left.localeCompare(right));
    if (uncachedPaths.length > 0) {
      /** The shared result provides path-specific views while retaining deterministic diagnostics. */
      const lexicalResult = await buildBlockCommentIndex({
        paths: uncachedPaths,
        reader,
        repository,
      });
      for (const path of uncachedPaths) blockCommentCache.set(path, lexicalResult.index);
      diagnostics.push(...lexicalResult.diagnostics);
    }
    for (const hit of page.items) {
      /** Test and example paths must never trigger source reads or instrumentation counts. */
      if (!isProductionOtelPath(hit.path)) continue;
      /** The completed batch guarantees this production path has a reusable lexical index. */
      const blockComments: BlockCommentIndex | undefined = blockCommentCache.get(hit.path);
      if (blockComments === undefined || !blockComments.isComplete(hit.path)) continue;
      /** Repository delimiter state covers openers before this bounded grep line. */
      const initialCommentState: SourceCommentState = blockComments.stateAtLine(hit.path, hit.line);
      /** Retains compatibility with receiver helpers that accept only block-comment state. */
      const initialBlockComment: boolean = initialCommentState.inBlockComment;
      /** Masks the grep hit with its inherited state before accepting a grouped Go module entry. */
      const executableHitText: string = sourceWithoutComments({
        content: hit.text,
        initialState: initialCommentState,
        path: hit.path,
      });
      if (/\.go$/i.test(hit.path) && goGroupedOtelImport.test(executableHitText)) {
        /** The exact bounded-window start determines both the request and its inherited lexical state. */
        const startLine: number = Math.max(1, hit.line - groupedImportContextLines + 1);
        const groupContext = await isGoGroupedImportEntry({
          initialState: blockComments.stateAtLine(hit.path, startLine),
          line: hit.line,
          path: hit.path,
          reader,
          repository,
        });
        if (groupContext.diagnostic !== undefined)
          diagnostics.push({ ...groupContext.diagnostic, pattern });
        if (groupContext.eligible) {
          locations.add(`${hit.path}:${hit.line}`);
          continue;
        }
      }
      if (
        isEligibleSite({
          content: hit.text,
          initialBlockComment,
          initialCommentState,
          kind,
          path: hit.path,
          pattern,
        })
      ) {
        locations.add(`${hit.path}:${hit.line}`);
        continue;
      }
      if (
        /\.rs$/i.test(hit.path) &&
        kind.startsWith('instrumentation_') &&
        rustGroupedOtelUseEntry.test(hit.text)
      ) {
        /** The grouped-use reader initializes every bounded window from its exact lexical start line. */
        const groupContext = await isRustGroupedUseEntry({
          blockComments,
          line: hit.line,
          path: hit.path,
          reader,
          repository,
        });
        if (groupContext.diagnostic !== undefined)
          diagnostics.push({ ...groupContext.diagnostic, pattern });
        if (groupContext.eligible) {
          locations.add(`${hit.path}:${hit.line}`);
          continue;
        }
      }
      if (!receiverScopedKinds.has(kind)) continue;
      if (
        hasCommentedOtelReceiverCall(
          hit.text,
          methodForReceiverScopedKind(kind),
          initialBlockComment,
          hit.path
        )
      )
        continue;
      /** Bounded reads prove only the triggering multiline call without trusting nearby source text. */
      const window = await reader.readWindow({
        endLine: hit.line + statusWindowRadius,
        path: hit.path,
        repository,
        startLine: Math.max(1, hit.line - statusWindowRadius),
      });
      if (window.status === 'failure') {
        diagnostics.push({
          error: window.error,
          kind: 'window',
          line: hit.line,
          path: hit.path,
          pattern,
        });
        continue;
      }
      /** A window may validate only the exact grep hit and its attached continuation lines. */
      if (
        isOtelCallAtHit({
          initialCommentState,
          kind,
          line: hit.line,
          path: hit.path,
          window: window.value,
        })
      ) {
        locations.add(`${hit.path}:${hit.line}`);
      }
    }
    if (page.status === 'complete') break;
    if (page.nextCursor.length === 0 || cursors.has(page.nextCursor)) {
      diagnostics.push({
        error: {
          code: 'invalid_grep_cursor',
          message: `OTel pattern ${JSON.stringify(pattern)} returned a missing or repeated cursor.`,
          retryable: false,
        },
        kind: 'pagination',
        pattern,
      });
      break;
    }
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  return { diagnostics, locations };
};

/** Detects OTel imports and unambiguous instrumentation idioms without discarding successful pattern evidence. */
export const detectOtelInstrumentation = async ({
  reader,
  repository,
}: {
  readonly reader: SourceReader;
  readonly repository: ResolvedRepository;
}): Promise<OtelInstrumentationDetectionResult> => {
  /** Lazily caches one candidate-path lexical index while keeping unrelated paths unread. */
  const blockCommentCache: Map<string, BlockCommentIndex> = new Map();
  /** The aggregate preserves a separate count per idiom rather than conflating signal categories. */
  const counts: Record<OtelInstrumentationKind, number> = { ...emptyCounts() };
  /** Independent grep diagnostics remain visible to extraction orchestration. */
  const diagnostics: OtelInstrumentationDiagnostic[] = [];
  for (const [kind, patterns] of Object.entries(otelInstrumentationPatterns) as readonly [
    OtelInstrumentationKind,
    readonly string[]
  ][]) {
    /** A kind may have several patterns; locations need a union rather than summed duplicate hits. */
    const sites: Set<string> = new Set();
    for (const pattern of patterns) {
      /** Failed patterns do not stop other patterns from contributing their successful evidence. */
      const result = await countPatternSites({
        blockCommentCache,
        kind,
        pattern,
        reader,
        repository,
      });
      diagnostics.push(...result.diagnostics);
      for (const location of result.locations) sites.add(location);
    }
    counts[kind] = sites.size;
  }
  return { detection: detectionFrom(counts), diagnostics };
};
