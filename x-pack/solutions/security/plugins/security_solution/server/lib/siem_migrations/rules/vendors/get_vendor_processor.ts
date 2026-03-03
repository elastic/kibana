/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginalRuleVendor } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { QRadarProcessor } from './qradar/processor';

export function getVendorProcessor(vendor: OriginalRuleVendor) {
  switch (vendor) {
    case 'qradar':
      return QRadarProcessor;
    default:
      throw new Error(`Unsupported vendor processor: ${vendor}`);
  }
}
