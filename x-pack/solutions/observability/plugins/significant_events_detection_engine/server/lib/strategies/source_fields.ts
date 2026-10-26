/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { field, listColumns, queryRows, toNumber } from '../esql';

/** A field must be in this share of a source's documents before the checks read it. */
const MIN_BOUND_SHARE = 0.05;
/** The window the probe reads to decide what a source's documents carry. */
const PROBE_WINDOW = '15 minutes';
const NANOS_PER_MS = 1_000_000;

/**
 * The fields of a source that strategies read, bound once per source. `lines` holds the
 * ES|QL lines that bind them, from ECS fields where they are filled and parsed out of the
 * message where they are not: many services log their level, status and duration only inside a
 * JSON or logfmt message, and a mapped `log.level` that is always empty would hide every error.
 */
export interface SourceFields {
  columns: string[];
  /**
   * ES|QL lines that bind each field, placed before a query's STATS. Each strategy takes only
   * the lines it reads: a GROK runs on every document the query scans.
   */
  lines: Partial<Record<BoundField, string>>;
  /** Lower-case level of a document, or undefined when the source has none. */
  levelExpr?: string;
  /** True when `_duration_ms` holds a request duration in milliseconds. */
  hasDuration: boolean;
  /** True when `_status` holds an HTTP status. */
  hasStatus: boolean;
  messageField?: string;
}

export type BoundField = 'level' | 'duration' | 'status';

/** The binding lines of some fields, in a fixed order, as one block. */
export function preludeOf(fields: SourceFields, wanted: BoundField[]): string {
  return (['level', 'duration', 'status'] as const)
    .filter((name) => wanted.includes(name))
    .flatMap((name) => (fields.lines[name] ? [fields.lines[name]!] : []))
    .join('\n');
}

/** OpenTelemetry logs carry the level in `severity_text` when nothing maps it to `log.level`. */
function levelColumnOf(columns: string[]): string | undefined {
  return ['log.level', 'severity_text'].find((name) => columns.includes(name));
}

/** The column holding the log message: ECS `message`, or OpenTelemetry's `body.text`. */
export function messageFieldOf(columns: string[]): string | undefined {
  return ['message', 'body.text'].find((name) => columns.includes(name));
}

/**
 * GROK lines that parse a level, a duration in milliseconds and an HTTP status out of a
 * message, in JSON (`"duration_ms":12`), logfmt (`duration_ms=12`) and quoted (`status="200"`)
 * forms. A key must not follow a letter, digit or dot, so `payment.status` never binds.
 */
function messageBindings(messageField: string): Record<'level' | 'duration' | 'status', string> {
  const message = field(messageField);
  const key = (name: string) => `(?:^|[^A-Za-z0-9_.])${name}"?\\s*[=:]\\s*"?`;
  return {
    level: `| GROK ${message} """${key('level')}%{WORD:_level}"""`,
    duration: `| GROK ${message} """${key(
      '(?:duration|latency|elapsed|took)_ms'
    )}%{NUMBER:_duration_ms:double}"""`,
    status: `| GROK ${message} """${key('status')}%{INT:_status:int}"""`,
  };
}

/** What share of recent documents fill each field, directly or parsed from the message. */
async function probe({
  esClient,
  source,
  levelColumn,
  messageField,
  signal,
}: {
  esClient: ElasticsearchClient;
  source: NightshiftSource;
  levelColumn?: string;
  messageField?: string;
  signal: AbortSignal;
}): Promise<Record<'level' | 'parsedLevel' | 'duration' | 'status', number>> {
  const bindings = messageField ? messageBindings(messageField) : undefined;
  try {
    const { rows } = await queryRows({
      esClient,
      query: `FROM ${source.view_name}
| WHERE @timestamp >= NOW() - ${PROBE_WINDOW}
${
  bindings ? `${bindings.level}\n${bindings.duration}\n${bindings.status}\n` : ''
}| STATS docs = COUNT(*)${levelColumn ? `, level = COUNT(${field(levelColumn)})` : ''}${
        bindings
          ? ', parsed_level = COUNT(_level), durations = COUNT(_duration_ms), statuses = COUNT(_status)'
          : ''
      }`,
      signal,
    });
    const row = rows[0] ?? {};
    const docs = toNumber(row.docs);
    const share = (value: unknown) => (docs > 0 ? toNumber(value) / docs : 0);
    return {
      level: share(row.level),
      parsedLevel: share(row.parsed_level),
      duration: share(row.durations),
      status: share(row.statuses),
    };
  } catch (error) {
    // GROK on a field that is not text fails the probe; only the mapped fields are used then.
    return { level: levelColumn ? 1 : 0, parsedLevel: 0, duration: 0, status: 0 };
  }
}

/** Binds the fields of one source that the strategies read. */
export async function bindSourceFields({
  esClient,
  source,
  signal,
}: {
  esClient: ElasticsearchClient;
  source: NightshiftSource;
  signal: AbortSignal;
}): Promise<SourceFields> {
  const columns = await listColumns({ esClient, from: source.view_name, signal });
  const levelColumn = levelColumnOf(columns);
  const messageField = messageFieldOf(columns);
  const ecsDuration = columns.includes('event.duration');
  const ecsStatus = columns.includes('http.response.status_code');
  const shares = await probe({ esClient, source, levelColumn, messageField, signal });
  const bindings = messageField ? messageBindings(messageField) : undefined;
  const levelFilled = levelColumn !== undefined && shares.level >= MIN_BOUND_SHARE;
  const parseLevel = bindings !== undefined && shares.parsedLevel >= MIN_BOUND_SHARE;
  const parseDuration =
    !ecsDuration && bindings !== undefined && shares.duration >= MIN_BOUND_SHARE;
  const parseStatus = !ecsStatus && bindings !== undefined && shares.status >= MIN_BOUND_SHARE;
  const lines: SourceFields['lines'] = {
    level: parseLevel ? bindings!.level : undefined,
    duration: ecsDuration
      ? `| EVAL _duration_ms = TO_DOUBLE(${field('event.duration')}) / ${NANOS_PER_MS}`
      : parseDuration
      ? bindings!.duration
      : undefined,
    status: ecsStatus
      ? `| EVAL _status = TO_INTEGER(${field('http.response.status_code')})`
      : parseStatus
      ? bindings!.status
      : undefined,
  };
  // A source can mix services that fill the level field with services that only log it.
  const levelExpr =
    levelFilled && parseLevel
      ? `TO_LOWER(COALESCE(${field(levelColumn!)}, _level))`
      : levelFilled
      ? `TO_LOWER(${field(levelColumn!)})`
      : parseLevel
      ? 'TO_LOWER(_level)'
      : undefined;
  return {
    columns,
    lines,
    levelExpr,
    hasDuration: ecsDuration || parseDuration,
    hasStatus: ecsStatus || parseStatus,
    messageField,
  };
}

/** Documents that report a failure: an error level or a 5xx status. */
export function failureCondition(fields: SourceFields): string | undefined {
  return (
    [
      fields.levelExpr ? `${fields.levelExpr} IN ("error", "err", "critical", "fatal")` : undefined,
      fields.hasStatus ? '_status >= 500' : undefined,
    ]
      .filter((condition): condition is string => condition !== undefined)
      .join(' OR ') || undefined
  );
}
