/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExportProviderKeyClientInterface, ExportProviderKeyMetadata } from './types';

const createExportProviderKeyClientMock = (): jest.Mocked<ExportProviderKeyClientInterface> => ({
  isEncryptionAvailable: jest.fn().mockReturnValue(true),
  createAccountKey: jest.fn().mockResolvedValue('export-provider-key-1'),
  getKeyMetadata: jest.fn().mockResolvedValue(new Map<string, ExportProviderKeyMetadata>()),
  findAllKeys: jest.fn(async function* findAllKeys(): AsyncGenerator<ExportProviderKeyMetadata[]> {
    // no key objects by default
  }),
  deleteKeys: jest.fn(async (keys) => keys.map(({ id }) => id)),
  deleteKeysForPackagePolicies: jest.fn().mockResolvedValue(undefined),
  getAccountKey: jest.fn().mockResolvedValue(undefined),
});

export const exportProviderKeyMocks = Object.freeze({
  createClient: createExportProviderKeyClientMock,
});
