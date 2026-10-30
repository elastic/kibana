/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertEsqlSourcesAllowed } from '../tier2/assert_esql_sources_allowed';
import {
  reachesLinkedProjects,
  scopeGuardPatterns,
  tier2AllowedIndices,
  withLinkedProjectTwins,
} from './cps_scope';
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

describe('reachesLinkedProjects', () => {
  it('is true for a widened list and false for a plain or cross-cluster one', () => {
    expect(reachesLinkedProjects(withLinkedProjectTwins(['logs-*']))).toBe(true);
    expect(reachesLinkedProjects(['logs-*'])).toBe(false);
    expect(reachesLinkedProjects(['logs-*', 'remote:logs-*'])).toBe(false);
    expect(reachesLinkedProjects(['*:logs-*'])).toBe(false);
  });
});

describe('tier2AllowedIndices', () => {
  const universe = ['logs-*', 'linked:-logs-aws.cloudtrail-*', '-*elastic-cloud-logs-*'];
  const targets = ['logs-aws.cloudtrail-*'];
  const allowed = tier2AllowedIndices({ targets, universe, crossProjectSearch: true });

  it('returns the targets as they are without cross-project search', () => {
    expect(tier2AllowedIndices({ targets, universe, crossProjectSearch: false })).toEqual(targets);
  });

  it('widens the targets and carries the project-qualified exclusions only', () => {
    expect(allowed).toEqual([
      'logs-aws.cloudtrail-*',
      '*:logs-aws.cloudtrail-*',
      'linked:-logs-aws.cloudtrail-*',
    ]);
  });

  it('keeps a project the universe excludes by name out of reach of the widened targets', () => {
    const matches = buildMatchesRequired(allowed);

    expect(matches('logs-aws.cloudtrail-default')).toBe(true);
    expect(matches('other:logs-aws.cloudtrail-default')).toBe(true);
    expect(matches('linked:logs-aws.cloudtrail-default')).toBe(false);
  });

  it('refuses an unqualified source too, since it fans out to the excluded project', () => {
    expect(assertEsqlSourcesAllowed('FROM logs-aws.cloudtrail-* | LIMIT 1', allowed).ok).toBe(
      false
    );
    expect(
      assertEsqlSourcesAllowed('FROM linked:logs-aws.cloudtrail-* | LIMIT 1', allowed).ok
    ).toBe(false);
    expect(assertEsqlSourcesAllowed('FROM other:logs-aws.cloudtrail-* | LIMIT 1', allowed).ok).toBe(
      true
    );
  });

  it('still allows an unqualified wildcard source the excluded project does not touch', () => {
    const widened = tier2AllowedIndices({
      targets: ['logs-aws.cloudtrail-*', 'logs-okta.system-*'],
      universe,
      crossProjectSearch: true,
    });

    expect(assertEsqlSourcesAllowed('FROM logs-okta.system-* | LIMIT 1', widened)).toEqual({
      ok: true,
    });
  });
});
