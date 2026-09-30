/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@elastic/eui';
import {
  RUN_SOURCE_ONBOARDING_BUTTON_LABEL,
  RUN_SOURCE_ONBOARDING_CROSS_PROJECT_TOOLTIP,
} from './translations';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { filterSourcesByQuery, getOnboardSourceTooltip, parseSearchQuery } from './utils';

const makeSource = (overrides: Partial<NightshiftSource>): NightshiftSource => ({
  id: 'source-1',
  title: 'nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

describe('parseSearchQuery', () => {
  it('returns an empty query for empty input', () => {
    expect(parseSearchQuery('').ast.clauses).toEqual([]);
  });

  it('preserves the raw text for plain-text input', () => {
    expect(parseSearchQuery('logs').text).toBe('logs');
  });

  it('parses field clauses', () => {
    const query = parseSearchQuery('status:open');

    expect(query.ast.getFieldClauses('status')).toEqual([
      expect.objectContaining({ field: 'status', value: 'open' }),
    ]);
  });

  it('does not crash on input that is invalid EUI query syntax', () => {
    // The raw parser rejects a leading comma...
    expect(() => Query.parse(',')).toThrow();

    // ...while the wrapper keeps the raw text as a plain-text filter with no clauses.
    const query = parseSearchQuery(',');

    expect(query.text).toBe(',');
    expect(query.ast.clauses).toEqual([]);
  });
});

describe('filterSourcesByQuery', () => {
  const nginx = makeSource({ id: 'nginx', title: 'Nginx errors', tags: ['web'] });
  const payments = makeSource({
    id: 'payments',
    title: 'Payments',
    esql: 'FROM logs-payments-* | WHERE region == "eu"',
  });

  it('returns every source for an empty query', () => {
    expect(filterSourcesByQuery([nginx, payments], '')).toEqual([nginx, payments]);
  });

  it('matches the title, a tag or the query, ignoring case', () => {
    expect(filterSourcesByQuery([nginx, payments], 'NGINX')).toEqual([nginx]);
    expect(filterSourcesByQuery([nginx, payments], 'web')).toEqual([nginx]);
    expect(filterSourcesByQuery([nginx, payments], 'region')).toEqual([payments]);
  });
});

describe('getOnboardSourceTooltip', () => {
  it('prefers the activity-block tooltip regardless of CPS scope', () => {
    expect(
      getOnboardSourceTooltip({ activityBlockTooltip: 'Paused', isCpsMultiProject: true })
    ).toBe('Paused');
    expect(
      getOnboardSourceTooltip({ activityBlockTooltip: 'Paused', isCpsMultiProject: false })
    ).toBe('Paused');
  });

  it('discloses the cross-project scope once CPS has linked projects', () => {
    expect(
      getOnboardSourceTooltip({ activityBlockTooltip: undefined, isCpsMultiProject: true })
    ).toBe(RUN_SOURCE_ONBOARDING_CROSS_PROJECT_TOOLTIP);
  });

  it('falls back to the plain label outside a multi-project CPS deployment', () => {
    expect(
      getOnboardSourceTooltip({ activityBlockTooltip: undefined, isCpsMultiProject: false })
    ).toBe(RUN_SOURCE_ONBOARDING_BUTTON_LABEL);
  });
});
