/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMatchesRequired, isIndexPatternAllowed } from './matches_required';

describe('buildMatchesRequired', () => {
  const matchesRequired = buildMatchesRequired(['logs-aws.*', 'logs-fortinet.*']);

  it('returns true for a concrete index matching a required pattern', () => {
    expect(matchesRequired('logs-aws.cloudtrail-default')).toBe(true);
  });

  it('returns true after stripping the data-stream backing prefix', () => {
    expect(matchesRequired('.ds-logs-aws.cloudtrail-default-2026.09.01-000001')).toBe(true);
  });

  it('returns false for an optional alerts index', () => {
    expect(matchesRequired('.alerts-security.alerts-default')).toBe(false);
  });
});

describe('isIndexPatternAllowed', () => {
  const allowlist = ['logs-aws.*'];

  it('returns true for a more-specific pattern under the allowlist', () => {
    expect(isIndexPatternAllowed('logs-aws.cloudtrail-*', allowlist)).toBe(true);
  });

  it('returns true when the candidate equals an allowlist entry', () => {
    expect(isIndexPatternAllowed('logs-aws.*', allowlist)).toBe(true);
  });

  it('returns false for FROM *', () => {
    expect(isIndexPatternAllowed('*', allowlist)).toBe(false);
  });

  it('returns false for a broader pattern than the allowlist', () => {
    expect(isIndexPatternAllowed('logs-*', allowlist)).toBe(false);
  });

  it('returns false for an unrelated pattern', () => {
    expect(isIndexPatternAllowed('.kibana*', allowlist)).toBe(false);
  });

  it('returns false for a cross-cluster source', () => {
    expect(isIndexPatternAllowed('remote:logs-aws.*', allowlist)).toBe(false);
  });
});

describe('exclusion entries', () => {
  const broad = ['logs-*', '-logs-elastic_agent*', '-logs-fleet_server*'];

  it('keeps an excluded stream out of the required set even though the positive pattern covers it', () => {
    const matchesRequired = buildMatchesRequired(broad);
    expect(matchesRequired('.ds-logs-okta.system-default-2026.09.01-000001')).toBe(true);
    expect(matchesRequired('.ds-logs-elastic_agent.filebeat-default-2026.09.01-000001')).toBe(
      false
    );
    expect(matchesRequired('.ds-logs-fleet_server.output-default-2026.09.01-000001')).toBe(false);
  });

  it('refuses a Tier 2 source that the scope excludes, so the ES|QL gate matches the Tier 1 search', () => {
    expect(isIndexPatternAllowed('logs-okta.system-*', broad)).toBe(true);
    expect(isIndexPatternAllowed('logs-elastic_agent*', broad)).toBe(false);
    expect(isIndexPatternAllowed('logs-elastic_agent.filebeat-default*', broad)).toBe(false);
    expect(isIndexPatternAllowed('logs-fleet_server*', broad)).toBe(false);
  });

  it('refuses a wildcard whose expansion could reach an excluded stream, not just the exact name', () => {
    // Elasticsearch expands `logs-e*` to `logs-elastic_agent-default` too; probing one
    // instance (`logs-ex`) would have let it through.
    expect(isIndexPatternAllowed('logs-e*', broad)).toBe(false);
    expect(isIndexPatternAllowed('logs-elastic*', broad)).toBe(false);
    expect(isIndexPatternAllowed('logs-f*', broad)).toBe(false);
    // Disjoint prefixes stay allowed.
    expect(isIndexPatternAllowed('logs-okta*', broad)).toBe(true);
    expect(isIndexPatternAllowed('logs-o*', broad)).toBe(true);
  });

  it('treats the broad positive itself as a source that overlaps its exclusions, so it is refused', () => {
    expect(isIndexPatternAllowed('logs-*', broad)).toBe(false);
  });

  it('judges a concrete candidate exactly, so a name that merely shares a prefix with an exclusion is allowed', () => {
    expect(isIndexPatternAllowed('logs-elastic', broad)).toBe(true);
    expect(isIndexPatternAllowed('logs-elastic_agent.filebeat-default', broad)).toBe(false);
  });

  it('refuses an explicitly named backing index of an excluded stream, normalizing .ds- the same way the positive check does', () => {
    expect(
      isIndexPatternAllowed('.ds-logs-elastic_agent.filebeat-default-2026.09.01-000001', broad)
    ).toBe(false);
    expect(isIndexPatternAllowed('.ds-logs-elastic_agent*', broad)).toBe(false);
    // An allowed stream's backing index is still fine.
    expect(isIndexPatternAllowed('.ds-logs-okta.system-default-2026.09.01-000001', broad)).toBe(
      true
    );
  });

  it('never accepts an exclusion entry itself as a source', () => {
    expect(isIndexPatternAllowed('-logs-elastic_agent*', broad)).toBe(false);
  });
});
