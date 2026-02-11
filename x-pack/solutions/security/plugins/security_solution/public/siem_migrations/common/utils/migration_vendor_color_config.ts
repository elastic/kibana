/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemMigrationVendor } from '../../../../common/siem_migrations/model/common.gen';

export const MIGRATION_VENDOR_COLOR_CONFIG: Record<SiemMigrationVendor, string> = {
  // lighter shades as instructed by design
  splunk: '#D9E8FF', // bgLightPrimary
  qradar: '#FDDDE9', // bgLightAccent
};
