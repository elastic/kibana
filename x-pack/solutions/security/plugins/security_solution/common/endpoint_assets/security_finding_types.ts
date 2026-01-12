/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Security query action_id patterns matching osquery saved query IDs
 * These patterns are used to filter raw osquery results by action_id
 */
export const SECURITY_QUERY_IDS = {
  SUSPICIOUS_SERVICES: 'services_suspicious_windows_elastic',
  SUSPICIOUS_TASKS: 'scheduled_tasks_suspicious_windows_elastic',
  UNSIGNED_PROCESSES: 'unsigned_processes_vt_windows_elastic',
  CRONTAB: 'crontab_linux_elastic',
  PERSISTED_APPS: 'persisted_apps_elastic',
} as const;

/**
 * Types of security findings that can be displayed in detail view
 */
export type FindingType =
  | 'Suspicious Services'
  | 'Suspicious Tasks (LOTL)'
  | 'Unsigned Processes';

/**
 * Detailed security finding from raw osquery data
 * Includes common fields and type-specific fields for different finding types
 */
export interface SecurityFindingDetail {
  id: string;
  timestamp: string;
  actionId: string;
  agentId: string;
  hostId: string;

  // Common fields across all finding types
  name?: string;
  path?: string;
  sha256?: string;
  vtLink?: string;

  // Service-specific fields
  signatureStatus?: string;
  signatureSigner?: string;

  // Task-specific fields
  detectionMethod?: string;
  detectionReason?: string;
  commandLine?: string;

  // Process-specific fields
  result?: string;
}

/**
 * Result structure returned by useSecurityFindingsDetail hook
 */
export interface SecurityFindingsDetailResult {
  findings: SecurityFindingDetail[];
  total: number;
  loading: boolean;
  error: Error | null;
}
