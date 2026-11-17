/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SESSION_ATTRIBUTE_FIELDS } from '../../../common/session_attribute_fields';
import { FULL_HASH_RANGE, HASH_SPACE } from './hash_ranges';
import {
  SESSION_ATTRIBUTE_GROUPS,
  attributeColumn,
  bucketDigitsOf,
  changedSessionIdsQuery,
  changedSessionsCountQuery,
  sessionSummaryQuery,
} from './summary_queries';

const WINDOW = { changedFrom: '2026-11-10T10:00:00.000Z', changedTo: '2026-11-10T10:01:00.000Z' };
const REBUILD = { changedTo: WINDOW.changedTo, rebuildFrom: '2026-11-09T10:00:00.000Z' };

describe('changedSessionsCountQuery', () => {
  it('counts the browser sessions with an event in the window', () => {
    const { query, params } = changedSessionsCountQuery(WINDOW);

    expect(query).toMatch(/^SET unmapped_fields = "NULLIFY";/);
    expect(query).toContain('telemetry.sdk.language == "webjs"');
    expect(query).toContain('COUNT_DISTINCT(attributes.session.id)');
    expect(params).toEqual([
      { changed_from: WINDOW.changedFrom },
      { changed_to: WINDOW.changedTo },
    ]);
  });
});

describe('changedSessionIdsQuery', () => {
  it('lists the ids of the sessions with an event in the window, a row per hash bucket', () => {
    const { query, params } = changedSessionIdsQuery(WINDOW, FULL_HASH_RANGE);

    expect(query).toContain('@timestamp >= ?changed_from AND @timestamp < ?changed_to');
    expect(query).toContain('STATS BY session_id = attributes.session.id');
    expect(query).toContain('EVAL session_hash = HASH("sha256", session_id)');
    // 4,096 buckets of ids stay under the row limit however many sessions changed.
    expect(query).toContain(
      'STATS session_ids = VALUES(session_id) BY bucket = SUBSTRING(session_hash, 1, 3)'
    );
    expect(query).toContain('LIMIT 10000');
    expect(query).not.toContain('?hash_from');
    expect(params).toEqual([
      { changed_from: WINDOW.changedFrom },
      { changed_to: WINDOW.changedTo },
    ]);
  });

  it('buckets the ids so that every bucket fits a response the cluster caps lower', () => {
    expect(bucketDigitsOf(10_000)).toBe(3);
    expect(bucketDigitsOf(4_096)).toBe(3);
    expect(bucketDigitsOf(4_095)).toBe(2);
    expect(bucketDigitsOf(255)).toBe(1);
    expect(bucketDigitsOf(15)).toBe(0);

    const { query } = changedSessionIdsQuery(WINDOW, FULL_HASH_RANGE, 1_000);

    expect(query).toContain(
      'STATS session_ids = VALUES(session_id) BY bucket = SUBSTRING(session_hash, 1, 2)'
    );
    expect(query).toContain('LIMIT 1000');
  });

  it('puts every id in one row when even 16 buckets would not fit', () => {
    const { query } = changedSessionIdsQuery(WINDOW, FULL_HASH_RANGE, 10);

    expect(query).toContain('STATS session_ids = VALUES(session_id)\n');
    expect(query).not.toContain('SUBSTRING');
  });

  it('keeps the sessions of a hash range only', () => {
    const { query, params } = changedSessionIdsQuery(WINDOW, {
      from: HASH_SPACE / 4,
      to: HASH_SPACE / 2,
    });

    expect(query).toContain('WHERE session_hash >= ?hash_from AND session_hash < ?hash_to');
    expect(params).toEqual(
      expect.arrayContaining([{ hash_from: '40000000' }, { hash_to: '80000000' }])
    );
  });

  it('leaves out the bound of a range that starts or ends the hash space', () => {
    expect(changedSessionIdsQuery(WINDOW, { from: 0, to: HASH_SPACE / 2 }).params).toContainEqual({
      hash_to: '80000000',
    });
    expect(
      changedSessionIdsQuery(WINDOW, { from: HASH_SPACE / 2, to: HASH_SPACE }).query
    ).not.toContain('?hash_to');
  });
});

describe('sessionSummaryQuery', () => {
  it('rebuilds the listed sessions from their earlier events, with the ids as literals', () => {
    const { query, params } = sessionSummaryQuery(REBUILD, ['a', 'b"c']);

    expect(query).toContain('@timestamp >= ?rebuild_from AND @timestamp < ?changed_to');
    expect(query).toContain('attributes.session.id IN ("a", "b\\"c")');
    expect(query).not.toContain('IN (FROM');
    expect(params).toEqual([
      { rebuild_from: REBUILD.rebuildFrom },
      { changed_to: REBUILD.changedTo },
    ]);
  });

  it('aggregates per session and page URL, then per session', () => {
    const { query } = sessionSummaryQuery(REBUILD, ['a']);

    expect(query).toContain(
      'BY service = resource.attributes.service.name, session = attributes.session.id, page_url'
    );
    expect(query).toContain('page_url = CASE(is_page_view, attributes.url.full, null)');
    expect(query).toContain(
      'pages = TOP(first_view, 30, "asc", page_url) WHERE page_url IS NOT NULL'
    );
    expect(query).toContain('exit = LAST(page_url, last_view) WHERE page_url IS NOT NULL');
    expect(query).not.toContain('CONCAT(');
    expect(query).toMatch(/BY service, session\n\| EVAL [^|]+\n\| DROP raw_\*\n\| LIMIT 10000$/);
  });

  it('reads every attribute field from its group’s latest event, in both stages', () => {
    const { query } = sessionSummaryQuery(REBUILD, ['a']);

    Object.entries(SESSION_ATTRIBUTE_GROUPS).forEach(([group, attributes]) => {
      attributes
        .flatMap((attribute) => SESSION_ATTRIBUTE_FIELDS[attribute])
        .forEach((field) => {
          const raw = `raw_${field.replace(/\./g, '_')}`;
          expect(query).toContain(`${raw} = LAST(TO_STRING(${field}), seen_${group})`);
          expect(query).toContain(`${raw} = LAST(${raw}, seen_${group})`);
        });
      expect(query.split(`seen_${group} = MAX(seen_${group})`)).toHaveLength(3);
    });
  });

  it('cleans the attributes once per session, after the last stage', () => {
    const { query } = sessionSummaryQuery(REBUILD, ['a']);
    const lastStage = query.lastIndexOf('BY service, session');

    expect(query.slice(0, lastStage)).not.toContain('TRIM(');
    expect(query.slice(lastStage)).toContain(
      `${attributeColumn(
        'browser'
      )} = COALESCE(CASE(TRIM(TO_STRING(raw_resource_attributes_browser_name))`
    );
  });

  it('rates the web vitals against the thresholds as floats store them, and adds up their counts', () => {
    const { query } = sessionSummaryQuery(REBUILD, ['a']);

    expect(query).toContain(
      'cls_good = COUNT(*) WHERE vital == "cls" AND vital_value <= 0.10000000149011612'
    );
    expect(query).toContain(
      'lcp_up_to_needs_improvement = COUNT(*) WHERE vital == "lcp" AND vital_value <= 4000'
    );
    expect(query).toContain('lcp_p75 = MAX(lcp_p75)');
    expect(query).toContain('lcp_samples = SUM(lcp_samples)');
  });
});
