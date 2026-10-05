/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { getSubscriptionAvailability } from './availability';

describe('AlertZero subscription availability', () => {
  it.each(['basic', 'gold', 'platinum', 'enterprise', 'trial'] as const)(
    'checks an active %s license',
    (type) => {
      const license = licensingMock.createLicense({ license: { type, status: 'active' } });
      expect(
        getSubscriptionAvailability({
          isServerless: false,
          serverlessTierAvailable: false,
          license,
        })
      ).toBe(type === 'enterprise' || type === 'trial' ? 'available' : 'license');
    }
  );

  it('rejects expired Enterprise licenses', () => {
    const license = licensingMock.createLicense({
      license: { type: 'enterprise', status: 'expired' },
    });
    expect(
      getSubscriptionAvailability({ isServerless: false, serverlessTierAvailable: true, license })
    ).toBe('license');
  });

  it('waits for license information in ECH', () => {
    expect(
      getSubscriptionAvailability({ isServerless: false, serverlessTierAvailable: true })
    ).toBe('loading');
  });

  it('does not treat a Serverless Enterprise license as a tier entitlement', () => {
    const license = licensingMock.createLicense({
      license: { type: 'enterprise', status: 'active' },
    });
    expect(
      getSubscriptionAvailability({ isServerless: true, serverlessTierAvailable: false, license })
    ).toBe('serverless_tier');
    expect(getSubscriptionAvailability({ isServerless: true, serverlessTierAvailable: true })).toBe(
      'available'
    );
  });
});
