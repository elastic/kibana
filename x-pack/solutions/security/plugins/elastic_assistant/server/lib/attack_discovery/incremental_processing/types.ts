/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryResult } from '../batch_processing/types';

/**
 * Extended Attack Discovery with incremental processing metadata
 */
export interface IncrementalAttackDiscovery extends AttackDiscoveryResult {
  /** IDs of alerts that have been processed for this discovery */
  processedAlertIds: string[];
  /** Whether this discovery was created/updated incrementally */
  isIncremental: boolean;
  /** ID of the parent discovery if this is an incremental update */
  parentDiscoveryId?: string;
  /** Timestamp of last incremental update */
  lastUpdatedAt: string;
  /** Number of incremental updates */
  updateCount: number;
  /** Original generation timestamp */
  originalCreatedAt: string;
}

/**
 * Incremental processing request
 */
export interface IncrementalProcessingRequest {
  /** Existing Attack Discovery to enhance (optional) */
  existingDiscovery?: IncrementalAttackDiscovery;
  /** New alerts to process */
  newAlerts: Array<{ id: string; content: string }>;
  /** All alerts associated with the scope (e.g., case) */
  allAlertIds: string[];
  /** Mode of incremental processing */
  mode: 'enhance' | 'delta' | 'full';
}

/**
 * Incremental processing result
 */
export interface IncrementalProcessingResult {
  /** Updated or new discovery */
  discovery: IncrementalAttackDiscovery;
  /** IDs of alerts that were newly processed */
  newlyProcessedAlertIds: string[];
  /** Whether the discovery was enhanced or replaced */
  action: 'created' | 'enhanced' | 'replaced';
  /** Processing metrics */
  metrics: {
    newAlertsProcessed: number;
    totalAlertsInScope: number;
    processingDurationMs: number;
    mergeOperations: number;
  };
}

/**
 * Case-scoped Attack Discovery tracking
 */
export interface CaseAttackDiscoveryState {
  /** Case ID */
  caseId: string;
  /** Current Attack Discovery ID for this case */
  currentDiscoveryId?: string;
  /** All alert IDs that have been processed */
  processedAlertIds: string[];
  /** Last update timestamp */
  lastUpdatedAt: string;
  /** Total number of generations/updates */
  generationCount: number;
}

/**
 * Delta identification result
 */
export interface DeltaAlertResult {
  /** Alerts that have not been processed yet */
  newAlerts: string[];
  /** Alerts that have been processed */
  processedAlerts: string[];
  /** Total alerts in scope */
  totalAlerts: string[];
  /** Whether there are new alerts to process */
  hasNewAlerts: boolean;
}
