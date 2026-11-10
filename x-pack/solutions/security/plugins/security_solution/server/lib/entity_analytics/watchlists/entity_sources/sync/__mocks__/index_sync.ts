/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockPlainIndexSync = jest.fn().mockResolvedValue([]);
export const mockResolveFullSyncState = jest.fn().mockResolvedValue({ hasNewFullSync: false });
export const mockMarkFullSyncProcessed = jest.fn().mockResolvedValue(undefined);
export const mockCreateIndexSyncService = jest.fn().mockImplementation(() => ({
  plainIndexSync: mockPlainIndexSync,
  resolveFullSyncState: mockResolveFullSyncState,
  markFullSyncProcessed: mockMarkFullSyncProcessed,
}));

export const createIndexSyncService = mockCreateIndexSyncService;
