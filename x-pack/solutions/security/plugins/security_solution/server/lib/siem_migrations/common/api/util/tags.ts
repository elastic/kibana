/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationVendor } from '../../../../../../common/siem_migrations/types';

export const getVendorTag = (vendor: SiemMigrationVendor): string => {
  const capitalizedVendor = `${vendor.charAt(0).toUpperCase()}${vendor.slice(1)}`;
  return `Migrated from ${capitalizedVendor}`;
};
