/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RuleMigrationsDataRulesClient } from '../data/rule_migrations_data_rules_client';

/**
 * Context provided to vendor processors for rule enhancement
 */
export interface VendorProcessorContext {
  /** The migration ID being processed */
  migrationId: string;
  /** Data client for rule migrations operations */
  dataClient: RuleMigrationsDataRulesClient;
  /** Logger instance */
  logger: Logger;
}

/**
 * Base interface for vendor-specific processors
 */
export interface VendorProcessor<GetProcessorType extends Function = () => {}> {
  getProcessor: GetProcessorType;
}
