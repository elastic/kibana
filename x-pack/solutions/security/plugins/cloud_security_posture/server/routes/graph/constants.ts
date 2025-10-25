/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_ALERTS_PARTIAL_IDENTIFIER = '.alerts-security.alerts-';
export const LOGS_INDEX_PATTERN = 'logs-*';

/**
 * Constructs the security alerts index pattern for a given space
 * @param spaceId - The Kibana space ID
 * @returns The full alerts index pattern
 */
export const getSecurityAlertsIndexPattern = (spaceId: string): string =>
  `${SECURITY_ALERTS_PARTIAL_IDENTIFIER}${spaceId}`;

/**
 * Default index patterns for graph queries
 * @param spaceId - The Kibana space ID
 * @returns Array of default index patterns [alerts, logs]
 */
export const getDefaultIndexPatterns = (spaceId: string): string[] => [
  getSecurityAlertsIndexPattern(spaceId),
  LOGS_INDEX_PATTERN,
];
