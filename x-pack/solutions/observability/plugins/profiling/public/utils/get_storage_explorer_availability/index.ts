/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UniversalProfilingSchemaStatus } from '@kbn/profiling-utils';

export enum StorageExplorerAvailability {
  Available = 'available',
  NotSetUp = 'notSetUp',
  NotAvailable = 'notAvailable',
}

/** Storage explorer only covers Universal Profiling, so it needs Universal Profiling to be set up. */
export const getStorageExplorerAvailability = ({
  isAvailable,
  hasSetup,
}: Pick<
  UniversalProfilingSchemaStatus,
  'isAvailable' | 'hasSetup'
>): StorageExplorerAvailability => {
  if (!isAvailable) {
    return StorageExplorerAvailability.NotAvailable;
  }

  return hasSetup ? StorageExplorerAvailability.Available : StorageExplorerAvailability.NotSetUp;
};
