/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationSource } from '../../common/types';
import { QRADAR_RULE_MIGRATION_VENDOR_COPY } from './qradar';
import { SENTINEL_RULE_MIGRATION_VENDOR_COPY } from './sentinel';
import { SPLUNK_RULE_MIGRATION_VENDOR_COPY } from './splunk';
import type { RuleMigrationVendor, RuleMigrationVendorCopy } from './types';

export type { RuleMigrationVendor, RuleMigrationVendorCopy } from './types';

export const RULE_MIGRATION_VENDOR_COPY: Record<RuleMigrationVendor, RuleMigrationVendorCopy> = {
  [MigrationSource.SPLUNK]: SPLUNK_RULE_MIGRATION_VENDOR_COPY,
  [MigrationSource.QRADAR]: QRADAR_RULE_MIGRATION_VENDOR_COPY,
  [MigrationSource.SENTINEL]: SENTINEL_RULE_MIGRATION_VENDOR_COPY,
};
