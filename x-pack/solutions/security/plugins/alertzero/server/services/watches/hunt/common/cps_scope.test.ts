/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertEsqlSourcesAllowed } from '../tier2/assert_esql_sources_allowed';
import { scopeGuardPatterns, withLinkedProjectTwins } from './cps_scope';
import { buildMatchesRequired } from './matches_required';

describe('withLinkedProjectTwins', () => {
  it('keeps each unqualified entry and adds its `*:` twin, exclusions included', () => {
    expect(withLinkedProjectTwins(['logs-*', '-logs-elastic_agent*'])).toEqual([
      'logs-*',
      '*:logs-*',
      '-logs-elastic_agent*',
      '*:-logs-elastic_agent*',
    ]);
  });

  it('leaves entries that already name a cluster alone', () => {
    expect(withLinkedProjectTwins(['linked:logs-*', 'linked:-logs-x*', '-linked:*'])).toEqual([
      'linked:logs-*',
      'linked:-logs-x*',
      '-linked:*',
    ]);
  });

  it('does not repeat an entry', () => {
    expect(withLinkedProjectTwins(['logs-*', '*:logs-*'])).toEqual(['logs-*', '*:logs-*']);
  });
});

describe('scopeGuardPatterns', () => {
  it('returns the patterns untouched when cross-project search is off', () => {
    expect(scopeGuardPatterns(['logs-*'], false)).toEqual(['logs-*']);
  });

  it('widens them when cross-project search is on', () => {
    expect(scopeGuardPatterns(['logs-*'], true)).toEqual(['logs-*', '*:logs-*']);
  });
});

describe('guards over widened patterns', () => {
  const widened = withLinkedProjectTwins(['logs-aws.*', '-logs-aws.secret*']);

  it('admits a linked project index the unqualified entry now reaches', () => {
    const matches = buildMatchesRequired(widened);

    expect(matches('logs-aws.cloudtrail-default')).toBe(true);
    expect(matches('linked:logs-aws.cloudtrail-default')).toBe(true);
    expect(matches('linked:.ds-logs-aws.cloudtrail-default-2026.10.01-000001')).toBe(true);
  });

  it('keeps an unqualified exclusion in force on the linked project', () => {
    expect(buildMatchesRequired(widened)('linked:logs-aws.secret-default')).toBe(false);
  });

  it('refuses a linked project index when the entry is read the cross-cluster way', () => {
    expect(buildMatchesRequired(['logs-aws.*'])('linked:logs-aws.cloudtrail-default')).toBe(false);
  });

  it('lets a generated `FROM <alias>:…` through only under the widened scope', () => {
    const query = 'FROM linked:logs-aws.cloudtrail-* | LIMIT 1';

    expect(assertEsqlSourcesAllowed(query, ['logs-aws.*'])).toEqual({
      ok: false,
      reason: expect.stringContaining('outside the hunt index scope'),
    });
    expect(assertEsqlSourcesAllowed(query, widened)).toEqual({ ok: true });
  });
});
