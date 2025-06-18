/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredRuleMigration } from '../../types';

const vendorCodeMap: Record<StoredRuleMigration['original_rule']['vendor'], string> = {
  splunk: 'SPL',
};

export const getTagsByVendor = (
  vendor: StoredRuleMigration['original_rule']['vendor']
): string[] => {
  if (!(vendor in vendorCodeMap)) {
    throw new Error(`Unsupported vendor for tagging rules: ${vendor}`);
  }
  return [`Migrated from ${vendorCodeMap[vendor]}`];
};
