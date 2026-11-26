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
  // EDOT iOS sends an unsymbolicated PLCrashReporter excerpt, whose load addresses change per launch
  ios: [
    {
      pattern: '^.*?(?:Last Exception Backtrace:|Thread \\d+ Crashed:)\\n(.*?)(?:\\n\\n.*)?$',
      replacement: '$1',
      dotAll: true,
    },
    { pattern: '0x[0-9a-f]+ 0x[0-9a-f]+ ', replacement: '' },
    { pattern: ' +', replacement: ' ' },
  ],
  // JVM traces: the first line repeats the message, and line numbers change with every build
  jvm: [
    { pattern: '^[^\\n]*\\n?', replacement: '' },
    { pattern: ':\\d+\\)', replacement: ')' },
  ],
} as const satisfies Record<string, readonly CrashFrameRule[]>;

export type CrashKind = keyof typeof CRASH_FRAME_RULES;

/** Longest crash fingerprint a route or URL takes: a computed one is 64 characters. */
export const MAX_CRASH_FINGERPRINT_LENGTH = 256;

/** `exception.type` suffix of the JavaScript errors React Native reports as crashes. */
export const JAVASCRIPT_EXCEPTION_SUFFIX = 'JavascriptException';
/** How a PLCrashReporter text report starts, which no exception's message or frames do. */
export const IOS_REPORT_MARKER = 'Incident Identifier:';

/**
 * Whether a crash is an EDOT iOS report, by how its stack trace starts rather than a line anywhere
 * in it, which an error message can repeat. PLCrashReporter runs without symbolication, so its
 * frames are offsets into binaries, which a rebuild moves.
 */
export const isIosReport = (): ESQLAstExpression =>
  esql.exp`${mobileColumn('exceptionStacktrace')} LIKE ${`${IOS_REPORT_MARKER}*`}`;

const withRules = (input: ESQLAstExpression, kind: CrashKind): ESQLAstExpression =>
  CRASH_FRAME_RULES[kind].reduce<ESQLAstExpression>(
    (expression, rule: CrashFrameRule) =>
      esql.exp`REPLACE(${expression}, ${rule.dotAll ? `(?s)${rule.pattern}` : rule.pattern}, ${
        rule.replacement
      })`,
    input
  );

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
