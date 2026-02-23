/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

/**
 * Fields used for correlating/deduplicating alerts.
 * These are the key fields that indicate two alerts are related to the same security event.
 */
export const CORRELATION_FIELDS = [
  'file.hash.sha256', // Identical file hash indicates same malware
  'process.hash.sha256', // Identical process hash indicates same executable
  'kibana.alert.rule.name', // Same detection rule
  'host.name', // Same host
  'user.name', // Same user involved
  'source.ip', // Same source IP (for network events)
  'destination.ip', // Same destination IP (for network events)
  'process.entity_id', // Same process entity
] as const;

export type CorrelationField = (typeof CORRELATION_FIELDS)[number];

/**
 * Configuration for deduplication behavior
 */
export interface DeduplicationConfig {
  /** Fields to use for grouping alerts (subset of CORRELATION_FIELDS) */
  correlationFields: CorrelationField[];
  /** Maximum number of unique alert groups to return */
  maxGroups: number;
  /** Maximum alerts per group to consider (for statistics) */
  maxAlertsPerGroup: number;
}

/**
 * Default deduplication configuration
 * Groups by file hash + rule name + host to identify duplicate detections of the same malware
 */
export const DEFAULT_DEDUPLICATION_CONFIG: DeduplicationConfig = {
  correlationFields: ['file.hash.sha256', 'kibana.alert.rule.name', 'host.name'],
  maxGroups: 500,
  maxAlertsPerGroup: 100,
};

/**
 * Represents a group of correlated/duplicate alerts
 */
export interface AlertGroup {
  /** The correlation key used to group these alerts */
  correlationKey: string;
  /** The representative alert for this group (highest risk score) */
  representativeAlert: SearchHit;
  /** Total count of alerts in this group */
  totalCount: number;
  /** All alert IDs in this group (for reference preservation) */
  alertIds: string[];
  /** Correlation field values that define this group */
  correlationValues: Record<string, string | undefined>;
}

/**
 * Result of the deduplication process
 */
export interface DeduplicationResult {
  /** Groups of correlated alerts */
  alertGroups: AlertGroup[];
  /** Total number of original alerts processed */
  totalOriginalAlerts: number;
  /** Number of unique alert groups after deduplication */
  uniqueGroupCount: number;
  /** Statistics about the deduplication */
  stats: {
    /** Number of duplicate alerts removed */
    duplicatesRemoved: number;
    /** Reduction percentage */
    reductionPercentage: number;
    /** Average duplicates per group */
    avgDuplicatesPerGroup: number;
  };
}
