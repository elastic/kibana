/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceData } from '../../../../../../../common/siem_migrations/model/common.gen';
import { MigrationSource } from '../../../../types';
import {
  lookupFileNameMismatchError,
  referenceSetNameMismatchError,
  watchlistNameMismatchError,
} from '../lookups_file_upload/translations';

/** Keeps resources whose names are in `missingLookups`, using case-sensitive comparison. */
export const assertMissingLookups = (
  resources: SiemMigrationResourceData[],
  missingLookups: readonly string[],
  migrationSource: MigrationSource,
  addError: (error: string) => void
): SiemMigrationResourceData[] => {
  const includeName = migrationSource !== MigrationSource.SPLUNK || resources.length > 1;
  return resources.flatMap((resource) => {
    const name = resource.name.trim();
    if (!missingLookups.includes(name)) {
      addError(mismatchError(migrationSource, includeName ? name : undefined));
      return [];
    }
    return [name === resource.name ? resource : { ...resource, name }];
  });
};

const mismatchError = (migrationSource: MigrationSource, name?: string): string => {
  if (migrationSource === MigrationSource.QRADAR && name != null) {
    return referenceSetNameMismatchError(name);
  }
  if (migrationSource === MigrationSource.SENTINEL && name != null) {
    return watchlistNameMismatchError(name);
  }
  return lookupFileNameMismatchError(name);
};
