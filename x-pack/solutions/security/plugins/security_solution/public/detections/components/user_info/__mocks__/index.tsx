/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const initialState = {
  loading: false,
  isSignalIndexExists: true,
  isAuthenticated: true,
  hasEncryptionKey: true,
  canUserCRUD: true,
  canUserREAD: true,
  hasIndexManage: true,
  hasIndexMaintenance: true,
  hasIndexWrite: true,
  hasIndexRead: true,
  hasIndexUpdateDelete: true,
  signalIndexName: true,
  signalIndexMappingOutdated: true,
};

export const useUserData = jest.fn().mockReturnValue([initialState]);

export const useUserInfo = jest.fn().mockReturnValue(initialState);
