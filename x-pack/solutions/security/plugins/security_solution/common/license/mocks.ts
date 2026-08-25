/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseService } from './license';

export const createLicenseServiceMock = (): jest.Mocked<LicenseService> => {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    getLicenseInformation: jest.fn(),
    getLicenseInformation$: jest.fn(),
    isAtLeast: jest.fn(),
    isGoldPlus: jest.fn().mockReturnValue(true),
    isPlatinumPlus: jest.fn().mockReturnValue(true),
    isEnterprise: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<LicenseService>;
};
