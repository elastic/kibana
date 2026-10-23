/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { LearnedDetector } from '../../../common';
import { getErrorMessage } from '../errors';
import { esqlString, field, listColumns, queryRows, timeRangeWhere, toNumber } from '../esql';
import type { ConfirmedPath } from './tree_paths';

const MAX_PATTERNS = 40;
/**
 * Rows of the query that categorizes both windows at once: one per pattern and window. Fifty
 * times the patterns kept, so a kept pattern's reference row is cut only when one service logs
 * thousands of templates in three hours.
 */
const MAX_WINDOWED_ROWS = 2_000;
/** A pattern needs this many lines in the incident before it can explain it. */
const MIN_INCIDENT_LINES = 5;
/** How much more often a pattern must appear during the incident than before it. */
const MIN_RATE_RATIO = 5;
/** Path keywords a pattern must share before the heuristic says it is what a check looked for. */
const MIN_KEYWORD_OVERLAP = 2;
const PATTERNS_SHOWN_TO_MODEL = 15;
const MAX_SAMPLE_LENGTH = 300;
/** Tokens this short are separators and field names more often than meaning. */
const MIN_TOKEN_LENGTH = 2;
const DEFAULT_IMPORTANCE = 60;

const STOP_WORDS = new Set(
  'the and for with from that this into when then than are was were have has not but any all query queries check checks logs log look find count compare service services error errors yes no'.split(
    ' '
  )
);

/** One message template of a service, as CATEGORIZE groups them. */
export interface LogPattern {
  pattern: string;
  sample: string;
  /** Lines in the window that is being explained. */
  count: number;
  /** Lines in the reference window before it. */
  reference_count: number;
  /**
   * Words of the sample line that no line of the reference window used, such as a new reason
   * value. CATEGORIZE can fold a new value into an old template; these keep it apart.
   */
  new_words?: string[];
}

/** Words that can tell lines apart: letters only, so ids, counts and hashes are left out. */
const WORD_RE = /^[a-z][a-z_-]{3,}$/i;
const MAX_NEW_WORDS = 2;

function wordsOf(text: string): string[] {
  return text.split(/[^A-Za-z0-9_-]+/).filter((word) => WORD_RE.test(word));
}

/** The column holding the log message: ECS `message`, or OpenTelemetry's `body.text`. */
export function messageFieldOf(columns: string[]): string | undefined {
  return ['message', 'body.text'].find((name) => columns.includes(name));
}

/**
 * Turns a CATEGORIZE pattern (`.*?level.+?ERROR.+?timed.+?out.*?`) into a LIKE condition with
 * the same tokens in the same order. It matches the template, not one line, and stays readable.
 */
