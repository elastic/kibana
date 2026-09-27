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
