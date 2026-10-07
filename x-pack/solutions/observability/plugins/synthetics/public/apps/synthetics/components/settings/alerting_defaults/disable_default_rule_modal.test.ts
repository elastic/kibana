/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDisableDefaultRuleKind } from './disable_default_rule_modal';

describe('getDisableDefaultRuleKind', () => {
  it('returns null when no default rule is being disabled', () => {
    expect(getDisableDefaultRuleKind(false, false)).toBeNull();
  });

  it('returns status when only the status rule is being disabled', () => {
    expect(getDisableDefaultRuleKind(true, false)).toBe('status');
  });

  it('returns tls when only the TLS rule is being disabled', () => {
    expect(getDisableDefaultRuleKind(false, true)).toBe('tls');
  });

  it('returns both when status and TLS rules are being disabled', () => {
    expect(getDisableDefaultRuleKind(true, true)).toBe('both');
  });
});
