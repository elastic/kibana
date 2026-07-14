/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrationSource } from '../types';
import { RULE_MIGRATION_VENDOR_COPY } from '../../rules/translations';

export const getCopyrightNoticeByVendor = (vendor: MigrationSource): string => {
  return RULE_MIGRATION_VENDOR_COPY[vendor].copyrightNotice;
};
