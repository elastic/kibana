/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMissingCapabilitiesChecker, requiredSiemMigrationCapabilities } from './capabilities';
import { CapabilitiesChecker } from '../../../common/lib/capabilities';
import type { Capabilities } from '@kbn/core/public';

jest.mock('../../../common/lib/capabilities');

describe('getMissingCapabilitiesChecker', () => {
  let capabilities: Capabilities;
  let mockHas: jest.Mock;

  beforeEach(() => {
    capabilities = {} as Capabilities;
    mockHas = jest.fn().mockReturnValue(true);
    (CapabilitiesChecker as jest.Mock).mockImplementation(() => ({
      has: mockHas,
    }));
  });

  it('returns an empty array when all "all" level capabilities are present', () => {
    const check = getMissingCapabilitiesChecker();
    const missing = check(capabilities, 'all');
    expect(missing).toEqual([]);
  });

  it('returns an empty array when all "minimum" level capabilities are present', () => {
    const check = getMissingCapabilitiesChecker();
    const missing = check(capabilities, 'minimum');
    expect(missing).toEqual([]);
  });

  it('identifies missing capabilities for the "all" level', () => {
    const missingCapability = requiredSiemMigrationCapabilities.all[0];
    mockHas.mockImplementation((cap: string) => cap !== missingCapability.capability);

    const check = getMissingCapabilitiesChecker();
    const missing = check(capabilities, 'all');

    expect(missing).toEqual([missingCapability]);
  });

  it('identifies missing capabilities for the "minimum" level', () => {
    const missingCapability = requiredSiemMigrationCapabilities.minimum[0];
    mockHas.mockImplementation((cap: string) => cap !== missingCapability.capability);

    const check = getMissingCapabilitiesChecker();
    const missing = check(capabilities, 'minimum');

    expect(missing).toEqual([missingCapability]);
  });

  it('uses default "all" level if none is provided', () => {
    const check = getMissingCapabilitiesChecker();
    check(capabilities);
    requiredSiemMigrationCapabilities.all.forEach((cap) => {
      expect(mockHas).toHaveBeenCalledWith(cap.capability);
    });
  });
});
