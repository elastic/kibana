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
 * Result of processing vendor enhancement data
 */
export interface VendorProcessorResult {
  /** Number of rules successfully updated */
  updated: number;
  /** Errors encountered during processing */
  errors: Array<{
    rule_name: string;
    message: string;
  }>;
}

/**
 * Base interface for vendor-specific processors
 */
export interface VendorProcessor<TData = unknown> {
  /**
   * Process vendor-specific enhancement data and update rules
   * @param data The vendor-specific data to process
   * @returns Result of the processing operation
   */
  process(data: TData): Promise<VendorProcessorResult>;
}
