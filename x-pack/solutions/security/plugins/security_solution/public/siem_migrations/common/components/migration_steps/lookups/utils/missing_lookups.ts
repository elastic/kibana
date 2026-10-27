/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationResourceData } from '../../../../../../../common/siem_migrations/model/common.gen';
import { lookupFileNameMismatchError } from '../lookups_file_upload/translations';

/** Keeps resources whose names are in `missingLookups`, using case-sensitive comparison. */
export const assertMissingLookups = (
  resources: SiemMigrationResourceData[],
  missingLookups: readonly string[],
  addError: (error: string) => void
): SiemMigrationResourceData[] => {
  const includeFileName = resources.length > 1;
  return resources.flatMap((resource) => {
    const name = resource.name.trim();
    if (!missingLookups.includes(name)) {
      addError(lookupFileNameMismatchError(includeFileName ? resource.name : undefined));
      return [];
    }
    return [name === resource.name ? resource : { ...resource, name }];
  });
};