export function conditionFromPattern(
  messageField: string,
  pattern: string,
  newWords: string[] = []
): string | undefined {
  const tokens = pattern
    .split(/\.\*\?|\.\+\?/)
    .map((token) => token.replace(/\\(.)/g, '$1'))
    // LIKE treats `*` and `?` as wildcards and needs `\` escaped; such tokens are left out.
    .filter((token) => token.length >= MIN_TOKEN_LENGTH && !/[*?\\"]/.test(token));
  if (tokens.length === 0) {
    return undefined;
  }
  return [
    `${field(messageField)} LIKE ${esqlString(`*${tokens.join('*')}*`)}`,
    ...newWords.map((word) => `${field(messageField)} LIKE ${esqlString(`*${word}*`)}`),
  ].join(' AND ');
}

function keywordsOf(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
  );
}

function trimSample(sample: string): string {
  return sample.length > MAX_SAMPLE_LENGTH ? `${sample.slice(0, MAX_SAMPLE_LENGTH)}...` : sample;
}

/**
 * The message templates of one service in a window, with how often each appeared in a reference
 * window. With no reference window every reference count is zero.
 */
export async function minePatterns({
  esClient,
  source,
  service,
  from,
  to,
  reference,
  signal,
}: {
  esClient: ElasticsearchClient;
  source: NightshiftSource;
  service: string;
  from: number;
  to: number;
  reference?: { from: number; to: number };
  signal: AbortSignal;
}): Promise<{ messageField?: string; patterns: LogPattern[] }> {
  const columns = await listColumns({ esClient, from: source.view_name, signal });
  const messageField = messageFieldOf(columns);
  if (!messageField || !columns.includes('service.name')) {
    return { messageField, patterns: [] };
  }
  const message = field(messageField);
  const serviceWhere = `${field('service.name')} == ${esqlString(service)}`;
  const inWindow = timeRangeWhere(from, to);
  // One CATEGORIZE over both windows, so a line gets the same pattern on both sides. Two
  // separate runs can split one template differently, and a top-N reference list reads every
  // template outside its top N as "absent before".
  const { rows } = await queryRows({
    esClient,
    query: reference
      ? `FROM ${source.view_name}
| WHERE (${inWindow} OR ${timeRangeWhere(reference.from, reference.to)}) AND ${serviceWhere}
| EVAL window = CASE(${inWindow}, "current", "reference")
| STATS count = COUNT(*), sample = MAX(${message}) BY pattern = CATEGORIZE(${message}), window
| SORT count DESC
| LIMIT ${MAX_WINDOWED_ROWS}`
      : `FROM ${source.view_name}
| WHERE ${inWindow} AND ${serviceWhere}
| STATS count = COUNT(*), sample = MAX(${message}) BY pattern = CATEGORIZE(${message})
| SORT count DESC
| LIMIT ${MAX_PATTERNS}`,
    signal,
    timeoutMs: 120_000,
  });
  const counted = rows.map((row) => ({
    pattern: String(row.pattern ?? ''),
    sample: String(row.sample ?? ''),
    count: toNumber(row.count),
    inReference: row.window === 'reference',
  }));
  const current = counted.filter((item) => !item.inReference).slice(0, MAX_PATTERNS);
  const before = counted.filter((item) => item.inReference);
  const referenceCounts = new Map(before.map((item) => [item.pattern, item.count]));
  const referenceWords = new Set(
    before.flatMap((item) =>
      [...wordsOf(item.sample), ...wordsOf(item.pattern)].map((word) => word.toLowerCase())
    )
  );
  return {
    messageField,
    patterns: current.map((item) => ({
      ...item,
      sample: trimSample(item.sample),
      reference_count: referenceCounts.get(item.pattern) ?? 0,
      new_words: reference
        ? [
            ...new Set(
              wordsOf(item.sample).filter((word) => !referenceWords.has(word.toLowerCase()))
            ),
          ].slice(0, MAX_NEW_WORDS)
        : undefined,
    })),
  };
}

/**
 * Patterns that appeared during an incident and were absent or much rarer before it, rarest
 * first. These are what a person who missed the incident would have wanted to watch.
 */
export function newDuringIncident({
  patterns,
  incidentMinutes,
  referenceMinutes,
}: {
  patterns: LogPattern[];
  incidentMinutes: number;
  referenceMinutes: number;
}): LogPattern[] {
  const rate = (count: number, minutes: number) => count / Math.max(1, minutes);
  return patterns
    .filter((item) => item.count >= MIN_INCIDENT_LINES)
    .filter((item) => {
      const before = rate(item.reference_count, referenceMinutes);
      return before === 0 || rate(item.count, incidentMinutes) / before >= MIN_RATE_RATIO;
    })
    .sort(
      (a, b) =>
        rate(b.count, incidentMinutes) -
        rate(b.reference_count, referenceMinutes) -
        (rate(a.count, incidentMinutes) - rate(a.reference_count, referenceMinutes))
    );
}

/** What a path talks about, for matching it to a pattern without a model. */
export function pathText(path: ConfirmedPath): string {
  return [
    path.symptom.replace(/-/g, ' '),
    path.cause,
    ...path.steps.flatMap((step) => [step.label, step.description ?? '', step.taken ?? '']),
  ].join(' ');
}

/** The pattern sharing the most keywords with a path, when it shares enough. */
export function bestPatternForPath(path: ConfirmedPath, patterns: LogPattern[]): number {
  const keywords = keywordsOf(pathText(path));
  const scored = patterns.map((item, index) => ({
    index,
    overlap: [...keywordsOf(`${item.pattern} ${item.sample}`)].filter((word) => keywords.has(word))
      .length,
  }));
  const best = scored.sort((a, b) => b.overlap - a.overlap)[0];
  return best && best.overlap >= MIN_KEYWORD_OVERLAP ? best.index : -1;
}

/** The model's choice for a path: which pattern the confirmed check looked for, in words. */
interface ModelChoice {
  pattern_index: number;
  title: string;
  description: string;
}

const CHOICE_SCHEMA = {
  type: 'object',
  properties: {
    pattern_index: {
      type: 'number',
      description: 'Index of the log pattern the confirmed checks looked for, or -1 if none fits.',
    },
    title: { type: 'string', description: 'Short detector title, under 80 characters.' },
    description: {
      type: 'string',
      description: 'One or two sentences: what the detector watches and why it matters.',
    },
  },
  required: ['pattern_index', 'title', 'description'],
} as const;

const AUTHOR_SYSTEM = `You help a detection engine turn what investigations learned into a detector.
Investigations confirmed, several times, a path of checks from a symptom to a cause. You get that path
and the log message templates of the service it is about. Pick the one template whose lines are what the
checks looked for, the earliest sign of the cause. Answer -1 when no template fits; never guess.
Code builds and tests the detector from your choice, so only choose and name it.`;

/**
 * Asks the model which pattern a confirmed path's checks looked for. One bounded call with no
 * tools; code validates the index, builds the condition, and the replay decides if it is any good.
 */
export async function chooseWithModel({
  inferenceClient,
  connectorId,
  path,
  service,
  patterns,
  signal,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  path: ConfirmedPath;
  service: string;
  patterns: LogPattern[];
  signal: AbortSignal;
}): Promise<ModelChoice> {
  const shown = patterns.slice(0, PATTERNS_SHOWN_TO_MODEL);
  const input = JSON.stringify(
    {
      service,
      symptom: path.symptom,
      cause: path.cause,
      confirmations: path.confirmations,
      checks: path.steps.map((step) => ({
        type: step.type,
        label: step.label,
        details: step.description,
        outcome_taken: step.taken,
      })),
      templates: shown.map((item, index) => ({ index, lines: item.count, example: item.sample })),
    },
    null,
    2
  );
  const response = await inferenceClient.output({
    id: 'detection_engine_detector_author',
    connectorId,
    system: AUTHOR_SYSTEM,
    input,
    schema: CHOICE_SCHEMA,
    abortSignal: signal,
  });
  const output = response.output as Partial<ModelChoice>;
  const index = Number(output.pattern_index);
  return {
    pattern_index: Number.isInteger(index) && index >= 0 && index < shown.length ? index : -1,
    title: String(output.title ?? '').slice(0, 120),
    description: String(output.description ?? '').slice(0, 500),
  };
}

/** Same service and condition, same detector: its id never changes between passes. */
export function detectorId(sourceId: string, service: string, condition: string): string {
  return createHash('sha256')
    .update(`${sourceId}|${service}|${condition}`)
    .digest('hex')
    .slice(0, 16);
}

/** Builds a detector from a pattern, or explains why it cannot. */
export function detectorFromPattern({
  source,
  service,
  messageField,
  pattern,
  title,
  description,
}: {
  source: NightshiftSource;
  service: string;
  messageField: string;
  pattern: LogPattern;
  title: string;
  description: string;
}): LearnedDetector | { reason: string } {
  const condition = conditionFromPattern(messageField, pattern.pattern, pattern.new_words);
  if (!condition) {
    return { reason: `the pattern ${pattern.pattern} has no token a condition can match` };
  }
  return {
    detector_id: detectorId(source.id, service, condition),
    title,
    description,
    service,
    source_id: source.id,
    condition,
    importance: /error|fail|fatal|critical|refused|timed?\s?out|exception/i.test(pattern.sample)
      ? DEFAULT_IMPORTANCE + 10
      : DEFAULT_IMPORTANCE,
  };
}

/** Checks a condition parses and runs against the source before anything replays it. */
export async function validateCondition({
  esClient,
  source,
  condition,
  signal,
}: {
  esClient: ElasticsearchClient;
  source: NightshiftSource;
  condition: string;
  signal: AbortSignal;
}): Promise<string | undefined> {
  try {
    await queryRows({
      esClient,
      query: `FROM ${source.view_name}\n| WHERE ${condition}\n| LIMIT 0`,
      signal,
    });
    return undefined;
  } catch (error) {
    return getErrorMessage(error).slice(0, 300);
  }
}
