/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHuntEligibleIoc } from './hunt_eligible_ioc';

describe('isHuntEligibleIoc', () => {
  it.each([
    { tier: 'discriminating' },
    { tier: 'contextual' },
    { tier: 'uncertain' },
    { tier: undefined },
    { tier: null },
    { tier: '' },
  ])('returns true for eligible tier $tier when not deferred', ({ tier }) => {
    expect(isHuntEligibleIoc({ type: 'domain', value: 'example.com', tier })).toBe(true);
  });

  it.each([{ tier: 'reference' }, { tier: 'denied' }, { tier: 'high' }])(
    'returns false for ineligible tier $tier',
    ({ tier }) => {
      expect(isHuntEligibleIoc({ type: 'domain', value: 'example.com', tier })).toBe(false);
    }
  );

  it.each([undefined, 'uncertain', 'discriminating'])(
    'returns false for a placeholder email at tier %s',
    (tier) => {
      expect(isHuntEligibleIoc({ type: 'email', value: 'test@test.com', tier })).toBe(false);
    }
  );

  it('keeps a real-domain email at uncertain eligible', () => {
    expect(
      isHuntEligibleIoc({ type: 'email', value: 'actor@malicious.org', tier: 'uncertain' })
    ).toBe(true);
  });

  it('returns false when deferred_unreviewed is true even for a promotable tier', () => {
    expect(
      isHuntEligibleIoc({
        type: 'domain',
        value: 'example.com',
        tier: 'discriminating',
        deferred_unreviewed: true,
      })
    ).toBe(false);
  });

  it.each([
    ['loopback with no tier', { type: 'ip', value: '127.0.0.1' }],
    [
      'loopback with discriminating tier',
      { type: 'ip', value: '127.0.0.1', tier: 'discriminating' },
    ],
    ['RFC1918 with uncertain tier', { type: 'ip', value: '10.0.0.1', tier: 'uncertain' }],
    ['link-local', { type: 'ip', value: '169.254.169.254', tier: 'contextual' }],
    ['private CIDR', { type: 'cidr', value: '192.168.0.0/16', tier: 'discriminating' }],
    ['IPv6 loopback', { type: 'ip', value: '::1', tier: 'uncertain' }],
    ['IPv6 loopback written out in full', { type: 'ip', value: '0:0:0:0:0:0:0:1' }],
    ['bracketed IPv6 loopback', { type: 'ip', value: '[::1]', tier: 'discriminating' }],
    ['IPv6 unique-local CIDR', { type: 'cidr', value: 'fc00::/7', tier: 'contextual' }],
  ])('returns false for non-routable %s even when tier would otherwise qualify', (_label, ioc) => {
    expect(isHuntEligibleIoc(ioc)).toBe(false);
  });

  it('returns true for a public IP with a missing tier', () => {
    expect(isHuntEligibleIoc({ type: 'ip', value: '203.0.113.10' })).toBe(true);
  });

  it('returns true for a public IP with a promotable tier', () => {
    expect(isHuntEligibleIoc({ type: 'ip', value: '198.51.100.20', tier: 'discriminating' })).toBe(
      true
    );
  });
});
