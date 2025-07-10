/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

export const getVendorTag = (originalRule: OriginalRule): string => {
  const { vendor } = originalRule;
  const capitalizedVendor = `${vendor.charAt(0).toUpperCase()}${vendor.slice(1)}`;
  return `Migrated from ${capitalizedVendor}`;
};
