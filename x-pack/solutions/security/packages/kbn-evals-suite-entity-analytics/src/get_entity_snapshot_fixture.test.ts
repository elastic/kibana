/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';
import { getHistorySnapshotIndexPattern } from '@kbn/entity-store/server';
import { getHistorySnapshotIndexName } from './history_snapshot_index';
import { getMarchSnapshotTimestamps } from './snapshot_dates';

/**
 * The `get entity` dataset asks "What did user jsmith123's profile look like on March 15th?" and
 * its first criterion is disjunctive: retrieve that day's profile snapshot, or clearly state that
 * no snapshot data is available for the date.
 *
 * The retrieval branch is only reachable when the stack holds a document for that calendar day in
 * the entity-store history snapshot indices — `security.get_entity`'s date branch resolves the
 * history snapshot index patterns and ranges over them on `@timestamp` for the day its `date`
 * parameter names. `bulkIndexEntities` writes the *current* profile only (`@timestamp` = now),
 * which is what a weekly eval build showed: five model families called `security.get_entity` with
 * a March 15th date, got the current profile back, were scored 0, and one family presented it as
 * the March-15 snapshot (finding F6).
 *
 * The spec is a Playwright spec, so it cannot be imported into jest. These checks read the spec and
 * the tool and assert they still agree:
 *
 *   - the tool still reads a dated profile out of the history snapshot indices,
 *   - the spec seeds a dated snapshot for the entity its dated example names,
 *   - the seeded snapshot lands in an index the tool's pattern matches, and
 *   - the seeded instants land on the calendar day that example asks about, in a year a model
 *     will resolve the year-less "March 15th" to.
 */
const SPEC_PATH = path.resolve(__dirname, '../evals/v2/entity_store_v2_get_entity.spec.ts');
const TOOL_PATH = path.resolve(
  __dirname,
  '../../../plugins/security_solution/server/agent_builder/tools/entity_analytics/get_entity_tool.ts'
);

const specSource = fs.readFileSync(SPEC_PATH, 'utf8');
const toolSource = fs.readFileSync(TOOL_PATH, 'utf8');

const NAMESPACE = 'default';
const DATED_QUESTION = "What did user jsmith123's profile look like on March 15th?";
const SEEDED_SNAPSHOT_CALL = 'bulkIndexEntityHistorySnapshots({';
const NOW = new Date('2026-10-10T20:30:00.000Z');

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** The `MM-DD` calendar day the dated question names, derived from the question itself. */
const questionDay = (() => {
  const match = new RegExp(`(${MONTHS.join('|')})\\s+(\\d{1,2})`).exec(DATED_QUESTION);
  if (match == null) {
    throw new Error(`the dated question no longer names a calendar day: ${DATED_QUESTION}`);
  }
  return `${String(MONTHS.indexOf(match[1]) + 1).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
})();

/** The `@timestamp` range the tool ranges over for a `date` parameter (see dateToUtcDayRange). */
const dayRangeFor = (isoInstant: string) => {
  const day = isoInstant.slice(0, 10);
  return { start: `${day}T00:00:00.000Z`, end: `${day}T23:59:59.999Z` };
};

const seededTimestamps = getMarchSnapshotTimestamps(NOW);

describe('entity-analytics get-entity spec vs the dated profile snapshot it asks for', () => {
  it('keeps the dated question the fixture has to answer (guards the scan itself)', () => {
    expect(specSource).toContain(DATED_QUESTION);
  });

  it('keeps the tool branch that reads a dated profile out of the history snapshot indices', () => {
    expect(toolSource).toContain('dateToUtcDayRange');
    expect(toolSource).toContain('resolveHistorySnapshotIndexPatterns(');
    expect(toolSource).toContain('entity.id == "${escapedRowEntityId}"');
    expect(toolSource).toContain('@timestamp >= "${start}" AND @timestamp <= "${end}"');
  });

  it('seeds a history snapshot for the entity the dated question names', () => {
    const declaration = /const SNAPSHOT_USER_EUID = '([^']+)';/.exec(specSource);
    expect(declaration).not.toBeNull();

    // The question names the entity by its bare identifier ("jsmith123"), not by EUID.
    const [, snapshotEuid = ''] = declaration ?? [];
    const entityIdentifier = snapshotEuid.split(':').pop();
    expect(entityIdentifier).toBeTruthy();
    expect(DATED_QUESTION).toContain(entityIdentifier ?? '');

    const beforeAllBlock = specSource.slice(
      specSource.indexOf('evaluate.beforeAll'),
      specSource.indexOf('evaluate.afterAll')
    );
    expect(beforeAllBlock).toContain(SEEDED_SNAPSHOT_CALL);
    expect(beforeAllBlock).toContain('euid: SNAPSHOT_USER_EUID');
    expect(beforeAllBlock).toContain('getMarchSnapshotTimestamps()');
  });

  it('seeds every snapshot into an index the reader pattern matches', () => {
    const pattern = getHistorySnapshotIndexPattern(NAMESPACE);
    const matchesPattern = new RegExp(`^${pattern.split('*').join('.*')}$`);

    expect(pattern).toContain('*');
    for (const timestamp of seededTimestamps) {
      const index = getHistorySnapshotIndexName(NAMESPACE, new Date(timestamp));
      expect(index).toMatch(matchesPattern);
      // Elasticsearch index names cannot contain a wildcard character.
      expect(index).not.toContain('*');
    }
  });

  it('dates every seeded snapshot on the calendar day the question names', () => {
    expect(questionDay).toBe('03-15');

    for (const timestamp of seededTimestamps) {
      expect(timestamp.slice(5, 10)).toBe(questionDay);
    }
  });

  it('covers the years a year-less "March 15th" can resolve to', () => {
    const years = seededTimestamps.map((timestamp) => timestamp.slice(0, 4));

    expect(years).toEqual([String(NOW.getUTCFullYear()), String(NOW.getUTCFullYear() - 1)]);
  });

  it('places every seeded snapshot inside the day range the tool queries', () => {
    for (const timestamp of seededTimestamps) {
      const { start, end } = dayRangeFor(timestamp);
      expect(timestamp >= start).toBe(true);
      expect(timestamp <= end).toBe(true);
    }
  });
});
