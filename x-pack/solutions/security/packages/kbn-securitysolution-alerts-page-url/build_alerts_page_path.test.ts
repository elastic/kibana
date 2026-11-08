/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { decode } from '@kbn/rison';
import {
  buildAlertsPagePath,
  buildAlertsPageTagPath,
  buildAlertsSelectionQuery,
  MAX_ALERTS_PAGE_PATH_LENGTH,
} from './build_alerts_page_path';

/** Alert ids the size of real ones: 64-character hashes. */
const alertIds = (count: number) =>
  Array.from({ length: count }, (_, i) => i.toString(16).padStart(64, '0'));

const decodeFilters = (path: string) =>
  decode(new URLSearchParams(path).get('filters') ?? '') as Array<{
    meta: { alias: string };
    query: { bool: { filter: unknown } };
  }>;

describe('buildAlertsSelectionQuery', () => {
  it('matches the alerts by id when there are no tags', () => {
    expect(buildAlertsSelectionQuery({ alertIds: ['a', 'b'] })).toEqual({
      ids: { values: ['a', 'b'] },
    });
  });

  it('matches the alerts carrying any of the tags when there are no ids', () => {
    expect(buildAlertsSelectionQuery({ tags: ['az:proposal:p1', 'other'] })).toEqual({
      terms: { 'kibana.alert.workflow_tags': ['az:proposal:p1', 'other'] },
    });
  });

  it('matches an alert listed by id or carrying a tag when there are both', () => {
    expect(buildAlertsSelectionQuery({ alertIds: ['a'], tags: ['az:proposal:p1'] })).toEqual({
      bool: {
        should: [
          { ids: { values: ['a'] } },
          { terms: { 'kibana.alert.workflow_tags': ['az:proposal:p1'] } },
        ],
        minimum_should_match: 1,
      },
    });
  });
});

describe('buildAlertsPagePath', () => {
  it('keeps ids with reserved characters inside their own parameter', () => {
    const path = buildAlertsPagePath(['a&b', 'c#d', 'e+f'], '2026-09-01T00:00:00.000Z');

    const params = new URLSearchParams(path);
    expect([...params.keys()]).toHaveLength(3);
    expect(path).not.toMatch(/#/);
    expect(JSON.stringify(decode(params.get('filters') ?? ''))).toContain('e+f');
  });

  it('puts each alert id in the URL once, so a long batch stays within a byte budget', () => {
    const ids = alertIds(200);

    const path = buildAlertsPagePath(ids, '2026-09-01T00:00:00.000Z');

    const BYTES_PER_ID = 70;
    const FIXED_OVERHEAD_BYTES = 1500;
    expect(path.length).toBeLessThan(ids.length * BYTES_PER_ID + FIXED_OVERHEAD_BYTES);
  });

  it('fits about a hundred real alert ids within the path length a link should carry', () => {
    const options = { dataViewId: 'security-solution-default' };

    expect(
      buildAlertsPagePath(alertIds(100), '2026-09-01T00:00:00.000Z', options).length
    ).toBeLessThanOrEqual(MAX_ALERTS_PAGE_PATH_LENGTH);
    expect(
      buildAlertsPagePath(alertIds(120), '2026-09-01T00:00:00.000Z', options).length
    ).toBeGreaterThan(MAX_ALERTS_PAGE_PATH_LENGTH);
  });

  it('round-trips the ids', () => {
    const path = buildAlertsPagePath(['a', 'b'], '2026-09-01T00:00:00.000Z');

    const [filter] = decode(new URLSearchParams(path).get('filters') ?? '') as Array<{
      query: { bool: { filter: { ids: { values: string[] } } } };
    }>;
    expect(filter.query.bool.filter.ids.values).toEqual(['a', 'b']);
  });

  it('keeps the ids-only filter as it was before tags existed', () => {
    const filters = decode(
      new URLSearchParams(buildAlertsPagePath(['a'], '2026-09-01T00:00:00.000Z')).get('filters') ??
        ''
    );

    expect(filters).toEqual([
      {
        meta: { alias: 'Alert Ids', negate: false, disabled: false, type: 'custom' },
        query: { bool: { filter: { ids: { values: ['a'] } } } },
        $state: { store: 'appState' },
      },
    ]);
  });

  it('filters by tag when the selection has only tags', () => {
    const [filter, ...rest] = decodeFilters(
      buildAlertsPagePath([], '2026-09-01T00:00:00.000Z', { tags: ['az:proposal:p1'] })
    );

    expect(rest).toHaveLength(0);
    expect(filter.meta.alias).toBe('Alert tags');
    expect(filter.query.bool.filter).toEqual({
      terms: { 'kibana.alert.workflow_tags': ['az:proposal:p1'] },
    });
  });

  it('applies ids and tags as one filter, so an alert matching either is shown', () => {
    const [filter, ...rest] = decodeFilters(
      buildAlertsPagePath(['a'], '2026-09-01T00:00:00.000Z', { tags: ['az:proposal:p1'] })
    );

    expect(rest).toHaveLength(0);
    expect(filter.meta.alias).toBe('Alert Ids or tags');
    expect(filter.query.bool.filter).toEqual(
      buildAlertsSelectionQuery({ alertIds: ['a'], tags: ['az:proposal:p1'] })
    );
  });

  it('keeps a tag-only link small, whatever the number of alerts carrying the tag', () => {
    const path = buildAlertsPagePath([], '2026-09-01T00:00:00.000Z', {
      tags: [`az:proposal:${uuidv4()}`],
    });

    expect(path.length).toBeLessThan(1500);
  });

  it('names the data view of the page in the filter when given one', () => {
    const [filter] = decode(
      new URLSearchParams(
        buildAlertsPagePath(['a'], '2026-09-01T00:00:00.000Z', {
          tags: ['az:proposal:p1'],
          dataViewId: 'security-solution-default',
        })
      ).get('filters') ?? ''
    ) as Array<{ meta: { index?: string } }>;

    expect(filter.meta.index).toBe('security-solution-default');
  });
});

describe('buildAlertsPageTagPath', () => {
  const createdAt = '2026-09-01T00:00:00.000Z';

  it('filters on the tag', () => {
    const path = buildAlertsPageTagPath('az:proposal:abc', createdAt);

    const [filter] = decode(new URLSearchParams(path).get('filters') ?? '') as Array<{
      query: { match_phrase: Record<string, string> };
    }>;
    expect(filter.query.match_phrase).toEqual({ 'kibana.alert.workflow_tags': 'az:proposal:abc' });
  });

  it('is the same size for any number of alerts and keeps the page params of the ids link', () => {
    const path = buildAlertsPageTagPath('az:proposal:abc', createdAt);

    expect(path.length).toBeLessThan(1500);
    expect([...new URLSearchParams(path).keys()]).toEqual([
      ...new URLSearchParams(buildAlertsPagePath(['a'], createdAt)).keys(),
    ]);
  });

  it('keeps the time range open for alerts that get the tag after the link is made', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date().toISOString();

    const path = buildAlertsPageTagPath('az:proposal:abc', now, 3 * DAY_MS);

    const { global } = decode(new URLSearchParams(path).get('timerange') ?? '') as {
      global: { timerange: { to: string } };
    };
    expect(Date.parse(global.timerange.to)).toBeGreaterThanOrEqual(Date.parse(now) + 3 * DAY_MS);
  });
});
