/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import {
  buildRelatedAlertDoc,
  type RelatedAlertCase,
  type RelatedAlertFixture,
} from '@kbn/evals-suite-alert-analysis-workflow';

export interface RelatedAlertEvalDoc {
  id: string;
  doc: Record<string, unknown>;
}

const MINUTE_MS = 60_000;

// `get-related-alerts` filters on `@timestamp >= now-<window>h`, and the shared fixtures carry a
// fixed 2024 timestamp, so every time field is re-based onto the run's clock.
const TIME_FIELDS = [
  '@timestamp',
  'kibana.alert.original_time',
  'kibana.alert.intended_timestamp',
  'kibana.alert.last_detected',
  'kibana.alert.start',
  'event.created',
  'event.ingested',
] as const;

const TARGET_MINUTES_AGO = 2;
const FIRST_RELATED_MINUTES_AGO = 10;
const RELATED_SPACING_MINUTES = 5;

const withTimestamp = (
  doc: Record<string, unknown>,
  timestamp: string
): Record<string, unknown> => ({
  ...doc,
  ...Object.fromEntries(TIME_FIELDS.map((field) => [field, timestamp])),
});

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceWord = (value: unknown, from: string, to: string): unknown => {
  if (typeof value === 'string') {
    return value.replace(new RegExp(`(?<![\\w.-])${escapeRegExp(from)}(?![\\w-])`, 'g'), to);
  }
  return Array.isArray(value) ? value.map((item) => replaceWord(item, from, to)) : value;
};

/**
 * `get-related-alerts` correlates on `host.name` / `user.name` (and `source.ip` / `destination.ip`,
 * which no shared fixture sets), and those are fixed per fixture. Suffixing them with a per-run
 * token keeps a run from matching alerts a failed cleanup left behind by an earlier run.
 * The same rewrite is applied to every string that embeds the original name (home directories in
 * command lines and working directories), so the evidence still describes one consistent user.
 */
const withRunIdentity = (fixture: RelatedAlertFixture, runId: string): RelatedAlertFixture => {
  const token = createHash('sha256').update(runId).digest('hex').slice(0, 6);
  const { observable } = fixture;
  const hostName = observable['host.name'];
  const userName = observable['user.name'];
  const renames: Array<[string, string]> = [];
  if (typeof hostName === 'string') {
    renames.push([hostName, `${hostName}-${token}`]);
  }
  if (typeof userName === 'string') {
    renames.push([userName, `${userName}${token}`]);
  }
  const renamed = Object.fromEntries(
    Object.entries(observable).map(([key, value]) => [
      key,
      renames.reduce((current, [from, to]) => replaceWord(current, from, to), value),
    ])
  );
  const hostname = observable['host.hostname'];
  if (typeof hostname === 'string' && hostname === hostName) {
    renamed['host.hostname'] = renamed['host.name'];
  }
  return { ...fixture, observable: renamed };
};

/** Target first, then its related alerts, all inside the tool's default 24h window. */
export const buildCaseDocs = (
  testCase: RelatedAlertCase,
  runId: string,
  now: Date = new Date()
): RelatedAlertEvalDoc[] =>
  [testCase.target, ...testCase.related].map((original, index) => {
    const fixture = withRunIdentity(original, runId);
    const id =
      index === 0 ? `${testCase.id}-target-${runId}` : `${testCase.id}-rel-${index}-${runId}`;
    const minutesAgo =
      index === 0
        ? TARGET_MINUTES_AGO
        : FIRST_RELATED_MINUTES_AGO + (index - 1) * RELATED_SPACING_MINUTES;
    const timestamp = new Date(now.getTime() - minutesAgo * MINUTE_MS).toISOString();
    return { id, doc: withTimestamp(buildRelatedAlertDoc(fixture, id, index, runId), timestamp) };
  });
