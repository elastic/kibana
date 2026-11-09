/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStorageExplorerAvailability, StorageExplorerAvailability } from '.';

describe('getStorageExplorerAvailability', () => {
  it.each([
    {
      description: 'Universal Profiling is set up',
      status: { isAvailable: true, hasSetup: true, hasData: false },
      expected: StorageExplorerAvailability.Available,
    },
    {
      description: 'Universal Profiling is not set up but has data',
      status: { isAvailable: true, hasSetup: false, hasData: true },
      expected: StorageExplorerAvailability.Available,
    },
    {
      description: 'Universal Profiling is available but not set up and has no data',
      status: { isAvailable: true, hasSetup: false, hasData: false },
      expected: StorageExplorerAvailability.NotSetUp,
    },
    {
      description: 'Universal Profiling is not available',
      status: { isAvailable: false, hasSetup: false, hasData: false },
      expected: StorageExplorerAvailability.NotAvailable,
    },
  ])('returns $expected when $description', ({ status, expected }) => {
    expect(getStorageExplorerAvailability(status)).toBe(expected);
  });
});
