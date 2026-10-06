/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HOST_FLYOUT_ENTITY_ID } from '../page_objects/entity_flyout_anomalies_page';

/**
 * Mock response returned by the anomaly overview API when the entity has anomalies.
 */
export const MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES = {
  entityId: HOST_FLYOUT_ENTITY_ID,
  entityType: 'host',
  totalAnomaliesCount: 5,
  tacticCounts: { 'Credential Access': 3, 'Initial Access': 2 },
  anomalyByTimeBucket: [
    { timestamp: '2025-01-01T00:00:00.000Z', maxScore: 75.5, threatTactics: ['Credential Access'] },
  ],
  recentAnomalies: [
    {
      jobId: 'auth_high_count_logon_events_ea',
      jobName: 'Spike in Logon Events',
      recordId: 'record-1',
      timestamp: '2025-01-01T00:00:00.000Z',
      recordScore: 75.5,
      anomalousValue: 'high login count',
    },
  ],
  from: 1704067200000,
  to: 1735689600000,
};

/**
 * Mock response returned by the anomaly overview API when the entity has anomalies
 * but none are associated with any MITRE tactic.
 */
export const MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES_NO_TACTICS = {
  ...MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES,
  tacticCounts: {},
  anomalyByTimeBucket: [],
};

/**
 * Mock response returned by the anomaly overview API when the entity has no anomalies.
 */
export const MOCK_ANOMALY_OVERVIEW_EMPTY = {
  entityId: HOST_FLYOUT_ENTITY_ID,
  entityType: 'host',
  totalAnomaliesCount: 0,
  tacticCounts: {},
  anomalyByTimeBucket: [],
  recentAnomalies: [],
  from: 1704067200000,
  to: 1735689600000,
};

/**
 * Mock response returned by the anomaly summary API.
 */
export const MOCK_ANOMALY_SUMMARY = {
  entity_id: HOST_FLYOUT_ENTITY_ID,
  entity_type: 'host',
  anomalies: [
    {
      jobId: 'auth_high_count_logon_events_ea',
      jobName: 'Spike in Logon Events',
      recordId: 'record-1',
      timestamp: '2025-01-01T00:00:00.000Z',
      recordScore: 75.5,
      actual: [100],
      typical: [10],
      baselineValues: ['10'],
      anomalousValue: 'high login count',
      detectorFunction: 'count',
      threatTactics: ['Credential Access'],
      threatTechniques: ['Brute Force'],
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

/**
 * Second anomaly summary record, associated with the Initial Access tactic.
 * Paired with MOCK_ANOMALY_SUMMARY's Credential Access record to exercise
 * MITRE tactic filtering on the Anomalies tab.
 */
const SECOND_TACTIC_ANOMALY = {
  jobId: 'rare_process_by_host_linux_ea',
  jobName: 'Unusual Process For a Linux Host',
  recordId: 'record-2',
  timestamp: '2025-01-02T00:00:00.000Z',
  recordScore: 60,
  actual: [1],
  typical: [0],
  baselineValues: ['0'],
  anomalousValue: 'new process observed',
  detectorFunction: 'rare',
  threatTactics: ['Initial Access'],
  threatTechniques: ['Exploit Public-Facing Application'],
};

/**
 * Mock anomaly summary response with records for two distinct MITRE tactics
 * (Credential Access and Initial Access), used to verify tactic filtering.
 */
export const MOCK_ANOMALY_SUMMARY_MULTI_TACTIC = {
  ...MOCK_ANOMALY_SUMMARY,
  anomalies: [...MOCK_ANOMALY_SUMMARY.anomalies, SECOND_TACTIC_ANOMALY],
  total: 2,
};

/**
 * Mock anomaly overview response reflecting only the Credential Access tactic,
 * as returned once the Anomalies tab filters by that tactic.
 */
export const MOCK_ANOMALY_OVERVIEW_FILTERED_BY_CREDENTIAL_ACCESS = {
  ...MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES,
  totalAnomaliesCount: 3,
  tacticCounts: { 'Credential Access': 3 },
};

/**
 * Mock anomaly summary response containing only the Credential Access record,
 * as returned once the Anomalies tab filters by that tactic.
 */
export const MOCK_ANOMALY_SUMMARY_FILTERED_BY_CREDENTIAL_ACCESS = {
  ...MOCK_ANOMALY_SUMMARY,
  total: 1,
};
