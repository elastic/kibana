/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMatchesRequired } from './matches_required';

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
