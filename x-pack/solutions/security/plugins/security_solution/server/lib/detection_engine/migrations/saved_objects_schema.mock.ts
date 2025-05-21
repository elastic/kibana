/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { signalsMigrationType } from './saved_objects';
import type { SignalsMigrationSO } from './saved_objects_schema';

export const getSignalsMigrationSavedObjectMock = (
  overrides: Partial<SignalsMigrationSO['attributes']> = {}
): SignalsMigrationSO => ({
  id: '4a7ff78d-3055-4bb2-ba73-587b9c6c15a4',
  type: signalsMigrationType,
  attributes: {
    destinationIndex: 'destinationIndex',
    sourceIndex: 'sourceIndex',
    error: null,
    status: 'pending',
    taskId: 'taskid',
    version: 14,
    createdBy: 'username',
    created: '2020-03-27T22:55:59.517Z',
    updatedBy: 'username',
    updated: '2020-03-27T22:55:59.517Z',
    ...overrides,
  },
});

export const getSignalsMigrationSavedObjectErrorMock = (
  overrides: Partial<SignalsMigrationSO['error']> = {}
): SignalsMigrationSO =>
  ({
    id: 'dne-migration',
    error: {
      statusCode: 404,
      error: 'Not Found',
      message: 'Saved object [security-solution-signals-migration/dne-migration] not found',
      ...overrides,
    },
  } as SignalsMigrationSO);
