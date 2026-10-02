/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceLocation } from '../source_location_codec';
import { loggingIdiomPatterns } from './idiom_patterns';

/** Maps normalized log levels to predictive-query severity scores. */
const severityByLevel: Readonly<Record<string, number>> = {
  critical: 80,
  error: 70,
  fatal: 80,
  fine: 20,
  info: 30,
  debug: 20,
  severe: 80,
  trace: 20,
  warn: 50,
};
/** Severity used for a recognized level without a dedicated mapping. */
const defaultSeverity: number = 40;
/** Level assigned to a log emission that the process exits right after. */
const processExitLevel: string = 'fatal';
/** Matches a process-exit call at the start of the statement that follows a logging call. */
const processExitPattern: RegExp =
  /^(?:os\.Exit|process\.exit|exitProcess|sys\.exit|System\.exit|(?:std::)?process::exit|exit)\s*\(/;
/** Statement separators, whitespace, and line comments allowed between a log call and its exit. */
const statementGapPattern: RegExp = /^(?:\s|;|\/\/[^\n]*)*/;
/** Only a separator or comment may follow an unconditional exit call on its line. */
const exitStatementTailPattern: RegExp = /^[ \t]*;?[ \t]*(?:(?:\/\/|#).*)?$/;
/** Matches a chained method call that continues the same logging statement. */
const chainedCallPattern: RegExp = /^\s*\??\.\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/;
/** Standard logging idioms locate the call on a classifier candidate's matched line. */
const loggingIdiomExpressions: readonly RegExp[] = loggingIdiomPatterns.map(
  (pattern) => new RegExp(pattern)
);
/** Minimum static text that is useful as a selective predictive anchor. */
const minimumSegmentLength: number = 4;
/** Builds a quoted-literal capture whose backtick semantics match the evidenced source language. */
const sourceLiteralCapturePattern = (goRawBackticks: boolean): string => {
  /** Keeps the delimiter readable while constructing the backtick alternative. */
  const backtick: string = '`';
  /** Double-quoted strings decode a backslash plus its following source character together. */
  const doubleQuoted: string = String.raw`"((?:\\[^\r\n]|[^"\\\r\n])*)"`;
  /** Single-quoted strings follow the same bounded escape-aware capture behavior. */
  const singleQuoted: string = String.raw`'((?:\\[^\r\n]|[^'\\\r\n])*)'`;
  /** Reuses raw fragments so regular-expression backslashes survive template-string construction. */
  const escapedCharacter: string = String.raw`\\[^\r\n]`;
  /** Go raw strings never let a backslash escape their closing delimiter. */
  const backtickQuoted: string = goRawBackticks
    ? `${backtick}([^${backtick}${String.raw`\r\n`}]*)${backtick}`
    : `${backtick}((?:${escapedCharacter}|[^${backtick}${String.raw`\\\r\n`}])*)${backtick}`;
  return `(?:${doubleQuoted}|${singleQuoted}|${backtickQuoted})`;
};

/** Builds a method-form logging-call matcher with language-aware raw-string delimiters. */
const methodCallPattern = (goRawBackticks: boolean): RegExp =>
  new RegExp(
    String.raw`(?:^|[^A-Za-z0-9_])(?:[A-Za-z_][A-Za-z0-9_]*\s*[.]\s*)?(?:Log)?(fatal|critical|severe|error|exception|warn(?:ing)?|info(?:rmation)?|debug|trace|fine)\s*\(\s*${sourceLiteralCapturePattern(
      goRawBackticks
    )}`,
    'gi'
  );

/** Builds a macro-form logging-call matcher with language-aware raw-string delimiters. */
const macroCallPattern = (goRawBackticks: boolean): RegExp =>
  new RegExp(
    String.raw`(?:^|[^A-Za-z0-9_])(fatal|error|warn|info|debug|trace)\s*!\s*\(\s*${sourceLiteralCapturePattern(
      goRawBackticks
    )}`,
    'gi'
  );
/**
 * Matches one printf-style conversion after its leading percent character.
 * It supports C/C++ lengths, Python mappings, POSIX positional arguments, Go verbs, and width/precision.
 */
const percentFormatPlaceholderSource: string =
  "%(?:\\([A-Za-z_][A-Za-z0-9_]*\\))?(?:[1-9][0-9]*\\$)?[-+ #0']*(?:\\*|[0-9]+)?(?:\\.(?:\\*|[0-9]+)?)?(?:hh|h|ll|l|j|z|t|L)?[diuoxXfFeEgGaAcspnvrqwbTtUO@]";
/** Shared interpolation grammar provides candidates for the common range collector. */
const placeholderPatternSource: string = [
  '\\{\\{[^}]*\\}\\}',
  '\\{[^}]*\\}',
  percentFormatPlaceholderSource,
  '\\$\\{[^}]*\\}',
  '\\$[A-Za-z_][A-Za-z0-9_]*',
  '#\\{[^}]*\\}',
].join('|');
/** Finds every candidate placeholder before range-level percent-run validation. */
const placeholderPattern: RegExp = new RegExp(placeholderPatternSource, 'g');

/** A dynamic-placeholder span within an unmodified log message. */
interface PlaceholderRange {
  readonly end: number;
  readonly start: number;
}

/** One parsed source logging call, ordered by its first character in the source window. */
interface SourceLogCall {
  readonly index: number;
  readonly level: string;
  readonly message: string;
  readonly quote: string;
}

/** A classifier decision that can supply a normalized level and static message. */
export interface ClassifiedLogMessage {
  readonly level: string;
  readonly staticMessage: string;
}

/** Source supplied to deterministic log signature extraction. */
export interface LoggingSignatureInput {
  readonly classified?: ClassifiedLogMessage;
  readonly content: string;
  readonly evidence?: readonly SourceLocation[];
  /** Zero-based line in `content` that holds the discovered logging call. */
  readonly matchedLineIndex?: number;
}

/** A level, severity, and useful static anchors retained from a logging call. */
export interface LogSignature {
  readonly evidence: readonly SourceLocation[];
  readonly level: string;
  readonly message: string;
  readonly severity: number;
  readonly staticPrefix: string;
  readonly staticSegments: readonly string[];
}

/** Normalizes aliases used by logger APIs to the target log-level vocabulary. */
const normalizeLogLevel = (level: string): string => {
  /** Lowercasing allows source idioms and classifier values to share one mapping. */
  const normalized: string = level.toLowerCase();
  return normalized === 'warning'
    ? 'warn'
    : normalized === 'information'
    ? 'info'
    : normalized === 'exception'
    ? 'error'
    : normalized;
};

/** Returns the configured severity for a normalized log level. */
const severityForLevel = (level: string): number => severityByLevel[level] ?? defaultSeverity;

/** Identifies source extensions with string-literal escape grammars handled by this extractor. */
const supportedLiteralExtensions: ReadonlySet<string> = new Set([
  'c',
  'cc',
  'cpp',
  'cs',
  'go',
  'java',
  'js',
  'jsx',
  'py',
  'rs',
  'ts',
  'tsx',
]);

/** Identifies JavaScript-family extensions that support template literals and braced Unicode escapes. */
const javaScriptExtensions: ReadonlySet<string> = new Set(['js', 'jsx', 'ts', 'tsx']);

/** Identifies languages whose supported hexadecimal escape is exactly two digits. */
const twoDigitHexExtensions: ReadonlySet<string> = new Set([
  'go',
  'js',
  'jsx',
  'py',
  'rs',
  'ts',
  'tsx',
]);

/** Identifies languages whose supported Unicode escape is exactly four hexadecimal digits. */
const fourDigitUnicodeExtensions: ReadonlySet<string> = new Set([
  'cs',
  'go',
  'js',
  'jsx',
  'py',
  'ts',
  'tsx',
]);

/** Returns the lower-cased source extension when evidence identifies a source file. */
const extensionOf = (evidence: readonly SourceLocation[]): string | undefined => {
  /** The candidate evidence path is the only source-language fact available to this pure extractor. */
  const path: string | undefined = evidence[0]?.path;
  if (path === undefined) return undefined;
  /** Paths without a suffix cannot establish a string-literal grammar. */
  const separator: number = path.lastIndexOf('.');
  return separator < 0 ? undefined : path.slice(separator + 1).toLowerCase();
};

/** Decodes a fixed-width hexadecimal source escape without executing repository source. */
const decodeHexEscape = (value: string, length: number): string | undefined => {
  /** Only complete hexadecimal escapes have an unambiguous cooked value. */
  if (value.length !== length || !/^[0-9a-f]+$/i.test(value)) return undefined;
  /** String construction converts only the validated numeric code point. */
  return String.fromCodePoint(Number.parseInt(value, 16));
};

/** Returns whether a one-character escape has the same cooked value in the evidenced language. */
const supportsCommonEscape = (extension: string, escaped: string): boolean => {
  if (['\\', "'", '"'].includes(escaped)) return true;
  if (['n', 'r', 't'].includes(escaped)) return true;
  if (['b', 'f'].includes(escaped)) return extension !== 'rs';
  if (escaped === 'v') return !['java', 'rs'].includes(extension);
  if (escaped === '0') return true;
  return escaped === '`' && javaScriptExtensions.has(extension);
};

/** Decodes C#'s greedy one-to-four-digit hexadecimal escape without consuming a fifth digit. */
const decodeCSharpHexEscape = (
  message: string,
  index: number
): { readonly length: number; readonly value: string } | undefined => {
  /** C# consumes the longest valid prefix up to four hexadecimal characters after slash-x. */
  const hex: string = message.slice(index + 2, index + 6).match(/^[0-9a-f]+/i)?.[0] ?? '';
  if (hex.length === 0) return undefined;
  /** A validated UTF-16 code unit has the same cooked representation in the extractor. */
  return { length: hex.length, value: String.fromCodePoint(Number.parseInt(hex, 16)) };
};

/** Decodes C-style escapes for known source languages without evaluating customer source. */
export const decodeSourceLiteral = ({
  evidence,
  message,
  quote,
}: {
  readonly evidence: readonly SourceLocation[];
  readonly message: string;
  readonly quote: string;
}): string | undefined => {
  /** Backtick literals have language-specific raw semantics even when they contain no escapes. */
  if (quote === '`') {
    /** A raw-literal grammar can only be selected from the evidenced source language. */
    const extension: string | undefined = extensionOf(evidence);
    /** Go raw strings preserve every backslash verbatim rather than interpreting escapes. */
    if (extension === 'go') return message;
    /** JavaScript template literals are the only other supported backtick form. */
    if (extension === undefined || !javaScriptExtensions.has(extension)) return undefined;
  }
  /** Unescaped source text has identical lexical and runtime values in supported quoted literals. */
  if (!message.includes('\\')) return message;
  /** A language is required before escaped source text can become a query anchor. */
  const extension: string | undefined = extensionOf(evidence);
  if (extension === undefined || !supportedLiteralExtensions.has(extension)) return undefined;
  /** Collects the deterministic cooked string one validated source escape at a time. */
  let cooked: string = '';
  for (let index: number = 0; index < message.length; index += 1) {
    /** Ordinary source characters survive unchanged. */
    const character: string = message[index];
    if (character !== '\\') {
      cooked += character;
      continue;
    }
    /** A trailing escape is malformed source and cannot establish a runtime literal. */
    const escaped: string | undefined = message[index + 1];
    if (escaped === undefined) return undefined;
    /** Maps the recognized one-character escapes to their cooked values after language validation. */
    const commonEscapes: Readonly<Record<string, string>> = {
      '0': '\0',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
      v: '\v',
      "'": "'",
      '"': '"',
      '\\': '\\',
      '`': '`',
    };
    if (commonEscapes[escaped] !== undefined && supportsCommonEscape(extension, escaped)) {
      /** Decimal digits after slash-zero have language-specific semantics, so only isolated zero is safe. */
      if (escaped === '0' && /[0-9]/.test(message[index + 2] ?? '')) return undefined;
      cooked += commonEscapes[escaped];
      index += 1;
      continue;
    }
    if (escaped === 'x') {
      /** C# greedily consumes one through four hexadecimal digits for slash-x escapes. */
      if (extension === 'cs') {
        /** The consumed length keeps a following fifth digit literal, matching C# grammar exactly. */
        const decoded = decodeCSharpHexEscape(message, index);
        if (decoded === undefined) return undefined;
        cooked += decoded.value;
        index += decoded.length + 1;
        continue;
      }
      /** Other supported source grammars use exactly two digits; variable-length forms are rejected. */
      if (!twoDigitHexExtensions.has(extension)) return undefined;
      /** Decodes the validated fixed-width byte escape after Go's non-ASCII byte guard. */
      const decoded: string | undefined = decodeHexEscape(message.slice(index + 2, index + 4), 2);
      if (decoded === undefined) return undefined;
      // Go byte escapes above ASCII do not identify a Unicode character without an encoding contract.
      if (extension === 'go' && decoded.charCodeAt(0) >= 0x80) return undefined;
      cooked += decoded;
      index += 3;
      continue;
    }
    if (escaped === 'u') {
      /** JavaScript and TypeScript support braced Unicode code points in addition to four-digit escapes. */
      if (message[index + 2] === '{' && javaScriptExtensions.has(extension)) {
        /** Braced escape text ends at the next closing brace and remains bounded by the source literal. */
        const closingBrace: number = message.indexOf('}', index + 3);
        if (closingBrace < 0) return undefined;
        /** Valid Unicode scalar values exclude surrogate code points. */
        const hex: string = message.slice(index + 3, closingBrace);
        if (!/^[0-9a-f]{1,6}$/i.test(hex)) return undefined;
        const codePoint: number = Number.parseInt(hex, 16);
        if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return undefined;
        cooked += String.fromCodePoint(codePoint);
        index = closingBrace;
        continue;
      }
      /** Only known fixed-width Unicode grammars are decoded; all other language forms remain unanchored. */
      if (!fourDigitUnicodeExtensions.has(extension)) return undefined;
      /** Decodes the validated fixed-width Unicode escape for a supported language grammar. */
      const decoded: string | undefined = decodeHexEscape(message.slice(index + 2, index + 6), 4);
      if (decoded === undefined) return undefined;
      cooked += decoded;
      index += 5;
      continue;
    }
    /** Unknown escapes differ by language and must not become false runtime query anchors. */
    return undefined;
  }
  return cooked;
};

/** Returns whether a percent conversion begins after an even-sized adjacent literal-percent run. */
const hasEvenPercentRunBefore = (message: string, index: number): boolean => {
  /** Counts percent characters immediately before the candidate conversion. */
  let count: number = 0;
  for (let cursor: number = index - 1; cursor >= 0 && message[cursor] === '%'; cursor -= 1) {
    count += 1;
  }
  return count % 2 === 0;
};

/** Collects dynamic-placeholder ranges using shared grammar and percent-run parity semantics. */
const placeholderRangesOf = (message: string): readonly PlaceholderRange[] => {
  /** Ranges are ordered by the shared global grammar's source traversal. */
  const ranges: PlaceholderRange[] = [];
  placeholderPattern.lastIndex = 0;
  /** Iterates each candidate placeholder prior to retaining its dynamic range. */
  let match: RegExpExecArray | null;
  while ((match = placeholderPattern.exec(message)) !== null) {
    if (match[0].startsWith('%') && !hasEvenPercentRunBefore(message, match.index)) continue;
    ranges.push({ end: match.index + match[0].length, start: match.index });
  }
  return ranges;
};

/** Returns the static leading text before the first interpolation marker. */
export const staticPrefixOf = (message: string): string => {
  /** First dynamic range determines the portion a legacy single-anchor consumer can match. */
  const firstRange: PlaceholderRange | undefined = placeholderRangesOf(message)[0];
  return (firstRange === undefined ? message : message.slice(0, firstRange.start)).trim();
};

/** Splits a message into static query anchors while dropping dynamic values and weak text. */
export const staticSegmentsOf = (message: string): readonly string[] => {
  /** The same filtered ranges used by staticPrefixOf preserve identical placeholder behavior. */
  const ranges: readonly PlaceholderRange[] = placeholderRangesOf(message);
  /** Static fragments between dynamic placeholder ranges become deterministic query anchors. */
  const segments: string[] = [];
  /** The first unconsumed character after the preceding dynamic placeholder. */
  let segmentStart: number = 0;
  for (const range of ranges) {
    /** Trimming precedes the minimum-length threshold used for query selectivity. */
    const segment: string = message.slice(segmentStart, range.start).trim();
    if (segment.length >= minimumSegmentLength) segments.push(segment);
    segmentStart = range.end;
  }
  /** The trailing static text follows the final dynamic placeholder, if any. */
  const trailingSegment: string = message.slice(segmentStart).trim();
  if (trailingSegment.length >= minimumSegmentLength) segments.push(trailingSegment);
  return segments;
};

/** Returns the index after the parenthesis that closes the one at `open`, skipping quoted text. */
const closingParenthesisEnd = (
  content: string,
  open: number,
  goRawBackticks: boolean
): number | undefined => {
  /** Nesting depth of unquoted parentheses since `open`. */
  let depth: number = 0;
  for (let index: number = open; index < content.length; index += 1) {
    /** The current source character outside any quoted literal. */
    const character: string = content[index];
    if (character === '"' || character === "'" || character === '`') {
      /** Go raw strings never treat a backslash as an escape. */
      const raw: boolean = character === '`' && goRawBackticks;
      index += 1;
      while (index < content.length && content[index] !== character) {
        if (content[index] === '\\' && !raw) index += 1;
        index += 1;
      }
      // An unterminated literal means the window cannot prove where the call ends.
      if (index >= content.length) return undefined;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return undefined;
};

/** Returns the leading whitespace of the line that contains `offset`. */
const indentationAt = (content: string, offset: number): string => {
  /** Offset where the containing line begins. */
  const lineStart: number = content.lastIndexOf('\n', offset - 1) + 1;
  return /^[ \t]*/.exec(content.slice(lineStart))?.[0] ?? '';
};

/** Returns whether the statement whose first call opens at `open` is directly followed by a process exit. */
const isFollowedByProcessExit = (
  content: string,
  open: number,
  goRawBackticks: boolean
): boolean => {
  /** End of the call chain that makes up the logging statement. */
  let end: number | undefined = closingParenthesisEnd(content, open, goRawBackticks);
  while (end !== undefined) {
    /** A chained call keeps the same statement open. */
    const chained: RegExpExecArray | null = chainedCallPattern.exec(content.slice(end));
    if (chained === null) break;
    end = closingParenthesisEnd(content, end + chained[0].length - 1, goRawBackticks);
  }
  if (end === undefined) return false;
  /** The next statement must be the exit; a closing brace or other code in between disqualifies it. */
  const gap: number = (statementGapPattern.exec(content.slice(end))?.[0] ?? '').length;
  /** Offset of the statement that follows the logging call. */
  const exitStart: number = end + gap;
  /** The candidate exit call, anchored at the following statement. */
  const exit: RegExpExecArray | null = processExitPattern.exec(content.slice(exitStart));
  if (exit === null) return false;
  // A new line must keep the logging line's indentation so a dedented exit outside the block does not count.
  if (content.slice(end, exitStart).includes('\n')) {
    if (indentationAt(content, exitStart) !== indentationAt(content, open)) return false;
  }
  /** End of the exit call's argument list. */
  const exitEnd: number | undefined = closingParenthesisEnd(
    content,
    exitStart + exit[0].length - 1,
    goRawBackticks
  );
  if (exitEnd === undefined) return false;
  /** Rest of the exit line; a trailing condition such as a Python `if` makes the exit conditional. */
  const tail: string = content.slice(exitEnd).split('\n', 1)[0];
  return exitStatementTailPattern.test(tail);
};

/** Returns the first call parenthesis of the logging call on a candidate's matched line. */
const matchedCallParenthesis = (content: string, matchedLineIndex: number): number | undefined => {
  /** Source lines of the bounded window. */
  const lines: readonly string[] = content.split('\n');
  if (matchedLineIndex < 0 || matchedLineIndex >= lines.length) return undefined;
  /** Character offset where the matched line begins. */
  const lineStart: number = lines
    .slice(0, matchedLineIndex)
    .reduce((offset, line) => offset + line.length + 1, 0);
  /** The matched line alone decides which call the classifier described. */
  const line: string = lines[matchedLineIndex];
  /** Earliest standard idiom on the line; the line start is the fallback for custom patterns. */
  const callStart: number = loggingIdiomExpressions.reduce((earliest, expression) => {
    const index: number = line.search(expression);
    return index >= 0 && index < earliest ? index : earliest;
  }, line.length);
  /** The opening parenthesis of the first call at or after the idiom. */
  const open: number = line.indexOf('(', callStart === line.length ? 0 : callStart);
  return open < 0 ? undefined : lineStart + open;
};

/** Raises a level to fatal when the process exits right after the log emission. */
const levelWithProcessExit = (level: string, exitsProcess: boolean): string =>
  exitsProcess && severityForLevel(normalizeLogLevel(level)) < severityForLevel(processExitLevel)
    ? processExitLevel
    : level;

/** Builds a signature only when at least one stable static anchor is available. */
const signatureFor = ({
  evidence,
  level,
  message,
}: {
  readonly evidence: readonly SourceLocation[];
  readonly level: string;
  readonly message: string;
}): LogSignature | undefined => {
  /** Prefix remains useful for callers that display one leading anchor. */
  const staticPrefix: string = staticPrefixOf(message);
  /** Segments preserve static text on both sides of interpolation. */
  const staticSegments: readonly string[] = staticSegmentsOf(message);
  // Unlike the legacy prefix-only rule, a meaningful segment after a leading dynamic value is eligible.
  // Dynamic-only messages cannot support a deterministic predictive query.
  if (staticPrefix.length < 3 && staticSegments.length === 0) return undefined;
  /** Prefix is retained as a fallback for short but meaningful classifier text. */
  const anchors: readonly string[] = staticSegments.length > 0 ? staticSegments : [staticPrefix];
  /** Alias normalization happens before severity mapping and output construction. */
  const normalizedLevel: string = normalizeLogLevel(level);
  return {
    evidence,
    level: normalizedLevel,
    message,
    severity: severityForLevel(normalizedLevel),
    staticPrefix,
    staticSegments: anchors,
  };
};

/** Extracts deterministic signatures from source or classifier-supplied static messages. */
export const extractLogSignatures = (input: LoggingSignatureInput): readonly LogSignature[] => {
  /** Go raw backticks use delimiter semantics that differ from JavaScript template literals. */
  const goRawBackticks: boolean = extensionOf(input.evidence ?? []) === 'go';
  if (input.classified !== undefined) {
    /** The classifier describes the call on the matched line, so only that call's exit counts. */
    const open: number | undefined =
      input.matchedLineIndex === undefined
        ? undefined
        : matchedCallParenthesis(input.content, input.matchedLineIndex);
    /** A trusted classifier message handles methods such as panic without a level token. */
    const signature: LogSignature | undefined = signatureFor({
      evidence: input.evidence ?? [],
      level: levelWithProcessExit(
        input.classified.level,
        open !== undefined && isFollowedByProcessExit(input.content, open, goRawBackticks)
      ),
      message: input.classified.staticMessage,
    });
    return signature === undefined ? [] : [signature];
  }

  /** Collects one regex family's source calls with indexes for cross-family ordering. */
  const collectMatches = (pattern: RegExp): readonly SourceLogCall[] => {
    /** Calls found by the current method or macro regex. */
    const calls: SourceLogCall[] = [];
    pattern.lastIndex = 0;
    /** Regex iteration remains explicit to support multiple calls in a bounded window. */
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(input.content)) !== null) {
      /** Identifies which delimiter alternative supplied the captured message. */
      const literal: readonly [string, string | undefined][] = [
        ['"', match[2]],
        ["'", match[3]],
        ['`', match[4]],
      ];
      /** Each complete pattern has exactly 1 literal alternative, including the empty-string case. */
      const matchedLiteral: readonly [string, string | undefined] | undefined = literal.find(
        ([, value]) => value !== undefined
      );
      if (matchedLiteral === undefined || matchedLiteral[1] === undefined) continue;
      /** The level call's parenthesis is the first one directly followed by the captured literal. */
      const open: number = match.index + match[0].search(/\(\s*["'`]/);
      calls.push({
        index: match.index,
        level: levelWithProcessExit(
          normalizeLogLevel(match[1]),
          isFollowedByProcessExit(input.content, open, goRawBackticks)
        ),
        message: matchedLiteral[1],
        quote: matchedLiteral[0],
      });
    }
    return calls;
  };
  /** Merging before extraction preserves source order across method and macro regex families. */
  const calls: readonly SourceLogCall[] = [
    ...collectMatches(methodCallPattern(goRawBackticks)),
    ...collectMatches(macroCallPattern(goRawBackticks)),
  ].sort((left, right) => left.index - right.index);
  /** Signatures preserve ordered source calls while avoiding duplicate regex matches in a window. */
  const signatures: LogSignature[] = [];
  /** Level and cooked runtime message identify duplicate source calls across lexical spellings. */
  const seen: Set<string> = new Set();
  for (const call of calls) {
    /** Decodes only source-language escapes with a proven cooked value before interpolation slicing. */
    const message: string | undefined = decodeSourceLiteral({
      evidence: input.evidence ?? [],
      message: call.message,
      quote: call.quote,
    });
    // An unknown language or escape retains the discovered candidate upstream but cannot safely anchor a literal query.
    if (message === undefined) continue;
    /** Key prevents duplicate query anchors for source spellings with the same runtime value. */
    const key: string = `${call.level}:${message}`;
    if (seen.has(key)) continue;
    /** A rejected dynamic-only message is still considered, preventing repeated work. */
    seen.add(key);
    /** Candidate contains only deterministic source facts. */
    const signature: LogSignature | undefined = signatureFor({
      evidence: input.evidence ?? [],
      level: call.level,
      message,
    });
    if (signature !== undefined) signatures.push(signature);
  }
  return signatures;
};
