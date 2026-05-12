/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QRadarProcessor } from './qradar/processor';
import { SentinelProcessor } from './sentinel/processor';

type SupportedRuleVendor = 'qradar' | 'microsoft-sentinel';

export function getVendorProcessor(vendor: 'qradar'): typeof QRadarProcessor;
export function getVendorProcessor(vendor: 'microsoft-sentinel'): typeof SentinelProcessor;
export function getVendorProcessor(
  vendor: SupportedRuleVendor
): typeof QRadarProcessor | typeof SentinelProcessor;
export function getVendorProcessor(vendor: SupportedRuleVendor) {
  switch (vendor) {
    case 'qradar':
      return QRadarProcessor;
    case 'microsoft-sentinel':
      return SentinelProcessor;
    default:
      throw new Error(`Unsupported vendor processor: ${vendor}`);
  }
}
