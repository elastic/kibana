/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { mobileColumn } from './fields';

/** A regex replacement of every match, in the syntax Java (ES|QL `REPLACE`) and JavaScript share. */
export interface CrashFrameRule {
  pattern: string;
  replacement: string;
  /** Lets `.` match line breaks too. */
  dotAll?: boolean;
  /** Lets `^` and `$` match at every line. */
  multiline?: boolean;
}

/**
 * How a crash's frames are read before they're hashed, by kind of crash. An ingest-time fingerprint
 * must apply the same rules, so that a group keeps its fingerprint when the stored one replaces it.
 */
export const CRASH_FRAME_RULES = {
  // React Native reports JavaScript errors through the same bridge frames: the error is the message
  javascript: [
    { pattern: '\\n.*', replacement: '', dotAll: true },
    { pattern: '0x[0-9a-fA-F]+|\\d+', replacement: '#' },
  ],
  // EDOT iOS sends an unsymbolicated PLCrashReporter excerpt, whose load addresses change per
  // launch. A report without a crashed thread has no frames, as its header changes with each crash
  ios: [
    { pattern: '\\r', replacement: '' },
    {
      pattern:
        '^(?:.*?(?:Last Exception Backtrace:|Thread \\d+ Crashed:)\\n(.*?)(?:\\n\\n.*)?|.*)$',
      replacement: '$1',
      dotAll: true,
    },
    { pattern: '0x[0-9a-f]+ 0x[0-9a-f]+ ', replacement: '' },
    // A symbolicated frame has one address before its symbol, which also moves with every launch
    { pattern: '0x[0-9a-f]+ ', replacement: '' },
    { pattern: ' +', replacement: ' ' },
  ],
  // JVM traces: the first line repeats the message, a cause's message and how many frames it shares
  // vary per crash (ids, object hashes), and line numbers change with every build
  jvm: [
    { pattern: '^[^\\n]*\\n?', replacement: '' },
    {
      pattern: '^([ \\t]*(?:Caused by|Suppressed): [^:\\n]+):.*$',
      replacement: '$1',
      multiline: true,
    },
    { pattern: '^([ \\t]*)\\.\\.\\. \\d+ more$', replacement: '$1... more', multiline: true },
    { pattern: ':\\d+\\)', replacement: ')' },
  ],
} as const satisfies Record<string, readonly CrashFrameRule[]>;

export type CrashKind = keyof typeof CRASH_FRAME_RULES;

/** Longest crash fingerprint a route or URL takes: a computed one is 64 characters. */
export const MAX_CRASH_FINGERPRINT_LENGTH = 256;

/** `exception.type` suffix of the JavaScript errors React Native reports as crashes. */
export const JAVASCRIPT_EXCEPTION_SUFFIX = 'JavascriptException';
/**
 * The release in a PLCrashReporter report's `Version:` line, e.g. `8.4.0` of `8.4.0 (840)`, or an
 * empty string without one. EDOT iOS sends a crash on the next launch, with that launch's resource,
 * so the report's release is the one that crashed.
 */
export const IOS_REPORT_RELEASE_RULE = {
  pattern: '^(?:.*?\\nVersion: +(\\S+))?.*$',
  replacement: '$1',
  dotAll: true,
} as const satisfies CrashFrameRule;

/**
 * The OS version in a PLCrashReporter report's `OS Version:` line, e.g. `17.6.1` of
 * `iPhone OS 17.6.1 (21G93)`, or an empty string without one: the OS that crashed, which the next
 * launch's resource may have updated.
 */
export const IOS_REPORT_OS_VERSION_RULE = {
  pattern: '^(?:.*?\\nOS Version: +[^0-9\\n]*([0-9][0-9.]*).*|.*)$',
  replacement: '$1',
  dotAll: true,
} as const satisfies CrashFrameRule;

/** How a PLCrashReporter text report starts, which no exception's message or frames do. */
export const IOS_REPORT_MARKER = 'Incident Identifier:';

/**
 * Whether a crash is an EDOT iOS report, by how its stack trace starts rather than a line anywhere
 * in it, which an error message can repeat. PLCrashReporter runs without symbolication, so its
 * frames are offsets into binaries, which a rebuild moves.
 */
export const isIosReport = (): ESQLAstExpression =>
  esql.exp`${mobileColumn('exceptionStacktrace')} LIKE ${`${IOS_REPORT_MARKER}*`}`;

/** A rule's flags as Java's inline flags, e.g. `(?s)`, which JavaScript takes as `RegExp` flags. */
export const crashFrameRuleFlags = ({ dotAll, multiline }: CrashFrameRule): string =>
  `${dotAll ? 's' : ''}${multiline ? 'm' : ''}`;

const withRule = (input: ESQLAstExpression, rule: CrashFrameRule): ESQLAstExpression => {
  const flags = crashFrameRuleFlags(rule);
  return esql.exp`REPLACE(${input}, ${flags ? `(?${flags})${rule.pattern}` : rule.pattern}, ${
    rule.replacement
  })`;
};

const withRules = (input: ESQLAstExpression, kind: CrashKind): ESQLAstExpression =>
  CRASH_FRAME_RULES[kind].reduce<ESQLAstExpression>(withRule, input);

const fromIosReport = (rule: CrashFrameRule): ESQLAstExpression =>
  esql.exp`CASE(${isIosReport()}, ${withRule(mobileColumn('exceptionStacktrace'), rule)}, NULL)`;

/**
 * The release in an EDOT iOS report's `Version:` line, as an ES|QL expression: `NULL` for other
 * crashes, and an empty string for a report without one.
 */
export const reportRelease = (): ESQLAstExpression => fromIosReport(IOS_REPORT_RELEASE_RULE);

/** The OS version in an EDOT iOS report's `OS Version:` line, as `reportRelease` reads its release. */
export const reportOsVersion = (): ESQLAstExpression => fromIosReport(IOS_REPORT_OS_VERSION_RULE);

/** The frames a crash is grouped on, as an ES|QL expression. */
export const crashFrames = (): ESQLAstExpression =>
  esql.exp`CASE(
    ${mobileColumn('exceptionType')} LIKE ${`*${JAVASCRIPT_EXCEPTION_SUFFIX}`},
    ${withRules(mobileColumn('exceptionMessage'), 'javascript')},
    ${isIosReport()},
    ${withRules(mobileColumn('exceptionStacktrace'), 'ios')},
    ${withRules(mobileColumn('exceptionStacktrace'), 'jvm')}
  )`;

/**
 * A crash's group: the stored fingerprint, or the SHA-256 of its type and frames, so that a rebuild or
 * another launch of the same crash lands in the same group. The computed one is temporary: an
 * ingest-time fingerprint will replace it (https://github.com/elastic/rum-dev/issues/51).
 */
export const crashFingerprint = (): ESQLAstExpression =>
  esql.exp`COALESCE(
    ${mobileColumn('exceptionFingerprint')},
    SHA256(CONCAT(COALESCE(${mobileColumn(
      'exceptionType'
    )}, ""), "|", COALESCE(${crashFrames()}, "")))
  )`;
