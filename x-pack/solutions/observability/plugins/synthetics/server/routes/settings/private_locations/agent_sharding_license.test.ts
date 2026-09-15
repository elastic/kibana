/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertCanEnableAgentSharding } from './agent_sharding_license';

const license = (
  hasEnterprise: boolean,
  { isAvailable = true, isActive = true }: { isAvailable?: boolean; isActive?: boolean } = {}
) => ({
  isAvailable,
  isActive,
  hasAtLeast: (level: string) => level === 'enterprise' && hasEnterprise,
});

describe('assertCanEnableAgentSharding', () => {
  it('allows classic create (flag omitted or false) without Enterprise', () => {
    expect(assertCanEnableAgentSharding(license(false))).toBeUndefined();
    expect(assertCanEnableAgentSharding(license(false), false)).toBeUndefined();
  });

  it('allows turning sharding off without Enterprise', () => {
    expect(assertCanEnableAgentSharding(license(false), false, true)).toBeUndefined();
  });

  it('allows leaving an already-sharded location unchanged without Enterprise', () => {
    expect(assertCanEnableAgentSharding(license(false), true, true)).toBeUndefined();
    expect(assertCanEnableAgentSharding(license(false), undefined, true)).toBeUndefined();
  });

  it('rejects enabling sharding without Enterprise', () => {
    expect(assertCanEnableAgentSharding(undefined, true)).toEqual(expect.any(String));
    expect(assertCanEnableAgentSharding(license(false), true)).toEqual(expect.any(String));
    expect(assertCanEnableAgentSharding(license(false), true, false)).toEqual(expect.any(String));
  });

  it('allows enabling sharding with Enterprise', () => {
    expect(assertCanEnableAgentSharding(license(true), true)).toBeUndefined();
    expect(assertCanEnableAgentSharding(license(true), true, false)).toBeUndefined();
  });

  it('rejects enabling sharding with an expired or unavailable Enterprise license', () => {
    expect(assertCanEnableAgentSharding(license(true, { isActive: false }), true)).toEqual(
      expect.any(String)
    );
    expect(assertCanEnableAgentSharding(license(true, { isAvailable: false }), true)).toEqual(
      expect.any(String)
    );
  });
});
