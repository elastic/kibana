/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  RULE_MIGRATION_VENDOR_COPY,
  type RuleMigrationVendor,
  type RuleMigrationVendorCopy,
} from '../translations';

export const useRuleMigrationVendorCopy = (
  vendor: RuleMigrationVendor
): RuleMigrationVendorCopy => {
  return useMemo(() => RULE_MIGRATION_VENDOR_COPY[vendor], [vendor]);
};
