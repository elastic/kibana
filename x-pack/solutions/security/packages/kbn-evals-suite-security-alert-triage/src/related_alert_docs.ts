/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import {
  RELATED_ALERT_CASES,
  buildRelatedAlertDoc,
  type RelatedAlertCase,
  type RelatedAlertFixture,
} from '@kbn/evals-suite-alert-analysis-workflow';

// get-related-alerts correlates by host.name / user.name / IP only, so cases whose target carries
// just host.id / user.id would always score premise_unmet here.
export const TRIAGE_RELATED_ALERT_CASES: RelatedAlertCase[] = RELATED_ALERT_CASES.filter(
  ({ correlatedBy }) => correlatedBy !== 'id'
);

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
 * `get-related-alerts` matches on any of host.name / user.name, which are fixed per fixture, so a
 * leftover doc from a failed cleanup would correlate with a later run. Both get a per-run suffix
 * (an asset-tag style hex on the host, a numeric collision suffix on the user, so neither reads as
 * an anomaly) and strings embedding the old names, such as home directories, are rewritten to match.
 */
const withRunIdentity = (fixture: RelatedAlertFixture, runId: string): RelatedAlertFixture => {
  const digest = createHash('sha256').update(runId).digest('hex');
  const hostToken = digest.slice(0, 6);
  const userToken = String(parseInt(digest.slice(6, 14), 16) % 1_000_000).padStart(6, '0');
  const { observable } = fixture;
  const hostName = observable['host.name'];
  const userName = observable['user.name'];
  // Host first: the renamed host can start with the user's name, which the word-bounded user
  // rewrite then leaves alone because a `-` follows it.
  const renames: Array<[string, string]> = [];
  if (typeof hostName === 'string') {
    renames.push([hostName, `${hostName}-${hostToken}`]);
  }
  if (typeof userName === 'string') {
    renames.push([userName, `${userName}${userToken}`]);
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
