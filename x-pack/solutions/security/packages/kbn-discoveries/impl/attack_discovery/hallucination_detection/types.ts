/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generic interface for attack discoveries that abstracts over alert ID field naming.
 * Supports both camelCase (elastic_assistant) and snake_case (discoveries).
 */
export interface DiscoveryWithAlertIds {
  alertIds?: string[]; // camelCase (elastic_assistant)
  alert_ids?: string[]; // snake_case (discoveries)
  title: string;
}

/**
 * Helper to get alert IDs from a discovery regardless of field naming convention.
 */
export const getAlertIds = (discovery: DiscoveryWithAlertIds): string[] => {
  return discovery.alertIds ?? discovery.alert_ids ?? [];
};
