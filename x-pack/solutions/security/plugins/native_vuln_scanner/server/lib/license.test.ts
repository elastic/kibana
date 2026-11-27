/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { LICENSE_REQUIRED_MESSAGE, isEnterprise } from './license';

const licenseOf = (type: string, status = 'active') =>
  licenseMock.createLicense({
    license: { type: type as never, mode: type as never, status: status as never },
  });

describe('isEnterprise', () => {
  it.each(['basic', 'standard', 'gold', 'platinum'])('refuses %s', (type) => {
    expect(isEnterprise(licenseOf(type))).toBe(false);
  });

  it.each(['enterprise', 'trial'])('passes %s', (type) => {
    expect(isEnterprise(licenseOf(type))).toBe(true);
  });

  it('refuses an expired enterprise licence', () => {
    expect(isEnterprise(licenseOf('enterprise', 'expired'))).toBe(false);
  });

  it('refuses when no licence information is available', () => {
    expect(isEnterprise(licenseMock.createLicense({ license: {}, features: {} }))).toBe(false);
  });

  it('uses the documented message', () => {
    expect(LICENSE_REQUIRED_MESSAGE).toBe(
      'Native vulnerability scanning requires an Enterprise licence'
    );
  });
});
